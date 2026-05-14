/**
 * THE CLEANERS — dialogue type contracts.
 *
 * A dialogue is a *graph*, not a tree: nodes can point at any other node by
 * id, and the same node can be entered from many places. Each node holds a
 * speaker, a few lines of monologue, and zero-or-more player choices. A
 * choice can be hidden behind narrative conditions (awareness, day, flags)
 * and can fire effects (raise awareness, set a flag, drop a journal entry).
 *
 * The shape on this page is exactly the shape stored in the JSON files in
 * `src/data/dialogue/*.json`. The loader validates a parsed JSON blob into
 * a `DialogueGraph`; the runner walks it.
 *
 * Design intent for THE CLEANERS specifically: dialogue is the main way the
 * player drifts toward (or pulls away from) the truth. The fact that some
 * choices only exist above an awareness threshold is the entire game on a
 * granular level — most days you simply can't ask the question, because
 * you don't know yet that there's a question to ask.
 */

/**
 * Narrative-side gating on a choice. Every field is optional and combined
 * with AND semantics: a choice is visible only when *all* present fields
 * are satisfied. `awarenessMin`/`dayMin` are inclusive; their `Max`
 * siblings are inclusive as well.
 *
 *   • `flagSet`     — flag MUST be true (single key, or every key in array)
 *   • `flagNotSet`  — flag MUST NOT be true (i.e. false or missing)
 */
export interface DialogueConditions {
  /** awareness ≥ this value */
  awarenessMin?: number;
  /** awareness ≤ this value */
  awarenessMax?: number;
  /** dayIndex ≥ this value */
  dayMin?: number;
  /** dayIndex ≤ this value */
  dayMax?: number;
  /** require this flag (or every flag in the list) to be TRUE */
  flagSet?: string | string[];
  /** require this flag (or every flag in the list) to NOT be true */
  flagNotSet?: string | string[];
}

/**
 * Side-effects that mutate GameState. Used by `onEnter`, `onExit`, and per-
 * choice `effects`. Encoded as plain-JSON-friendly strings so a designer
 * can hand-author a dialogue file without writing code.
 *
 *   • `awareness` matches `/^[+\-=]\d+$/` — "+1" raises by 1, "-2" lowers
 *     by 2, "=5" sets to exactly 5 (clamped 0…100 by GameState).
 *   • `flag`  sets each named flag to TRUE.
 *   • `unflag` sets each named flag to FALSE.
 *   • `journal` writes a single first-person entry into the notebook.
 */
export interface DialogueEffects {
  /** awareness delta or assignment, e.g. "+1", "-2", "=5" */
  awareness?: string;
  /** flag name (or list) — sets each to true */
  flag?: string | string[];
  /** flag name (or list) — sets each to false */
  unflag?: string | string[];
  /** body text for a single journal entry */
  journal?: string;
}

/**
 * One branch a player can pick at the end of a node's lines.
 *
 * If `next` is omitted the choice ends the conversation outright — useful
 * for "leave" or "I have to go" options. If `next` points to an unknown
 * id, the loader throws.
 */
export interface DialogueChoice {
  /** the literal button label the UI scene will render */
  text: string;
  /** narrative gating; choices that fail this filter are hidden, not greyed */
  conditions?: DialogueConditions;
  /** target node id, or omit to end the conversation */
  next?: string;
  /** state mutations to apply when this choice is taken */
  effects?: DialogueEffects;
}

/**
 * A single beat in a conversation: who's speaking, the lines they utter,
 * and what the player can answer with afterwards.
 */
export interface DialogueNode {
  /** unique id within a graph; targets of `next` reference this */
  id: string;
  /** display name above the line text — "Barista", "Alex", "Mom" */
  speaker: string;
  /** one screen worth of text per element; player Spacebars through them */
  lines: string[];
  /** zero or more player replies; absent or empty ⇒ conversation ends */
  choices?: DialogueChoice[];
  /** effects fired the moment this node becomes current */
  onEnter?: DialogueEffects;
  /** effects fired right before this node is left (choice or end) */
  onExit?: DialogueEffects;
}

/** A whole conversation file, indexed by node id. */
export type DialogueGraph = Record<string, DialogueNode>;
