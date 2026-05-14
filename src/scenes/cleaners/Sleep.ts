/**
 * THE CLEANERS — Sleep & memory wipe.
 *
 * The most important moment of the daily loop. Every night while the
 * player sleeps they are quietly murdered and replaced by a copy. This
 * scene is where that happens, told entirely as italic prose on black:
 *
 *   1. "you close your eyes."
 *   2. Day-dependent middle beat — a clock stops, or something white
 *      moves at the foot of the bed.
 *   3. THE WIPE — a 5s window where a single sentence the player wrote
 *      "as their last thought before sleep" decays one character at a
 *      time into thin dots. The player can HOLD J to push back, and
 *      every ~100ms two dots are restored to letters. They never have
 *      to hold J. If they don't, the wipe proceeds — that IS the night.
 *   4. "morning." (and one tail line if they resisted.)
 *
 * On completion: GameState.advanceDay() + SceneRouter.go(this, "Bedroom").
 *
 * Design doc §7.1, §8.4.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL } from "../../palette";
import { GameState } from "../../state/gameState";
import { SceneRouter } from "../../state/sceneRouter";

/** The exact line the player "wrote down" as their last thought tonight. */
const WIPE_LINE = "I won't forget tonight.";

/** Visual placeholder for a wiped character. A thin middle-dot, not a space. */
const WIPED_GLYPH = "·"; // middle dot

/** QTE timing knobs — kept up here so the feel is tunable in one place. */
const WIPE_WINDOW_MS = 5000;
const WIPE_TICK_MS = 180;     // one char removed every ~180ms (≈ 27 ticks over 5s)
const RESTORE_TICK_MS = 100;  // while J is held, 2 chars restored every ~100ms
const RESTORE_PER_TICK = 2;
const RESIST_THRESHOLD = 0.6; // > 60% letters remaining ⇒ resisted_wipe = true

/** Per-beat timing for the italic-prose interludes (fade in / hold / fade out). */
const BEAT_FADE_IN_MS = 700;
const BEAT_HOLD_MS = 700;
const BEAT_FADE_OUT_MS = 600;

export class SleepScene extends Phaser.Scene {
  private keyJ!: Phaser.Input.Keyboard.Key;
  /** Mutable array of characters currently shown in the wipe line. */
  private wipeChars: string[] = [];
  /** Indices in `wipeChars` that have been wiped (replaced with WIPED_GLYPH). */
  private wipedIndices: Set<number> = new Set();
  /** The displayed wipe-line text object. Re-rendered on every tick. */
  private wipeText?: Phaser.GameObjects.Text;
  /** True if the player held J at any point — only used for telemetry/feel. */
  private heldJEver = false;

  constructor() {
    super({ key: "Sleep" });
  }

  create() {
    // Pure black background — see design constraints. No vignette, no glow:
    // this beat is meant to feel like the world has stopped existing.
    this.cameras.main.setBackgroundColor(hex(0x000000));
    // Fade in from black-to-black is a no-op, but it standardises the
    // camera-fade state so any later fadeOut works cleanly.
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // J is the player's "hold on" key during the wipe. Bound once up here
    // so the input system is ready before the QTE starts.
    this.keyJ = this.input.keyboard!.addKey("J");

    // Kick off the sequence. Each beat schedules the next via delayedCall;
    // doing it as a chain (rather than a single addEvent with .repeat) keeps
    // each beat's tween fully isolated and easy to read.
    this.runBeats();
  }

  /**
   * Drive the four-beat sequence. Day-1/2 see a clock stopping outside;
   * Day-3 and onward see something white at the foot of the bed — the
   * Cleaners are no longer being subtle.
   */
  private runBeats(): void {
    // TODO: wire wipe SFX — a low sine sweep under beat 3, dropping in
    // pitch as the line decays. Integrator handles audio later.
    this.flashLine("you close your eyes.", () => {
      const middle =
        GameState.state.dayIndex >= 3
          ? "something white moves at the foot of the bed."
          : "outside, a clock stops.";
      this.flashLine(middle, () => {
        this.runWipeQTE(() => {
          this.flashLine("morning.", () => this.exitToMorning());
        });
      });
    });
  }

