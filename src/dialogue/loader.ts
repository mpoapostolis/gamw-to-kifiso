/**
 * THE CLEANERS — dialogue loader.
 *
 * Takes a raw JSON-parsed `unknown` (typically the result of an import or
 * a fetch) and walks it into a typed, validated `DialogueGraph`. Errors
 * here are *intentionally loud*: a malformed dialogue is a writer bug,
 * not a player problem, and we'd rather crash on game-boot than fail
 * silently in a way that produces a black textbox three days in.
 *
 * Validation rules, in order of friendliness:
 *   • root must be a plain object keyed by node id
 *   • every node value must have a string `id`
 *   • every node's `id` must match its key (catch copy-paste bugs)
 *   • every `next` reference must point to a node that exists
 *   • every `effects.awareness` must match `/^[+\-=]\d+$/`
 *   • unknown keys are *warned* in dev, not rejected — so we can add new
 *     fields later without breaking old saved files
 *
 * This file intentionally doesn't import the runner — it returns plain
 * data the runner can consume. Keeps the two halves independent.
 */

import type {
  DialogueChoice,
  DialogueConditions,
  DialogueEffects,
  DialogueGraph,
  DialogueNode,
} from "./types";

/** "+1" / "-2" / "=5" — the only legal awareness mutation format. */
const AWARENESS_PATTERN = /^[+\-=]\d+$/;

/** Keys we recognise on each shape. Anything else is warned, not rejected. */
const KNOWN_NODE_KEYS = new Set(["id", "speaker", "lines", "choices", "onEnter", "onExit"]);
const KNOWN_CHOICE_KEYS = new Set(["text", "conditions", "next", "effects"]);
const KNOWN_CONDITION_KEYS = new Set([
  "awarenessMin",
  "awarenessMax",
  "dayMin",
  "dayMax",
  "flagSet",
  "flagNotSet",
]);
const KNOWN_EFFECT_KEYS = new Set(["awareness", "flag", "unflag", "journal"]);

/**
 * Validate + cast an arbitrary parsed-JSON value into a `DialogueGraph`.
 * Throws an Error with a path-prefixed message on the first violation.
 */
export function loadDialogueJson(json: unknown): DialogueGraph {
  if (!isPlainObject(json)) {
    throw new Error("loadDialogueJson: root must be an object keyed by node id");
  }
  const graph: DialogueGraph = {};
  const ids = Object.keys(json);

  // First pass: per-node validation that doesn't depend on cross-refs.
  for (const key of ids) {
    const raw = (json as Record<string, unknown>)[key];
    if (!isPlainObject(raw)) {
      throw new Error(`loadDialogueJson: node "${key}" is not an object`);
    }
    const node = validateNode(raw, key);
    if (node.id !== key) {
      throw new Error(
        `loadDialogueJson: node key "${key}" disagrees with its id "${node.id}" (copy-paste bug?)`,
      );
    }
    graph[node.id] = node;
  }

  // Second pass: every `next` must resolve. (We need every node parsed
  // before we can do this; that's why it's split into two passes.)
  for (const node of Object.values(graph)) {
    if (!node.choices) continue;
    for (let i = 0; i < node.choices.length; i++) {
      const choice = node.choices[i];
      if (choice.next !== undefined && graph[choice.next] === undefined) {
        throw new Error(
          `loadDialogueJson: node "${node.id}" choice[${i}] points at unknown node "${choice.next}"`,
        );
      }
    }
  }

  return graph;
}

/* ------------------------------------------------------------------ *
 * Per-shape validators. Each builds a freshly-typed object so the     *
 * runtime never holds references to the raw JSON keys we didn't ask   *
 * for — keeps memory clean and prevents accidental field leakage.     *
 * ------------------------------------------------------------------ */

function validateNode(raw: Record<string, unknown>, path: string): DialogueNode {
  warnUnknown(raw, KNOWN_NODE_KEYS, `node "${path}"`);

  const id = expectString(raw.id, `node "${path}".id`);
  const speaker = expectString(raw.speaker, `node "${path}".speaker`);
  const lines = expectStringArray(raw.lines, `node "${path}".lines`);

  const choices =
    raw.choices === undefined
      ? undefined
      : validateChoiceArray(raw.choices, `node "${path}".choices`);

  const onEnter =
    raw.onEnter === undefined
      ? undefined
      : validateEffects(raw.onEnter, `node "${path}".onEnter`);
  const onExit =
    raw.onExit === undefined
      ? undefined
      : validateEffects(raw.onExit, `node "${path}".onExit`);

  const node: DialogueNode = { id, speaker, lines };
  if (choices !== undefined) node.choices = choices;
  if (onEnter !== undefined) node.onEnter = onEnter;
  if (onExit !== undefined) node.onExit = onExit;
  return node;
}

