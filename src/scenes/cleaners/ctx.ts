/**
 * THE CLEANERS — compatibility shim for the legacy `GameCtx` interface.
 *
 * The existing `Player` class (and a few effect helpers) read fields from
 * a `GameCtx` — hp, gold, flags, addNote, etc. The new game doesn't use any
 * of that (no combat, no inventory, no notes), but rewriting Player from
 * scratch is out-of-scope for Phase 1. So we hand it a dummy ctx whose
 * mutators redirect to the new `GameState` where they have a sensible
 * meaning, and silently no-op everything else.
 *
 * This lets us keep the existing Player object (movement, sprint, lantern,
 * animation set) as-is. Once Phase 1 is stable we can replace Player with
 * a slimmer "Walker" class and delete this shim.
 */
import type { Fx, GameCtx } from "../../types";
import { GameState } from "../../state/gameState";

/**
 * A no-op Fx implementation. The Player class fires hooks for dust kicks,
 * slash arcs, screen shake on hit, etc. — none of which fire in The
 * Cleaners' indoor walking-around scenes. So we hand Player this stub so
 * its calls never crash.
 */
export function dummyFx(): Fx {
  return {
    dust: () => {},
    slashArc: () => {},
    hitSpark: () => {},
    dashTrail: () => {},
    embers: () => {},
    ringPulse: () => {},
    gloomBurst: () => {},
    pop: () => {},
    shake: () => {},
    hitStop: () => {},
    floatText: () => {},
  };
}

export function dummyCtx(): GameCtx {
  return {
    hp: 6,
    maxHp: 6,
    gold: 0,
    gloomKilled: 0,
    questState: 0,
    wardenDown: false,
    attackBonus: false,
    flags: {},
    day: GameState.state.dayIndex,
    time: 7 * 60,
    notes: {},
    inventory: {},
    dayStartNotes: {},
    dayStartInventory: {},
    giveGold: () => {},
    takeGold: () => {},
    giveHeartContainer: () => {},
    healFull: () => {},
    heal: () => {},
    toast: () => {},
    addNote: (id) => {
      // Re-route legacy "addNote" calls into the new journal.
      GameState.addJournalEntry(`(note) ${id}`);
    },
    addItem: () => {},
  };
}