  /**
   * The 5-second wipe window. Renders the WIPE_LINE in italic, then on a
   * regular tick removes one random remaining letter and replaces it with
   * the WIPED_GLYPH. While J is held, a faster restore tick puts two
   * random wiped letters back. At t=5000ms both loops stop and we score.
   */
  private runWipeQTE(onComplete: () => void): void {
    // Initialise the working buffer from the canonical line. We never
    // mutate WIPE_LINE itself; this is the live state that drives render.
    this.wipeChars = WIPE_LINE.split("");
    this.wipedIndices = new Set();

    // Main wipe-line text. emberSoft is the warm "kept thing" highlight —
    // the line is the only living thing on the screen during the QTE.
    this.wipeText = this.add
      .text(VIEW_W / 2, VIEW_H / 2, WIPE_LINE, {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "22px",
        color: hex(PAL.emberSoft),
        fontStyle: "italic 400",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0)
      .setDepth(9300);

    // The "hold J" hint — quieter, smaller, sits below the line. inkFaint
    // keeps it visually present without competing with the wipe text.
    const hint = this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 40, "hold J  —  write it down  —  keep it", {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "13px",
        color: hex(PAL.inkFaint),
        fontStyle: "italic 400",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0)
      .setDepth(9300);

    // Fade the line + hint in fast (300ms) so we don't burn QTE time on
    // a slow reveal. The 5-second window starts after the fade lands.
    this.tweens.add({
      targets: [this.wipeText, hint],
      alpha: 1,
      duration: 300,
      onComplete: () => this.startWipeLoops(hint, onComplete),
    });
  }

  /**
   * Spin up the two timed loops that drive the QTE: the wipe tick (always
   * runs, removes a letter every WIPE_TICK_MS), and the restore tick (only
   * acts while J is held). After WIPE_WINDOW_MS, both are stopped and we
   * score the result against RESIST_THRESHOLD.
   */
  private startWipeLoops(
    hint: Phaser.GameObjects.Text,
    onComplete: () => void,
  ): void {
    // The wipe tick — every WIPE_TICK_MS, mark one still-living index as
    // wiped. Stops on its own once everything is wiped (no-op pass).
    const wipeEvent = this.time.addEvent({
      delay: WIPE_TICK_MS,
      loop: true,
      callback: () => {
        this.wipeOneRandomChar();
        this.repaintWipeLine();
      },
    });

    // The restore tick — every RESTORE_TICK_MS, if J is currently held,
    // put RESTORE_PER_TICK random wiped letters back. We check `.isDown`
    // here instead of using JustDown so a continuous hold actually works.
    const restoreEvent = this.time.addEvent({
      delay: RESTORE_TICK_MS,
      loop: true,
      callback: () => {
        if (!this.keyJ.isDown) return;
        this.heldJEver = true;
        for (let i = 0; i < RESTORE_PER_TICK; i++) this.restoreOneRandomChar();
        this.repaintWipeLine();
      },
    });

    // End of the 5-second window. Stop both loops, score, optionally
    // append the resist-tail beat, then continue to "morning."
    this.time.delayedCall(WIPE_WINDOW_MS, () => {
      wipeEvent.remove(false);
      restoreEvent.remove(false);
      this.finishWipe(hint, onComplete);
    });
  }

  /**
   * Pick a random still-living index in wipeChars and mark it wiped.
   * If every index is already wiped, this is a no-op — the visible line
   * will stay all dots and the player has lost everything.
   */
  private wipeOneRandomChar(): void {
    // Build a list of indices that are still showing a real letter. We
    // intentionally include whitespace + punctuation so the whole line
    // decays evenly — wiping a space looks like nothing changed, which
    // is fine; it still counts toward the wipe budget.
    const alive: number[] = [];
    for (let i = 0; i < this.wipeChars.length; i++) {
      if (!this.wipedIndices.has(i)) alive.push(i);
    }
    if (alive.length === 0) return;
    const pick = alive[Math.floor(Math.random() * alive.length)]!;
    this.wipedIndices.add(pick);
  }

  /**
   * Pick a random wiped index and bring it back. Used by the J-held
   * restore tick. No-op if nothing is currently wiped.
   */
  private restoreOneRandomChar(): void {
    if (this.wipedIndices.size === 0) return;
    // Set has no random access — materialise to an array for the pick.
    const wiped = Array.from(this.wipedIndices);
    const pick = wiped[Math.floor(Math.random() * wiped.length)]!;
    this.wipedIndices.delete(pick);
  }

  /**
   * Compose the displayed string by walking the original chars and
   * substituting WIPED_GLYPH at wiped indices. This is what makes the
   * decay actually visible — we re-render the whole line every tick.
   */
  private repaintWipeLine(): void {
    if (!this.wipeText) return;
    const out: string[] = [];
    for (let i = 0; i < this.wipeChars.length; i++) {
      out.push(this.wipedIndices.has(i) ? WIPED_GLYPH : this.wipeChars[i]!);
    }
    this.wipeText.setText(out.join(""));
  }

  /**
   * 5 seconds are up. Score the line. If MORE THAN 60% of the original
   * letters are still showing (i.e. fewer than 40% of indices are wiped),
   * set the resisted_wipe flag, drop a journal entry, and play one extra
   * tail beat before morning. Otherwise: silent, normal night.
   *
   * Whitespace doesn't get special treatment here — it counts as a
   * character either way. The threshold is on the whole string by design:
   * a player who barely held J keeps the LOOK of the sentence intact.
   */
  private finishWipe(
    hint: Phaser.GameObjects.Text,
    onComplete: () => void,
  ): void {
    const total = this.wipeChars.length;
    const kept = total - this.wipedIndices.size;
    const ratio = total > 0 ? kept / total : 0;

    // Fade the wipe line + hint out together so the screen returns to
    // pure black before the next beat fades in. Avoids a hard cut.
    this.tweens.add({
      targets: [this.wipeText, hint],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        hint.destroy();
        this.wipeText?.destroy();
        this.wipeText = undefined;

        if (ratio > RESIST_THRESHOLD) {
          // The player held on. Flip the flag, write the line to the
          // journal so it survives the night, then show the tail beat.
          GameState.setFlag("resisted_wipe", true);
          GameState.addJournalEntry(
            "For the first time, I felt the wipe coming. I held on to one sentence. The rest is gone.",
          );
          this.flashLine("you keep it. for now.", onComplete);
        } else {
          // Default outcome: silent wipe. Flag is explicitly false so a
          // later scene can tell "didn't resist this night" apart from
          // "never reached the wipe scene at all".
          GameState.setFlag("resisted_wipe", false);
          // Suppress unused-var lint for telemetry-only field.
          void this.heldJEver;
          onComplete();
        }
      },
    });
  }

