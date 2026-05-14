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

/** Auto-notebook entries — added when you spot specific inconsistencies.
 *  Every key that any `addNote(...)` call uses must appear here, otherwise
 *  the notebook falls back to showing the raw key (e.g. "momHadSon") which
 *  looks broken. Keep these as short, italicised first-person sentences. */
export const NOTES: Record<string, string> = {
  /* ---- Mom -------------------------------------------------------- */
  motherName:
    "Today my mother called me Andrew. She laughed and corrected herself. My name is Alex.",
  momHadSon:
    "Mom said she had a son who'd be my age. She corrected herself. I am her son. Aren't I?",
  momForgot:
    "Mom started to tell me something she'd been saving. Then she forgot what it was. She said she'd remember by tonight.",

  /* ---- Helena ----------------------------------------------------- */
  eleniGift:
    "Helena said \"thank you for yesterday, for the book.\" I don't remember giving her a book.",
  helenaLaughDifferent:
    "Helena said my laugh was lighter last night. She liked tonight's better. Or last night's. She couldn't tell which.",
  helenaCried:
    "Helena said: I don't know if I'm loving the same person twice or two people who look the same.",

  /* ---- Costas ----------------------------------------------------- */
  clockStop:
    "At 11:55 the big clock in the square stops for five minutes. Nobody else notices. Costas does. Despoina does.",
  kostasFreeze:
    "Costas stopped mid-sentence for thirty seconds. Eyes open. Then he went on as if nothing had happened.",
  kostasReveal:
    "Costas told me: every night at 11:55 they take the body. They give us back to ourselves, one day older. I am the forty-seventh man to wake up in my house this year.",

  /* ---- Mrs. Despoina --------------------------------------------- */
  despoinaSmile:
    "Mrs. Despoina has looked at my face on a different head, in a different morning. She smiled at me as if she knew.",
  despoinaConfession:
    "Mrs. Despoina said: love is not a thing you give. It is a thing that passes through you. It uses your mouth and your hands and your name, then it goes on.",

  /* ---- Mailman --------------------------------------------------- */
  mailmanWrongName:
    "The mailman had a letter for an Andrew Korres at my address. He left it with me anyway.",
  mailmanForgetting:
    "The mailman can't remember finishing his route yesterday. He thinks he must have, because he is here.",

  /* ---- Eli (the kid) --------------------------------------------- */
  kidSmell:
    "The kid in the park said I smelled different from yesterday. Not bad. Just different.",
  parkBench:
    "The bench in the little park has \"ALEX — 47\" carved into it. I don't remember carving that.",

  /* ---- Helena's mother ------------------------------------------- */
  helenaMotherSlip:
    "Helena's mother called me Nikos. Nikos was Helena's first husband. Helena has never spoken of him.",
  helenaMotherKnows:
    "Helena's mother asked me what I was carrying. She told me not to tell her. She wanted to keep this morning.",

  /* ---- The cat --------------------------------------------------- */
  catEyes:
    "The stray cat in the park has eyes the colour of mine. I don't know if I noticed yesterday.",
  catPose:
    "The cat sits in exactly the same place, in exactly the same patch of dust, with the same paw tucked under, every day.",

  /* ---- Shopkeeper ------------------------------------------------ */
  shopkeeperUsual:
    "The shopkeeper said he gets my usual wrong sometimes. Some mornings I take coffee, some mornings tea. He's been doing this for years.",
  shopkeeperLedger:
    "The shopkeeper showed me his ledger. The handwriting changes mid-line on a Tuesday three weeks ago — his at the top, somebody else's at the bottom. Same day, same date.",
  shopkeeperSaw:
    "The shopkeeper said there was a man standing right where I was, for just a second. Wearing my shirt.",

  /* ---- Anna (Costas's wife) ------------------------------------- */
  annaTowerStory:
    "Anna told me her husband climbed the water tower a year ago and came down a different man. He doesn't remember. She watched him come down with green paint on his elbow.",
  costasWifeCried:
    "Anna started crying without knowing why. She was about to say something about the wallpaper, she said. Then she forgot.",
  annaQuiet:
    "Anna held my hand and called it warm. She'd forgotten what she meant to say. She didn't seem to mind.",
  annaChildhood:
    "Anna spoke to me as if I were a child she remembered being cross with. I don't know whose childhood she was telling.",

  /* ---- Dr. Erin --------------------------------------------------- */
  doctorRecognised:
    "Dr. Erin didn't recognise me at first. Thirty years of long nights, she said. They run together.",
  doctorLeftRoom:
    "Dr. Erin left the consulting room mid-sentence. She did not come back. There are three patients in her clipboard who have all of my date of birth.",
  doctorTheOne:
    "Dr. Erin said: you're the one Costas said would come. Thirty years she's taken my pulse, on different hands.",

  /* ---- Shop transactions (counter trades) ----------------------- */
  boughtOldKey:
    "I bought an old brass key from the shopkeeper. He said it fits the back compartment under the stairs at my house. I have never opened that compartment.",
  shopPhotograph:
    "The shopkeeper sold me a photograph from his back room. It's me on the porch of my house. The man beside me has my face but is older. The date on the back is 1989.",
  boughtName:
    "I bought, for memories, the name of the man who lived in my house before me. The shopkeeper would not write it down. He whispered it. It was Andrew.",

  /* ---- Clinic ---------------------------------------------------- */
  clinicList:
    "Dr. Erin's clipboard, page twelve. My name three times, in slightly different handwritings. Three different appointments. One date.",
  clinicBeds:
    "There are beds in the back of the clinic that have not been slept in. The sheets are pressed. There are name-tags on them. One of them has my name.",
  clinicJars:
    "There is a row of small glass jars on a shelf in the clinic. Each one has a date written on it in pencil. They are full of nothing I can see.",
  cafeMenu:
    "Today's special at the café: yesterday's bread. Same as it was three weeks ago, according to the chalk underneath.",

  /* ---- Other ----------------------------------------------------- */
  bodyMirror:
    "My face in the mirror today is a little different. Not by much. Enough.",
  q_shopkeeper_done:
    "I brought the shopkeeper the three things — Helena's book, Despoina's candle, Costas's map. He gave me ten memories and the key to the back room.",
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
/** Every item key that any `addItem(...)` call uses must appear here.
 *  Otherwise the pocket / inventory screen falls back to showing the raw
 *  key as the item name — which makes the inventory look broken. */
export const ITEMS: Record<string, ItemDef> = {
  /* ---- Starter / found ----------------------------------------- */
  house_key: {
    name: "House Key",
    description:
      "A worn brass key. You've had it as long as you remember, which isn't very long.",
  },
  wallet: {
    name: "Wallet",
    description:
      "Faded leather. A photograph inside — yourself, younger, smiling. You don't remember the day.",
  },
  faded_letter: {
    name: "Faded Letter",
    description:
      "Half a sentence in your own handwriting: \"if you find this, remember\". The rest is missing.",
  },

  /* ---- The three errand items --------------------------------- */
  helena_book: {
    name: "Helena's Book",
    description:
      "A small clothbound book. She thanked you for giving it to her. You've never seen it before.",
  },
  despoina_candle: {
    name: "Despoina's Candle",
    description:
      "A short wax candle the old woman pressed into your palm. It is, against everything, still warm.",
  },
  kostas_map: {
    name: "Costas's Map",
    description:
      "A pencil sketch of a hill beyond the little park. An X. Two words underneath: \"down here\".",
  },

  /* ---- Gifts you receive in dialog ---------------------------- */
  andrew_ring: {
    name: "A Stranger's Ring",
    description:
      "A man's wedding ring, found on the windowsill. Mom said it looks like yours, so it must be. It is one size too small.",
  },
  mom_photograph: {
    name: "Mom's Photograph",
    description:
      "A small framed photo. You as a boy, on a beach. Mom said one of you should be holding it.",
  },
  helena_song: {
    name: "Helena's Song",
    description:
      "A tune she said you wrote. You don't remember writing it. Three bars long. It gets stuck in your head.",
  },
  mailman_letter: {
    name: "Letter for Andrew Korres",
    description:
      "Addressed to a man with your address but a different first name. The mailman left it with you anyway.",
  },
  kid_drawing: {
    name: "Eli's Drawing",
    description:
      "Crayon on lined paper. A sun at night. Eli says he drew it like that on purpose.",
  },
  park_stone: {
    name: "Small Flat Stone",
    description:
      "The cat dropped it at your feet. A number is carved into one side. The number is older than the stone.",
  },

  /* ---- Shop purchases ----------------------------------------- */
  shop_receipt: {
    name: "Ledger Page",
    description:
      "A page torn out of the shopkeeper's ledger. The handwriting changes mid-line. Same Tuesday. Two different hands.",
  },
  lantern_oil: {
    name: "Lantern Oil",
    description:
      "A small tin of pale lamp-oil. Burns longer than it has any right to. Bought, or perhaps given, from the shopkeeper's shelf.",
  },

  /* ---- Found in scene interactions ---------------------------- */
  clinic_lock: {
    name: "Clinic Drawer Key",
    description:
      "A small key found tucked under a jar in Dr. Erin's clinic. Fits a locked drawer you have not yet opened.",
  },
};
