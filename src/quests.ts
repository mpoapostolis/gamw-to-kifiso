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
  /** Static fallback hint. The HUD prefers `dynamicHint(c)` if defined. */
  hint: string;
  description: string;
  isComplete(c: GameCtx): boolean;
  reward?: QuestReward;
  /** Quest only becomes active when this returns true. Reads other quests' done state. */
  requires?: (c: GameCtx, doneIds: Set<string>) => boolean;
  /** Optional state-aware hint. Lets the hint shrink as the player makes progress. */
  dynamicHint?: (c: GameCtx) => string;
}

/* ------------------------------------------------------------------ *
 * ACT 1 — Awakening (Day 1-2)                                        *
 * ------------------------------------------------------------------ */

const q_wake_up: QuestDef = {
  id: "q_wake_up",
  act: 1,
  title: "Talk to Mom",
  hint: "Walk to the kitchen and talk to Mom. (E next to her.)",
  description:
    "She's humming in the kitchen. She'll have coffee, and probably half a sentence " +
    "she didn't mean to say. Get up.",
  isComplete: (c) => c.flags.metMom === true,
  reward: { memories: 2 },
};

const q_step_outside: QuestDef = {
  id: "q_step_outside",
  act: 1,
  title: "Step outside",
  hint: "Find the front door. Press E to go out.",
  description:
    "The town is small. You'll see the well in the square, lamp posts down the road, " +
    "and a few houses that have always been there. Step out and breathe.",
  isComplete: (c) => c.flags.steppedOut === true,
  reward: { memories: 1 },
  requires: (_c, done) => done.has("q_wake_up"),
};

const q_meet_villagers: QuestDef = {
  id: "q_meet_villagers",
  act: 1,
  title: "Meet the villagers",
  hint: "Helena by the well · Costas south · Mrs. Despoina's house is west.",
  description:
    "Three people will help you understand. Helena waits in the front garden by the well. " +
    "Costas is across the road to the south, painting the same door for three weeks. " +
    "Mrs. Despoina lives in the small house far to the west. Knock on her door.",
  isComplete: (c) =>
    c.flags.metHelena === true &&
    c.flags.metCostas === true &&
    c.flags.metDespoina === true,
  reward: { memories: 5 },
  requires: (_c, done) => done.has("q_step_outside"),
  // Shrink the hint as you tick villagers off, so the HUD always reflects
  // exactly who's left.
  dynamicHint: (c) => {
    const left: string[] = [];
    if (!c.flags.metHelena) left.push("Helena (by the well)");
    if (!c.flags.metCostas) left.push("Costas (south)");
    if (!c.flags.metDespoina) left.push("Mrs. Despoina (west, indoors)");
    if (left.length === 0) return "All three met. Head back home.";
    return "Still to meet: " + left.join(" · ");
  },
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
  dynamicHint: (c) => {
    if (c.day < 3) return "Mrs. Despoina won't give it to you yet. Come back tomorrow morning.";
    return "Mrs. Despoina is at home, far west. She has something for you today.";
  },
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
  // Gate on Costas's map being in hand — without it the quest is unwinnable
  // and the player just bounces off the shopkeeper. Costas hands the map
  // over on Day 4 (kostasReveal), so this naturally activates then.
  requires: (_c, done) => done.has("q_costas_hill"),
  dynamicHint: (c) => {
    const need: string[] = [];
    if (!c.inventory.helena_book)    need.push("Helena's book");
    if (!c.inventory.despoina_candle) need.push("Despoina's candle");
    if (!c.inventory.kostas_map)     need.push("Costas's map");
    if (need.length === 0) return "All three gathered. Bring them to the shopkeeper at the café.";
    return "Still need: " + need.join(" · ");
  },
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
  requires: (_c, done) => done.has("q_despoina_candle"),
  dynamicHint: (c) => {
    if (c.day < 4) return "Costas won't be ready until day four. Sleep through the night.";
    return "Costas stands by his half-painted door. Put the brush down. Look at him.";
  },
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

// Order matters: activeQuest() returns the first incomplete one whose
// requires are satisfied. Each entry must be completable when it shows up
// in the HUD — never list a quest before its dependency, and never list
// one the player can't finish today. The intended five-day arc:
//   Day 1  · wake → step outside → meet the three villagers → sleep
//   Day 2  · survive the first night → read the bench → clinic check-up
//   Day 3  · Despoina's candle
//   Day 4  · Costas's reveal → shopkeeper errand → descend
//   Day 5  · choose the ending
export const QUESTS: QuestDef[] = [
  q_wake_up,
  q_step_outside,
  q_meet_villagers,
  q_survive_night_1,
  q_read_bench,
  q_clinic_appointment,
  q_despoina_candle,
  q_costas_hill,
  q_shopkeeper_errand,
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

/**
 * A single-line "headline" for the morning toast on day N. Reads the current
 * state so the toast reflects what's actually open today, not just a static
 * day → string table. Returns null when nothing's left to do (e.g. ending
 * already chosen).
 */
export function dayHeadline(c: GameCtx): string | null {
  if (c.flags.endingChosen) return null;
  const q = activeQuest(c);
  if (q) return `Day ${c.day} · ${q.title}`;
  return `Day ${c.day} · explore the community`;
}
