/**
 * "YESTERDAY ECHOES" — prologue, two endings, notebook entries, quiet lines.
 *
 * Every night, the Cleaners take the last five minutes of memory and pour the
 * rest of you into a new body. Today's Alex is the latest in a sequence. He
 * doesn't know how long the sequence is. He's starting to.
 */

export const PROLOGUE: string[] = [
  "You wake up. Your name is Alex. You know this the way you know which side of the bed is yours: by the shape of the wear.",
  "Helena is humming in the kitchen. Outside, the sky is the colour it always is. You don't remember yesterday. Nobody does. That's the way it is here.",
  "Today though — your mother, in the kitchen, looking right at you — said Andrew. She laughed. She said sorry. She said she didn't know why.",
  "And something inside you, in the small dark place under the place a person usually thinks from, opened an eye.",
];

/** If you choose to burn it down — to give them back their losses. */
export const EPILOGUE_BURN: string[] = [
  "You light the lights. One hundred and twenty-four tubes go dark, one after another, like a hand passing over a row of candles.",
  "Out there in the morning, Mom looks at you a moment too long. She knows nothing of the last several weeks; the body she remembers is younger by a year. She accepts you anyway, the way a mother does.",
  "Helena holds your hand in the park bench you can both newly remember carving names into. \"I think someone died,\" she says. \"I think I loved him. I think you were him.\" You don't correct her. You don't think it matters.",
  "The lamps no longer go out at 11:55. You grow older together, all of you, slowly. It hurts. It is real. Old age is a slow language and you are all learning it again.",
];

/** If you choose to go back — to stay inside the kindness. */
export const EPILOGUE_RETURN: string[] = [
  "You take the Custodian's hand. He says: \"this isn't a worse choice. It's a different one.\" You believe him.",
  "Tomorrow you wake up. It's Monday. Helena hums in the kitchen. The sky is the colour it always is. Your mother is downstairs.",
  "She turns when you come in. She smiles. She says good morning, Andrew. — Oh. Sorry, sorry. Alex.",
  "And, somewhere small and dark and almost too far down to hear, an eye that was just learning to open closes again.",
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
