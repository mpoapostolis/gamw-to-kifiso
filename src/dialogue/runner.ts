/**
 * THE CLEANERS — DialogueRunner.
 *
 * A *pure-runtime* state machine for walking a `DialogueGraph`. No DOM, no
 * Phaser, no audio — the future dialogue UI scene (a textbox at the bottom
 * of the screen, choices floating above it) plugs into this runner the
 * same way a debugger plugs into a process: it asks "what's the current
 * line?", "what choices?", and "the player picked index 2 — what now?".
 *
 * The runner is the single source of truth for *narrative position*. It
 * reads from and writes to the GameState singleton — every `onEnter` /
 * `onExit` / per-choice `effects` is applied here, and every condition is
 * evaluated against `GameState.state`. UI code never touches GameState as
 * a side effect of dialogue; it goes through this runner.
 *
 * Lifecycle, as seen from the UI side:
 *
 *   const r = new DialogueRunner(graph);
 *   r.start("barista_day2_intro");
 *   while (!r.isDone()) {
 *     // render r.currentSpeaker() + r.currentLine()
 *     if (r.awaitingChoice()) {
 *       // render r.currentChoices() and wait for input
 *       r.selectChoice(playerPickedIndex);
 *     } else {
 *       // wait for player to press Space
 *       r.advance();
 *     }
 *   }
 *
 * Boundary rules (the part that gets re-read at 2am):
 *   • `advance()` moves to the next *line* inside the same node. When the
 *     pointer falls off the last line, the node enters its "awaiting
 *     choice" state if it has any visible choices, otherwise the node is
 *     `onExit`-finalised and the conversation ends.
 *   • `selectChoice(i)` applies the chosen choice's `effects`, then runs
 *     the *current* node's `onExit`, then jumps to `next` (running its
 *     `onEnter`), or ends the conversation if `next` is absent.
 *   • `start()` accepts any node id present in the graph. Unknown ids
 *     throw, because a silent no-op there would just produce an invisible
 *     bug downstream.
 */

import { GameState } from "../state/gameState";
import type {
  DialogueChoice,
  DialogueConditions,
  DialogueEffects,
  DialogueGraph,
  DialogueNode,
} from "./types";

/** Matches "+1", "-2", "=5" — same regex the loader validates with. */
const AWARENESS_PATTERN = /^[+\-=]\d+$/;

export class DialogueRunner {
  /** The conversation we're walking. Immutable for the life of the runner. */
  private readonly graph: DialogueGraph;
  /** Currently active node id, or null when the conversation hasn't begun
   *  or has just ended. */
  private nodeId: string | null = null;
  /** Pointer into `currentNode().lines`. Equal to `lines.length` once we've
   *  shown everything and are awaiting a choice. */
  private lineIdx = 0;
  /** Sticky end-of-conversation flag. Once true, `isDone()` stays true even
   *  if a future `start()` is called on a different runner; this instance
   *  treats end as permanent for diagnostic clarity. */
  private done = false;

  constructor(graph: DialogueGraph) {
    this.graph = graph;
  }

  /* ------------------------------------------------------------------ *
   * PUBLIC API — the surface the UI scene calls.                       *
   * ------------------------------------------------------------------ */

  /**
   * Enter the conversation at `nodeId`. Applies that node's `onEnter`
   * effects immediately, then parks the cursor at line 0.
   *
   * Throws if the node id isn't in the graph — a silent no-op here just
   * produces a black textbox in production, which is much worse.
   */
  start(nodeId: string): void {
    const node = this.graph[nodeId];
    if (!node) {
      throw new Error(`DialogueRunner.start: unknown node id "${nodeId}"`);
    }
    this.nodeId = nodeId;
    this.lineIdx = 0;
    this.done = false;
    this.applyEffects(node.onEnter);
  }

  /** The full current node, or null when not in a conversation. */
  currentNode(): DialogueNode | null {
    if (!this.nodeId) return null;
    return this.graph[this.nodeId] ?? null;
  }

