/**
 * "YESTERDAY ECHOES" — quest definitions.
 *
 * Ten quests, three acts, mapped to days 1-5. Each one is a soft objective
 * that surfaces in the HUD; nothing here forces the player. The completion
 * checks read `ctx.notes`, `ctx.inventory`, `ctx.flags`, `ctx.day` — every
 * trigger lives in the dialog effects themselves, so quests are just a thin
 * lens over the existing state.
 *
 * Two big organising ideas:
 *   - `requires` gates a quest until earlier ones are done. Quests inside an
 *     act follow a soft order, but Act 1 doesn't force you to finish
 *     `q_wake_up` before talking to anyone — you'll just see the wake-up
 *     hint first.
 *   - `activeQuest(ctx)` is the single function the HUD calls. It returns
 *     the *current* objective — the first incomplete quest whose requires
 *     are met. Always one objective on screen, never a checklist.
 */
import type { GameCtx } from "./types";

export interface QuestReward {
  memories?: number;
  note?: string;
  item?: string;
  unlocks?: string;
}

export interface QuestDef {
  id: string;
  act: 1 | 2 | 3;
  title: string;
  hint: string;
  description: string;
  isComplete(c: GameCtx): boolean;
  reward?: QuestReward;
  /** Quest only becomes active when this returns true. Reads other quests' done state. */
  requires?: (c: GameCtx, doneIds: Set<string>) => boolean;
}

/* ------------------------------------------------------------------ *
 * ACT 1 — Awakening (Day 1-2)                                        *
 * ------------------------------------------------------------------ */

const q_wake_up: QuestDef = {
  id: "q_wake_up",
  act: 1,
  title: "Wake up",
  hint: "Get out of bed. Start your morning.",
  description:
    "You woke up. Your mother is humming in the kitchen. Helena is somewhere too. " +
    "The day will start whether you stand up or not. Open your eyes. Listen for a name.",
  isComplete: (c) => c.day >= 1 && Object.keys(c.notes).length >= 1,
  reward: { memories: 2 },
};

const q_meet_villagers: QuestDef = {
  id: "q_meet_villagers",
  act: 1,
  title: "Meet the villagers",
  hint: "Find Helena, Costas, and Mrs. Despoina.",
  description:
    "Three people will help you understand. Helena in the garden — she loves you. " +
    "Costas across the road, painting the same door for three weeks. Mrs. Despoina, " +
    "the old woman who has not aged in sixty years. Say hello to each of them.",
  isComplete: (c) =>
    c.flags.metHelena === true &&
    c.flags.metCostas === true &&
    c.flags.metDespoina === true,
  reward: { memories: 5 },
  requires: (_c, done) => done.has("q_wake_up"),
};

const q_survive_night_1: QuestDef = {
  id: "q_survive_night_1",
  act: 1,
  title: "Survive the first night",
  hint: "Make it through to morning.",
  description:
    "Something happens at eleven fifty-five. You don't know what yet. The clock " +
    "in the square stops; nobody else notices. Try to be in bed when it does. " +
    "Wake up tomorrow.",
  isComplete: (c) => c.day >= 2,
  reward: { memories: 3 },
  requires: (_c, done) => done.has("q_meet_villagers"),
};

/* ------------------------------------------------------------------ *
 * ACT 2 — Investigation (Day 3-4)                                    *
 * ------------------------------------------------------------------ */

const q_read_bench: QuestDef = {
  id: "q_read_bench",
  act: 2,
  title: "The bench in the park",
  hint: "There's something carved into the bench. Read it.",
  description:
    "The little park has a bench under a tree. Eli says it has your name on it. " +
    "You don't remember sitting there long enough to carve anything. Go and read it.",
  isComplete: (c) => c.notes.parkBench === true,
  reward: { memories: 5 },
  requires: (_c, done) => done.has("q_survive_night_1"),
};

const q_clinic_appointment: QuestDef = {
  id: "q_clinic_appointment",
  act: 2,
  title: "The check-up you don't remember",
  hint: "Dr. Erin has you down for an appointment. Go.",
  description:
    "There's a check-up on Dr. Erin's clipboard. Page twelve. Your name. Your " +
    "handwriting beside hers. You don't remember scheduling it. Go and find out " +
    "what she sees in your file.",
  isComplete: (c) =>
    c.notes.doctorRecognised === true || c.notes.clinicList === true,
  reward: { memories: 4 },
  requires: (_c, done) => done.has("q_read_bench"),
};

