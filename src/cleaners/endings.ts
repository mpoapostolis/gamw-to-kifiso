/**
 * THE CLEANERS — the five endings.
 *
 * Five last scenes. The premise of the game is bad enough; the endings
 * should land worse. None of them are "you're disposable, the end." Each
 * one is a different kind of impossible bargain — and the protagonist
 * has accepted it, or refused it, or become it.
 *
 * Writing rules:
 *   • Short sentences. No abstractions in description.
 *   • No music in the final beat. Just silence and one image.
 *   • The horror is the kindness — what the protagonist (or the system)
 *     willingly does to people who love them.
 *   • The protagonist's last line is never a hero's line. It is whatever
 *     a real human would actually say if they finished thinking.
 *   • The reader has to keep reading after the credits. The image
 *     should stick.
 *
 * Each ending is a list of beats; each beat is a single paragraph that
 * the CreditsScene renders one at a time, italic Spectral, slow fade
 * in / hold / fade out. The last beat sits on screen for a long time.
 */

export interface EndingBeat {
  /** The paragraph to display. Will be word-wrapped on render. */
  text: string;
  /** How long this beat sits visible after the fade-in finishes (ms). Default 4200. */
  hold?: number;
  /** Optional rendering hint — the CreditsScene can apply a tint shift. */
  mood?: "warm" | "cold" | "neutral" | "white";
}

export interface EndingDef {
  id: string;
  /** Internal short label used by the route — never shown to the player. */
  internalLabel: string;
  /** The title card that lands first. Two or three words. All caps. */
  title: string;
  /** Five-ish beats that pace the final scene. */
  beats: EndingBeat[];
}

/* ----------------------------------------------------------------- *
 * 1. ACCEPTANCE                                                     *
 *                                                                   *
 * You went to bed. You didn't try to know. You lived. You loved.    *
 * You raised the child. The horror is that the love is real and     *
 * the child is not the same child. The horror is that you would do  *
 * this anyway, knowing or not. The horror is that you are kind.     *
 * ----------------------------------------------------------------- */
export const ENDING_ACCEPTANCE: EndingDef = {
  id: "ending_acceptance",
  internalLabel: "acceptance",
  title: "MORNING",
  beats: [
    {
      text: "The morning is warm.",
      mood: "warm",
      hold: 3200,
    },
    {
      text:
        "You make toast the way she likes it — light, not pale, never dark. You butter the corners first. You don't know why you do it that way. You have always done it that way.",
      mood: "warm",
      hold: 5600,
    },
    {
      text:
        "Your daughter calls from the hallway. Her voice is small and shaped like sleep.",
      mood: "warm",
      hold: 4400,
    },
    {
      text:
        "You go to her bedroom. She is complete under the blanket. You sit on the edge of the bed. You smooth her hair the way she likes. You kiss her forehead. She smells like sleep.",
      mood: "warm",
      hold: 6200,
    },
    {
      text:
        "You do not think about the night. You do not think about who stood over this bed two hours ago. You do not think about what they took. You tuck her in tighter, the way she likes, and you smile at her.",
      mood: "warm",
      hold: 6800,
    },
    {
      text:
        "She smiles back. She has your wife's eyes.",
      mood: "warm",
      hold: 7200,
    },
    {
      text:
        "You will do this every morning, for as long as you live, with people who are not the same people. You will love them. They will love you back. None of you will ever know.",
      mood: "warm",
      hold: 9000,
    },
    {
      text: "It is enough.",
      mood: "warm",
      hold: 6000,
    },
  ],
};

/* ----------------------------------------------------------------- *
 * 2. THE WITNESS                                                    *
 *                                                                   *
 * You wrote it all down. You sent it. It arrived where you knew it  *
 * would arrive. The Archive Cleaner reads it. He nods. He has done  *
 * this for thirty years. There is a manuscript in the pile already, *
 * filed under your old name. You weren't even the first you to      *
 * write it. The horror is the bureaucracy of being unexceptional.   *
 * ----------------------------------------------------------------- */