  /** Speaker name for the current line; empty string when done / idle. */
  currentSpeaker(): string {
    const node = this.currentNode();
    if (!node || this.done) return "";
    return node.speaker;
  }

  /**
   * Body text for the current line; empty string when the cursor has
   * stepped past the last line (i.e. we're awaiting a choice) or the
   * conversation is over.
   */
  currentLine(): string {
    const node = this.currentNode();
    if (!node || this.done) return "";
    if (this.lineIdx < 0 || this.lineIdx >= node.lines.length) return "";
    return node.lines[this.lineIdx];
  }

  /** Raw line pointer. Useful for typewriter effects in the UI layer. */
  lineIndex(): number {
    return this.lineIdx;
  }

  /**
   * Move forward. Inside a node this just bumps the line index by one.
   * Once we step past the last line, the node either:
   *   • exposes its choices (a call to `awaitingChoice()` returns true), or
   *   • runs `onExit` and ends the conversation, if there are no
   *     visible choices.
   *
   * Safe to call when done — it's a no-op then.
   */
  advance(): void {
    if (this.done) return;
    const node = this.currentNode();
    if (!node) return;

    // Step the cursor; if we're still inside the lines, that's all.
    if (this.lineIdx < node.lines.length) {
      this.lineIdx += 1;
    }

    // If we've fallen off the end and there are no visible choices,
    // finalise the node and end the conversation. The "awaiting choice"
    // state is implicit (`awaitingChoice()` returns true) when there are
    // visible choices left — UI just stops advancing and renders them.
    if (this.lineIdx >= node.lines.length) {
      const visible = this.currentChoices();
      if (visible.length === 0) {
        this.endConversation();
      }
    }
  }

  /**
   * True when we've shown every line of the current node and at least one
   * choice survives the condition filter. UI uses this as the trigger to
   * swap from "press Space to continue" mode into "click a reply" mode.
   */
  awaitingChoice(): boolean {
    if (this.done) return false;
    const node = this.currentNode();
    if (!node) return false;
    if (this.lineIdx < node.lines.length) return false;
    return this.currentChoices().length > 0;
  }

  /**
   * The currently *visible* choices, filtered by `conditions`. The order
   * mirrors the JSON file order — a designer can rely on it. UI scenes
   * should index into this list when calling `selectChoice`.
   */
  currentChoices(): DialogueChoice[] {
    const node = this.currentNode();
    if (!node || this.done) return [];
    const all = node.choices ?? [];
    const out: DialogueChoice[] = [];
    for (const c of all) {
      if (this.evalConditions(c.conditions)) out.push(c);
    }
    return out;
  }

  /**
   * Pick a choice by index into `currentChoices()`. Applies the choice's
   * `effects`, then the current node's `onExit`, then either jumps to
   * `next` (firing its `onEnter`) or ends the conversation.
   *
   * Throws on a clearly-broken index — defending against silent UI bugs.
   */
  selectChoice(index: number): void {
    if (this.done) return;
    const node = this.currentNode();
    if (!node) return;
    const visible = this.currentChoices();
    if (index < 0 || index >= visible.length) {
      throw new Error(
        `DialogueRunner.selectChoice: index ${index} out of range (0..${
          visible.length - 1
        }) on node "${node.id}"`,
      );
    }
    const choice = visible[index];

    // Order matters: the choice's own effects run first (so e.g. flag set
    // by a choice can be observed by an onExit that reads it), then the
    // current node's onExit, then the next node's onEnter.
    this.applyEffects(choice.effects);
    this.applyEffects(node.onExit);

    if (!choice.next) {
      // No destination ⇒ the choice ends the conversation. We've already
      // run onExit above; just close out and return.
      this.nodeId = null;
      this.lineIdx = 0;
      this.done = true;
      return;
    }

    const nextNode = this.graph[choice.next];
    if (!nextNode) {
      // The loader is supposed to catch this. If we somehow got here, it
      // means a runtime mutation of the graph slipped through — be loud.
      throw new Error(
        `DialogueRunner.selectChoice: choice on node "${node.id}" points at unknown node "${choice.next}"`,
      );
    }
    this.nodeId = nextNode.id;
    this.lineIdx = 0;
    this.applyEffects(nextNode.onEnter);
  }

