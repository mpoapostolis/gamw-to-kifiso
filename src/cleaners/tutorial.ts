/**
 * THE CLEANERS — tutorial beats.
 *
 * A guided Day-1 walk-through: at each milestone (waking up, surfacing
 * your first fragment, leaving the bedroom, leaving the apartment,
 * reaching the street), a big in-screen instruction lands so the
 * player always knows what to do next. Each beat is GameState-flagged
 * so it only fires once across the entire save.
 *
 * The visual language is bigger and more emphatic than `flashLine` —
 * a full overlay rectangle with Cinzel + Spectral text, dim wash
 * behind so it reads even over the busiest scene. The room can keep
 * playing underneath; nothing is paused.
 *
 * Design: holding the player's hand for the first fifteen minutes is
 * good for THIS game. The horror lands later, after you understand
 * what you're doing — not while you're squinting at a chevron trying
 * to remember which key to press.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../consts";
import { hex, PAL } from "../palette";
import { GameState } from "../state/gameState";

const CINZEL = '"Cinzel", "Times New Roman", serif';
const SPECTRAL = '"Spectral", Georgia, serif';

export interface TutorialBeat {
  /** GameState flag — once set, this beat never fires again. */
  flag: string;
  /** A single-line all-caps headline. Two or three words. */
  headline: string;
  /** A 1-2 sentence italic body. Concrete verbs + keys. */
  body: string;
  /** How long the overlay stays before fading. Default 4800ms. */
  hold?: number;
}

/**
 * Fire a tutorial beat if its flag isn't already set. Idempotent: a
 * second call with the same `flag` is a no-op. The overlay paints
 * itself at depth 9700 (above the HUD), then fades and destroys.
 *
 * The text sits in the centre of the screen so the eye finds it
 * immediately. We don't pause the scene — keeping the player in
 * control feels less videogamey.
 */
export function fireTutorial(scene: Phaser.Scene, beat: TutorialBeat): void {
  if (GameState.flag(beat.flag)) return;
  GameState.setFlag(beat.flag, true);
  const hold = beat.hold ?? 4800;

  // dim wash behind the panel so it reads on any background
  const wash = scene.add
    .rectangle(VIEW_W / 2, VIEW_H / 2 + 16, 880, 184, 0x000000, 0.72)
    .setStrokeStyle(2, PAL.emberSoft, 0.5)
    .setScrollFactor(0)
    .setDepth(9700)
    .setAlpha(0);

  const head = scene.add
    .text(VIEW_W / 2, VIEW_H / 2 - 28, beat.headline, {
      fontFamily: CINZEL,
      fontSize: "26px",
      color: hex(PAL.emberHot),
      fontStyle: "800",
    })
    .setOrigin(0.5)
    .setLetterSpacing(6)
    .setScrollFactor(0)
    .setDepth(9710)
    .setAlpha(0);

  const body = scene.add
    .text(VIEW_W / 2, VIEW_H / 2 + 26, beat.body, {
      fontFamily: SPECTRAL,
      fontSize: "17px",
      color: hex(PAL.thatchHi),
      fontStyle: "italic 400",
      align: "center",
      wordWrap: { width: 800 },
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(9710)
    .setAlpha(0);

  // gentle rule under the head, in the same visual language as the title
  const rule = scene.add.graphics().setScrollFactor(0).setDepth(9710).setAlpha(0);
  rule.lineStyle(1, PAL.emberSoft, 0.7);
  rule.lineBetween(VIEW_W / 2 - 80, VIEW_H / 2, VIEW_W / 2 + 80, VIEW_H / 2);

  const targets = [wash, head, body, rule];
  scene.tweens.add({
    targets,
    alpha: { from: 0, to: 1 },
    duration: 380,
    yoyo: true,
    hold,
    onComplete: () => {
      wash.destroy();
      head.destroy();
      body.destroy();
      rule.destroy();
    },
  });
}

/* ------------------------------------------------------------------ *
 * THE BEAT LIBRARY                                                   *
 * Each room imports the ones it needs. Flags use a `tut_` prefix     *
 * so they're easy to grep + reset for testing.                       *
 * ------------------------------------------------------------------ */

export const TUT_WAKE: TutorialBeat = {
  flag: "tut_wake",
  headline: "GOOD MORNING",
  body:
    "this is your bedroom. walk with WASD or the arrow keys. press E on what looks wrong.",
};

export const TUT_FIRST_FRAGMENT: TutorialBeat = {
  flag: "tut_first_fragment",
  headline: "YOU WROTE IT DOWN",
  body:
    "every wrong thing you notice goes in your notebook. press J — any time, in any room — to read what you've written.",
};

export const TUT_LEAVE_BEDROOM: TutorialBeat = {
  flag: "tut_leave_bedroom",
  headline: "THE CHEVRONS",
  body:
    "every door is marked with a glowing chevron. walk under one and press E to step through.",
};

export const TUT_IN_LIVINGROOM: TutorialBeat = {
  flag: "tut_in_livingroom",
  headline: "THE FRONT DOOR",
  body:
    "the apartment exit is on the north wall of the living room. it has a chevron above it. step through when you're ready.",
};

export const TUT_OUT_OF_APARTMENT: TutorialBeat = {
  flag: "tut_out_of_apartment",
  headline: "OUT INTO THE WORLD",
  body:
    "up the stairs is the street. you do this every morning. cafe · metro · office · home. notice what's wrong on the way.",
};

export const TUT_IN_STREET: TutorialBeat = {
  flag: "tut_in_street",
  headline: "THE MORNING ROUTINE",
  body:
    "the cafe is east. the metro is south. the office is through the metro. when you've seen enough, head home.",
};

export const TUT_TIME_TO_SLEEP: TutorialBeat = {
  flag: "tut_time_to_sleep",
  headline: "TIME TO SLEEP",
  body:
    "you've done a day. go home. press E on your bed. tomorrow won't quite be tomorrow.",
};