  /**
   * Render a single italic beat: fade in, hold, fade out, then run the
   * supplied callback. Modeled on Bedroom.flashLine's tween-with-yoyo
   * shape so the cadence reads consistent across scenes.
   */
  private flashLine(text: string, onComplete: () => void): void {
    const t = this.add
      .text(VIEW_W / 2, VIEW_H / 2, text, {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "26px",
        color: hex(PAL.thatchHi),
        fontStyle: "italic 400",
        align: "center",
        wordWrap: { width: VIEW_W - 160 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0)
      .setDepth(9300);

    // Sum of phases = BEAT_FADE_IN_MS + BEAT_HOLD_MS + BEAT_FADE_OUT_MS.
    // We tween in, schedule a held delay, then tween out — this gives a
    // controlled hold (Phaser tween.hold also works, but a delayedCall
    // makes the timing easier to read at a glance).
    this.tweens.add({
      targets: t,
      alpha: { from: 0, to: 1 },
      duration: BEAT_FADE_IN_MS,
      onComplete: () => {
        this.time.delayedCall(BEAT_HOLD_MS, () => {
          this.tweens.add({
            targets: t,
            alpha: 0,
            duration: BEAT_FADE_OUT_MS,
            onComplete: () => {
              t.destroy();
              onComplete();
            },
          });
        });
      },
    });
  }

  /**
   * End of the cinematic. Advance the day counter, then hand off to the
   * router which fades to black and starts Bedroom fresh on Day N+1.
   */
  private exitToMorning(): void {
    GameState.advanceDay();
    SceneRouter.go(this, "Bedroom");
  }
}
