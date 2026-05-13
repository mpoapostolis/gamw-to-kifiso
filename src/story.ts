/**
 * "FIVE MINUTES BEFORE" — prologue, two endings, notebook entries, ambient lines.
 *
 * The protagonist (Alex) lives in a quiet community where every night at 11:55
 * the Cleaners take the last five minutes of his memory. He slowly starts to
 * realise — through small inconsistencies in conversations with the neighbours.
 */

export const PROLOGUE: string[] = [
  "You live in the Diona Community. Everything is fine. Helena loves you. Your neighbour Costas greets you every morning.",
  "You don't remember what day it is, but that doesn't worry you. No one remembers. That's how it is here.",
  "Today, though, your mother called you Andrew. She laughed and corrected herself. And something inside you — like a small candle someone forgot to blow out — caught.",
];

/** If you choose "burn it down". */
export const EPILOGUE_BURN: string[] = [
  "You climbed the hill. You went underneath. You saw the bodies in the tubes — one hundred and twenty-four. All of them yours. Different ages. None of them older than forty.",
  "The Custodian smiled at you. He said: \"You don't remember any pain. You don't remember anyone dead. That is happiness. Why do you want to break it?\"",
  "You answered him something small, almost in a whisper. You don't remember what. It doesn't matter. The next morning you saw Helena in the little park. She looked at you for a second as if she didn't know you. Then she did.",
  "You're growing old together now. All the old things live inside us. Sometimes they hurt. That's alright.",
];

/** If you choose "go back". */
export const EPILOGUE_RETURN: string[] = [
  "The Custodian smiled at you. He stroked your head. He said nothing.",
  "You wake up. It's Monday. Helena whispers \"good morning\". The sun comes softly through the window.",
  "You don't remember anything. Everything is fine.",
  "...until today your mother calls you Andrew.",
];

/** Auto-notebook entries — added when you spot specific inconsistencies. */
export const NOTES: Record<string, string> = {
  motherName: "Today my mother called me Andrew. She laughed and corrected herself. My name is Alex.",
  eleniGift: "Helena said \"thank you for yesterday, for the book.\" I don't remember giving her a book.",
  kostasFreeze: "At 11:55 Costas stopped talking for thirty seconds. Eyes open. Then he went on as if nothing had happened.",
  despoinaSmile: "Mrs. Despoina asked me if I remember. I didn't say anything. She smiled at me as if she knew.",
  parkBench: "The bench in the little park has \"ALEX — 47\" carved into it. I don't remember carving that.",
  clockStop: "At 11:55 the big clock in the square stops for five minutes. Nobody else notices.",
  bodyMirror: "My face in the mirror today is a little different. Not by much. Enough.",
  kostasReveal: "Costas told me: \"You're the forty-seventh one who's woken up this week.\"",
};

/** Flavour lines used in the pause / Mrs. Despoina. */
export const QUIET_LINES: string[] = [
  "Candles know they were lit, even if you don't tell them.",
  "Some mornings you wake up and your mother calls you the wrong name.",
  "Happiness and forgetting look more alike than we thought.",
  "I don't remember yesterday. But I remember I was supposed to remember it.",
];

/** Items you can carry in your pocket. */
export interface ItemDef {
  name: string;
  description: string;
}
export const ITEMS: Record<string, ItemDef> = {
  house_key: {
    name: "House Key",
    description: "A worn brass key. You've had it as long as you remember, which isn't very long.",
  },
  wallet: {
    name: "Wallet",
    description: "Faded leather. A photograph inside — yourself, younger, smiling. You don't remember the day.",
  },
  helena_book: {
    name: "Helena's Book",
    description: "A small clothbound book. She says you gave it to her, but you've never seen it before.",
  },
  faded_letter: {
    name: "Faded Letter",
    description: "Half a sentence in your own handwriting: \"if you find this, remember\". The rest is missing.",
  },
  despoina_candle: {
    name: "Despoina's Candle",
    description: "A short wax candle the old woman pressed into your palm. It is, against everything, still warm.",
  },
  kostas_map: {
    name: "Costas's Map",
    description: "A pencil sketch of a hill, beyond the little park. An X. Two words: \"down here\".",
  },
};