function validateChoiceArray(raw: unknown, path: string): DialogueChoice[] {
  if (!Array.isArray(raw)) {
    throw new Error(`loadDialogueJson: ${path} must be an array`);
  }
  const out: DialogueChoice[] = [];
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (!isPlainObject(c)) {
      throw new Error(`loadDialogueJson: ${path}[${i}] must be an object`);
    }
    out.push(validateChoice(c, `${path}[${i}]`));
  }
  return out;
}

function validateChoice(raw: Record<string, unknown>, path: string): DialogueChoice {
  warnUnknown(raw, KNOWN_CHOICE_KEYS, path);

  const text = expectString(raw.text, `${path}.text`);
  const next = raw.next === undefined ? undefined : expectString(raw.next, `${path}.next`);
  const conditions =
    raw.conditions === undefined
      ? undefined
      : validateConditions(raw.conditions, `${path}.conditions`);
  const effects =
    raw.effects === undefined
      ? undefined
      : validateEffects(raw.effects, `${path}.effects`);

  const choice: DialogueChoice = { text };
  if (next !== undefined) choice.next = next;
  if (conditions !== undefined) choice.conditions = conditions;
  if (effects !== undefined) choice.effects = effects;
  return choice;
}

function validateConditions(raw: unknown, path: string): DialogueConditions {
  if (!isPlainObject(raw)) {
    throw new Error(`loadDialogueJson: ${path} must be an object`);
  }
  warnUnknown(raw, KNOWN_CONDITION_KEYS, path);

  const out: DialogueConditions = {};
  if (raw.awarenessMin !== undefined) out.awarenessMin = expectNumber(raw.awarenessMin, `${path}.awarenessMin`);
  if (raw.awarenessMax !== undefined) out.awarenessMax = expectNumber(raw.awarenessMax, `${path}.awarenessMax`);
  if (raw.dayMin !== undefined) out.dayMin = expectNumber(raw.dayMin, `${path}.dayMin`);
  if (raw.dayMax !== undefined) out.dayMax = expectNumber(raw.dayMax, `${path}.dayMax`);
  if (raw.flagSet !== undefined) out.flagSet = expectStringOrStringArray(raw.flagSet, `${path}.flagSet`);
  if (raw.flagNotSet !== undefined) out.flagNotSet = expectStringOrStringArray(raw.flagNotSet, `${path}.flagNotSet`);
  return out;
}

function validateEffects(raw: unknown, path: string): DialogueEffects {
  if (!isPlainObject(raw)) {
    throw new Error(`loadDialogueJson: ${path} must be an object`);
  }
  warnUnknown(raw, KNOWN_EFFECT_KEYS, path);

  const out: DialogueEffects = {};
  if (raw.awareness !== undefined) {
    const a = expectString(raw.awareness, `${path}.awareness`);
    if (!AWARENESS_PATTERN.test(a)) {
      throw new Error(
        `loadDialogueJson: ${path}.awareness "${a}" is malformed (expected +N | -N | =N)`,
      );
    }
    out.awareness = a;
  }
  if (raw.flag !== undefined) out.flag = expectStringOrStringArray(raw.flag, `${path}.flag`);
  if (raw.unflag !== undefined) out.unflag = expectStringOrStringArray(raw.unflag, `${path}.unflag`);
  if (raw.journal !== undefined) out.journal = expectString(raw.journal, `${path}.journal`);
  return out;
}

/* ------------------------------------------------------------------ *
 * Tiny typed-assertion helpers. Each throws with a path-aware message *
 * so a failing build tells the writer exactly which line is wrong.   *
 * ------------------------------------------------------------------ */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function expectString(v: unknown, path: string): string {
  if (typeof v !== "string") {
    throw new Error(`loadDialogueJson: ${path} must be a string (got ${describe(v)})`);
  }
  return v;
}

function expectNumber(v: unknown, path: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`loadDialogueJson: ${path} must be a finite number (got ${describe(v)})`);
  }
  return v;
}

function expectStringArray(v: unknown, path: string): string[] {
  if (!Array.isArray(v)) {
    throw new Error(`loadDialogueJson: ${path} must be an array of strings`);
  }
  const out: string[] = [];
  for (let i = 0; i < v.length; i++) {
    const item = v[i];
    if (typeof item !== "string") {
      throw new Error(`loadDialogueJson: ${path}[${i}] must be a string (got ${describe(item)})`);
    }
    out.push(item);
  }
  return out;
}

function expectStringOrStringArray(v: unknown, path: string): string | string[] {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return expectStringArray(v, path);
  throw new Error(`loadDialogueJson: ${path} must be a string or string array`);
}

/** A short, human-readable description of an unknown value for error text. */
function describe(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/**
 * Warn — don't throw — on keys we don't recognise. The intent is that
 * future schema additions (e.g. `voice`, `mood`) don't break old files
 * that pre-date them. Console-only; no UI surface.
 */
function warnUnknown(raw: Record<string, unknown>, known: Set<string>, path: string): void {
  for (const k of Object.keys(raw)) {
    if (!known.has(k)) {
      // eslint-disable-next-line no-console
      console.warn(`loadDialogueJson: unknown key "${k}" on ${path} — ignored`);
    }
  }
}