export const ENDING_WITNESS: EndingDef = {
  id: "ending_witness",
  internalLabel: "witness",
  title: "FILED",
  beats: [
    {
      text:
        "The manuscript arrives at the Archive at 03:14 on a Wednesday. The Archive smells of paper.",
      mood: "cold",
      hold: 5200,
    },
    {
      text:
        "A Cleaner with thirty years on the shelf reads it cover to cover, in twenty minutes, without putting down his cup of tea.",
      mood: "cold",
      hold: 5800,
    },
    {
      text:
        "He nods at the second page. He has read this sentence before. He has read every sentence before.",
      mood: "cold",
      hold: 5200,
    },
    {
      text:
        "He files it. TUESDAY · UNREMARKABLE · 47,228. He places it on top of a stack that comes up to his shoulder.",
      mood: "cold",
      hold: 6000,
    },
    {
      text:
        "He pulls out file 31,604 from a drawer beside the stack. He flips to page two and reads, in your handwriting:",
      mood: "cold",
      hold: 5800,
    },
    {
      text:
        '"I am writing this so that someone, eventually, will know."',
      mood: "cold",
      hold: 6400,
    },
    {
      text:
        "He files yours behind 31,604. Same handwriting. He has filed it before. He files it again. He goes home at six. The kettle is still warm when he gets there.",
      mood: "cold",
      hold: 7800,
    },
    {
      text: "Nobody publishes anything.",
      mood: "cold",
      hold: 6400,
    },
  ],
};

/* ----------------------------------------------------------------- *
 * 3. RECRUITMENT                                                    *
 *                                                                   *
 * They offered. You said yes. You are the one now. You stand over a *
 * stranger. The instruction sheet on his bedside table is in his    *
 * own handwriting. He has written it for you to read. He doesn't    *
 * know. The supervisor doesn't know her own name. Nobody is at the  *
 * top of this chain. There has never been anyone at the top.        *
 * ----------------------------------------------------------------- */
export const ENDING_RECRUITMENT: EndingDef = {
  id: "ending_recruitment",
  internalLabel: "recruitment",
  title: "FIRST NIGHT",
  beats: [
    {
      text: "It is 11:53 PM.",
      mood: "white",
      hold: 3400,
    },
    {
      text:
        "You stand over a sleeping man. He is heavy in the way sleepers are heavy. His arm is across his chest. His chest moves slowly.",
      mood: "white",
      hold: 6600,
    },
    {
      text:
        "There is an instruction sheet on his bedside table in his own handwriting. It says: EAT BREAKFAST. CALL JAMES. BUY MILK. WIFE'S BIRTHDAY SATURDAY. The list is for you.",
      mood: "white",
      hold: 7400,
    },
    {
      text:
        "He has written it so that whoever wakes up tomorrow will know what to do. He doesn't know it isn't him. He has done this every night for thirty-one years.",
      mood: "white",
      hold: 7800,
    },
    {
      text:
        "Your supervisor stands in the doorway. She has on the same uniform. She says: you're doing well for a first night.",
      mood: "white",
      hold: 6600,
    },
    {
      text:
        "You ask her what her name is. She thinks about it for a long time. She says she doesn't know. She says it kindly. She says she has been here a while.",
      mood: "white",
      hold: 7800,
    },
    {
      text:
        "You look down at the sleeping man. He has James's birthday in three days. He will not be there for it.",
      mood: "white",
      hold: 6800,
    },
    {
      text: "You begin.",
      mood: "white",
      hold: 7200,
    },
  ],
};

/* ----------------------------------------------------------------- *
 * 4. THE BREAK                                                      *
 *                                                                   *
 * You resisted the wipe. The new vessel remembers. He sits up. He   *
 * says oh. He goes to the kitchen. He sits down on the floor. The   *
 * dog comes. The dog still works. He doesn't. He is awake, and the  *
 * man who fought for this is dead, and there is nothing in the      *
 * world he can do for the man who fought for this.                  *
 * The horror: the break worked. And it changed nothing.             *
 * ----------------------------------------------------------------- */
