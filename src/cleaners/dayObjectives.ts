/**
 * THE CLEANERS — day objectives.
 *
 * The game has no quest UI in the YE sense — no quest log, no waypoints
 * on the world map. But the player still needs to know WHAT to do today.
 * This module returns a single short sentence per (day, current-scene)
 * that the HUD displays in the top-centre.
 *
 * The sentence shifts as the player makes progress: collected fragments,
 * scenes visited, flags set. It's not a checklist — it's a nudge. The
 * horror of the premise depends on the player choosing to look closer;
 * we just remind them that they have the option.
 *
 * Design:
 *   Day 1: orientation. Learn the verbs. Walk around. Sleep when tired.
 *   Day 2: routine. Get to work. Notice the wrong things.
 *   Day 3: Window appears. Stay up past 11. Look across the air-shaft.
 *   Day 4: doubt. Visit Mom. Get the pharmacist's wrong-eyes line.
 *   Day 5: contact. Stay awake. See a Cleaner. (Future iteration.)
 *   Day 6: the body. (Future iteration.)
 *   Day 7: choose. (Future iteration.)
 */

import type { GameStateData } from "../state/gameState";

export interface DayObjective {
  /** Short imperative sentence, lower-case, no period. Max ~48 chars. */
  text: string;
  /** Optional 2-3 word sub-hint, dim. */
  sub?: string;
}

const FALLBACK: DayObjective = {
  text: "look around. press E on what catches your eye.",
};

export function getObjective(state: GameStateData): DayObjective {
  const day = state.dayIndex;
  const frags = state.fragmentsFound.length;
  const flags = state.endingFlags;

  switch (day) {
    case 1: {
      // Day 1 objective evolves with the player's progress through the
      // morning. We don't gate anything; we just acknowledge it.
      if (frags === 0)
        return {
          text: "look around your bedroom. press E on what catches your eye.",
          sub: "walk · WASD · examine · E · journal · J",
        };
      if (frags < 3)
        return {
          text: "keep examining. there's more in here than feels right.",
          sub: "open the journal with J to read what you've written",
        };
      if (!flags.left_apartment)
        return {
          text: "the front door is in the living room. step out when you're ready.",
          sub: "the chevrons mark every door",
        };
      if (!flags.visited_cafe && !flags.visited_office)
        return {
          text: "the morning routine. cafe · metro · office · home.",
          sub: "everyone keeps their head down. notice anyway",
        };
      return {
        text: "head home when you've seen enough. press E on your bed to sleep.",
        sub: "tomorrow won't quite be tomorrow",
      };
    }
    case 2: {
      if (!flags.left_apartment_today)
        return {
          text: "second morning. coffee. work. you do this every day.",
          sub: "watch what's different",
        };
      if (!flags.visited_cafe)
        return {
          text: "the barista has been making your coffee for years.",
          sub: "see if he remembers your name today",
        };
      if (!flags.visited_office)
        return {
          text: "your coworker likes to tell jokes. you've heard this one.",
          sub: "office is east on the metro",
        };
      return {
        text: "go home. sleep. tomorrow you'll do this all again.",
      };
    }
    case 3: {
      return {
        text: "stay up tonight. don't sleep. look out the bedroom window.",
        sub: "the Window opens after 11:00",
      };
    }
    case 4: {
      return {
        text: "visit your mother. the pharmacist sells sleep aids.",
        sub: "they both know more than they're telling",
      };
    }
    case 5: {
      return {
        text: "stay awake. the Cleaners are real. you can see them now.",
        sub: "don't be seen",
      };
    }
    case 6: {
      return {
        text: "follow the corridor down. you have to know.",
      };
    }
    case 7: {
      return {
        text: "you've made your decision. live with it.",
      };
    }
    default:
      return FALLBACK;
  }
}

/** Used by the HUD's clock area. Maps day to a weekday name. */
export function dayName(day: number): string {
  const names = ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Monday"];
  return names[Math.min(day - 1, names.length - 1)] ?? "another day";
}