  /** True once the conversation has ended (any path: choice with no
   *  `next`, an empty-choice fall-off, or a manual end). */
  isDone(): boolean {
    return this.done;
  }

  /* ------------------------------------------------------------------ *
   * INTERNALS — effect application + condition evaluation.             *
   * ------------------------------------------------------------------ */

  /** Cleanly close the conversation, firing `onExit` of the current node. */
  private endConversation(): void {
    const node = this.currentNode();
    if (node) this.applyEffects(node.onExit);
    this.nodeId = null;
    this.lineIdx = 0;
    this.done = true;
  }

  /**
   * Mutate GameState per the supplied effect bundle. Tolerant of an
   * `undefined` argument so callers can pass `node.onEnter` directly.
   *
   * Effect order within a single bundle is fixed for predictability:
   *   1. `awareness` (so subsequent flag/journal reflect the new value)
   *   2. `flag` set
   *   3. `unflag` clear
   *   4. `journal` write
   */
  private applyEffects(effects: DialogueEffects | undefined): void {
    if (!effects) return;

    if (effects.awareness !== undefined) {
      this.applyAwareness(effects.awareness);
    }
    if (effects.flag !== undefined) {
      for (const key of toList(effects.flag)) GameState.setFlag(key, true);
    }
    if (effects.unflag !== undefined) {
      for (const key of toList(effects.unflag)) GameState.setFlag(key, false);
    }
    if (effects.journal !== undefined) {
      GameState.addJournalEntry(effects.journal);
    }
  }

  /**
   * Parse "+1" / "-2" / "=5" and apply via GameState. Bad strings are a
   * loud throw — the loader already validates this format, so a failure
   * here means a runtime mutation, not user data.
   */
  private applyAwareness(spec: string): void {
    if (!AWARENESS_PATTERN.test(spec)) {
      throw new Error(
        `DialogueRunner.applyAwareness: malformed awareness "${spec}" (expected +N | -N | =N)`,
      );
    }
    const op = spec[0];
    const value = Number(spec.slice(1));
    if (op === "=") {
      // GameState clamps internally, but it only exposes a *delta* setter
      // (`raiseAwareness`). The cleanest way to assign is to compute the
      // delta from the current value and feed that in.
      const delta = value - GameState.state.awareness;
      GameState.raiseAwareness(delta);
      return;
    }
    if (op === "+") {
      GameState.raiseAwareness(value);
      return;
    }
    // op === "-"
    GameState.raiseAwareness(-value);
  }

  /**
   * Evaluate a `DialogueConditions` bundle against current GameState.
   * Missing/undefined ⇒ true (a choice with no conditions is always
   * visible). All present fields are AND-combined.
   */
  private evalConditions(c?: DialogueConditions): boolean {
    if (!c) return true;
    const s = GameState.state;

    if (c.awarenessMin !== undefined && s.awareness < c.awarenessMin) return false;
    if (c.awarenessMax !== undefined && s.awareness > c.awarenessMax) return false;
    if (c.dayMin !== undefined && s.dayIndex < c.dayMin) return false;
    if (c.dayMax !== undefined && s.dayIndex > c.dayMax) return false;

    if (c.flagSet !== undefined) {
      for (const key of toList(c.flagSet)) {
        if (!GameState.flag(key)) return false;
      }
    }
    if (c.flagNotSet !== undefined) {
      for (const key of toList(c.flagNotSet)) {
        if (GameState.flag(key)) return false;
      }
    }
    return true;
  }
}

/** Normalise a `string | string[]` into an array. Tiny, but used everywhere. */
function toList(v: string | string[]): string[] {
  return Array.isArray(v) ? v : [v];
}