export const ENDING_BREAK: EndingDef = {
  id: "ending_break",
  internalLabel: "break",
  title: "MORNING (AWAKE)",
  beats: [
    {
      text: "The new vessel sits up in bed.",
      mood: "neutral",
      hold: 4400,
    },
    {
      text:
        "He looks at his hands. He looks at the room. He says, very quietly, oh.",
      mood: "neutral",
      hold: 5200,
    },
    {
      text:
        "He gets out of bed. The floor is cold. He walks to the kitchen. The coffee pot is on. He turns it off.",
      mood: "neutral",
      hold: 6200,
    },
    {
      text:
        "He pours a glass of water. He stands at the sink. He stands at the sink for a long time. He drinks the water. He puts the glass down.",
      mood: "neutral",
      hold: 7400,
    },
    {
      text:
        "He picks up the phone. He puts the phone down. There is no one to call. The man who knew is dead. The man who knows is new.",
      mood: "neutral",
      hold: 7600,
    },
    {
      text:
        "He sits down on the kitchen floor. He puts his hands over his face. He doesn't cry, exactly. He waits.",
      mood: "neutral",
      hold: 6800,
    },
    {
      text:
        "The dog comes and sits next to him. The dog rests its head on his leg. The dog still works.",
      mood: "neutral",
      hold: 7400,
    },
    {
      text:
        "He will live the day. He will live tomorrow too, if they let him. He does not know yet whether he will tell anyone. He does not know yet whether anyone could believe him. He suspects he is alone in the way only one person has ever been alone.",
      mood: "neutral",
      hold: 9400,
    },
    {
      text: "The dog wags its tail. Just once. Quietly.",
      mood: "neutral",
      hold: 7200,
    },
  ],
};

/* ----------------------------------------------------------------- *
 * 5. THE STAFF (hidden, requires max awareness + specific path)     *
 *                                                                   *
 * You were never the protagonist. You are a Cleaner who was wiped.  *
 * The whole game has been a vessel slowly recovering its old shift  *
 * pattern. The morning of the seventh day, the door opens, and the  *
 * Cleaner walks in. They have your face. They are you, the next     *
 * one up the chain. The chain has no end.                           *
 * ----------------------------------------------------------------- */
export const ENDING_STAFF: EndingDef = {
  id: "ending_staff",
  internalLabel: "staff",
  title: "(NO TITLE)",
  beats: [
    {
      text: "You wake up.",
      mood: "warm",
      hold: 3800,
    },
    {
      text:
        "Your bedroom. Your pillow. The sun bar through the window. The half-empty glass on the nightstand. Everything where you left it. Everything as it has always been.",
      mood: "warm",
      hold: 7200,
    },
    {
      text:
        "You sit up. You look at the door. The door is opening.",
      mood: "neutral",
      hold: 5600,
    },
    {
      text:
        "A Cleaner walks in. They are tall and thin. Their uniform is pale. Their face is smooth where eyes should be. They are holding the clipboard. They are walking the way you remember walking.",
      mood: "cold",
      hold: 8200,
    },
    {
      text: "They are wearing your face.",
      mood: "cold",
      hold: 6400,
    },
    {
      text:
        "They look at you the way you have learned to look at sleepers. Without unkindness. Without urgency. Without permission, because permission was never relevant.",
      mood: "cold",
      hold: 7800,
    },
    {
      text:
        "They lift a hand. They put a finger to where their lips should be. They wait. You know what they are waiting for. You have done this job for a long time.",
      mood: "cold",
      hold: 7600,
    },
    {
      text: "The sine wave begins.",
      mood: "cold",
      hold: 5600,
    },
    {
      text:
        "You don't fight it. You never have. There is nobody at the top of the chain. There was never going to be. You will wake up tomorrow morning believing without question that you are the same person who went to bed. You are not.",
      mood: "cold",
      hold: 11000,
    },
    {
      text: "The light goes out.",
      mood: "cold",
      hold: 8400,
    },
  ],
};

export const ENDINGS: Record<string, EndingDef> = {
  acceptance: ENDING_ACCEPTANCE,
  witness: ENDING_WITNESS,
  recruitment: ENDING_RECRUITMENT,
  break: ENDING_BREAK,
  staff: ENDING_STAFF,
};

/**
 * Pick the ending the player has earned. The rules:
 *   • If `chose_acceptance`     → ACCEPTANCE (the soft path; bypasses all others)
 *   • If `chose_recruitment`    → RECRUITMENT
 *   • If `resisted_wipe`        → THE BREAK
 *   • If `awareness >= 80` AND `flag staff_revealed` → THE STAFF (hidden)
 *   • Else (player documented + slept normally) → THE WITNESS
 *
 * Reads the GameState flags. The flags are SET by late-game choices in
 * Day 6-7 (those scenes are in a later iteration).
 */
export function resolveEnding(flags: Record<string, boolean>, awareness: number): EndingDef {
  if (flags.chose_acceptance) return ENDING_ACCEPTANCE;
  if (flags.chose_recruitment) return ENDING_RECRUITMENT;
  if (flags.staff_revealed && awareness >= 80) return ENDING_STAFF;
  if (flags.resisted_wipe) return ENDING_BREAK;
  return ENDING_WITNESS;
}