const q_shopkeeper_errand: QuestDef = {
  id: "q_shopkeeper_errand",
  act: 2,
  title: "An errand for the shopkeeper",
  hint: "The shopkeeper wants three small things. Bring them.",
  description:
    "The shopkeeper at the café needs three things and has a back room he never " +
    "shows to anyone. Bring Helena's book, Despoina's candle, and Costas's map. " +
    "He'll give you memories in trade — and the key to the back room.",
  isComplete: (c) => c.notes.q_shopkeeper_done === true,
  reward: { memories: 10, unlocks: "cafe_backroom" },
  requires: (_c, done) => done.has("q_clinic_appointment"),
};

const q_despoina_candle: QuestDef = {
  id: "q_despoina_candle",
  act: 2,
  title: "Mrs. Despoina's candle",
  hint: "Earn the old woman's trust. She has something to give you.",
  description:
    "Mrs. Despoina has a small wax candle she has been keeping for whoever " +
    "is ready to receive it. Visit her until she's willing to press it into " +
    "your palm. It will still be warm.",
  isComplete: (c) => c.inventory.despoina_candle === true,
  reward: { item: "lantern_oil", unlocks: "night_exploration" },
  requires: (_c, done) => done.has("q_read_bench"),
};

/* ------------------------------------------------------------------ *
 * ACT 3 — Discovery (Day 5)                                          *
 * ------------------------------------------------------------------ */

const q_costas_hill: QuestDef = {
  id: "q_costas_hill",
  act: 3,
  title: "Costas knows the way",
  hint: "Costas has been counting. Let him show you the hill.",
  description:
    "Costas has been awake twenty-two days. He has counted them on the inside " +
    "of his arm with a pin. He has a map. There is a hill beyond the little " +
    "park, and beneath it a door. Find him on day four. Listen carefully.",
  isComplete: (c) => c.flags.kostasReveal === true,
  reward: { unlocks: "hatch" },
  requires: (_c, done) =>
    done.has("q_shopkeeper_errand") || done.has("q_despoina_candle"),
};

const q_descend: QuestDef = {
  id: "q_descend",
  act: 3,
  title: "Descend",
  hint: "Down the hatch. The Custodian is waiting.",
  description:
    "There is a place beneath the hill. One hundred and twenty-four glass tubes. " +
    "All wearing your face. The Custodian will meet you there. He is not a " +
    "villain. He will explain everything, kindly. Walk in anyway.",
  isComplete: (c) => c.flags.metCustodian === true,
  reward: {},
  requires: (_c, done) => done.has("q_costas_hill"),
};

const q_make_choice: QuestDef = {
  id: "q_make_choice",
  act: 3,
  title: "Choose",
  hint: "Burn it down. Or go back. Either is a kindness.",
  description:
    "Two doors. The Custodian will not stop you at either. Light the candles " +
    "in the great hall and they wake — they grow old, they hurt, they bury one " +
    "another, they live. Or take his hand and tomorrow is Monday again, and " +
    "Helena whispers good morning. Either is a kindness. Choose.",
  isComplete: (c) => c.flags.endingChosen === true,
  reward: {},
  requires: (_c, done) => done.has("q_descend"),
};

/* ------------------------------------------------------------------ */

export const QUESTS: QuestDef[] = [
  q_wake_up,
  q_meet_villagers,
  q_survive_night_1,
  q_read_bench,
  q_clinic_appointment,
  q_shopkeeper_errand,
  q_despoina_candle,
  q_costas_hill,
  q_descend,
  q_make_choice,
];

export const QUEST_INDEX: Record<string, QuestDef> = QUESTS.reduce(
  (acc, q) => {
    acc[q.id] = q;
    return acc;
  },
  {} as Record<string, QuestDef>,
);

/**
 * The first quest that is not yet complete AND whose `requires` allows it.
 * The HUD reads this every frame. Returns null when everything is done.
 */
export function activeQuest(c: GameCtx): QuestDef | null {
  const done = new Set<string>();
  for (const q of QUESTS) {
    if (q.isComplete(c)) {
      done.add(q.id);
    }
  }
  for (const q of QUESTS) {
    if (done.has(q.id)) continue;
    if (q.requires && !q.requires(c, done)) continue;
    return q;
  }
  return null;
}

/** Number of quests the player has finished. Used by HUD / save scoring. */
export function completedCount(c: GameCtx): number {
  let n = 0;
  for (const q of QUESTS) if (q.isComplete(c)) n++;
  return n;
}
