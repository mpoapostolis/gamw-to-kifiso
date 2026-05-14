/**
 * THE CLEANERS — credits / ending playback.
 *
 * Black screen, italic Spectral text, one beat at a time. Slow fade in,
 * long hold, slow fade out. No music. The mood (warm / cold / white /
 * neutral) tints the text colour subtly. The last beat lingers for a
 * long time before fading and revealing a single quiet line —
 *      "thank you for playing."
 * — which is itself a gut punch in context.
 *
 * Launch with `scene.start("Credits", { endingId })` where endingId is
 * one of the keys in `ENDINGS` from src/cleaners/endings.ts. If omitted,
 * the scene asks `resolveEnding(flags, awareness)` from GameState.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL } from "../../palette";
import { GameState } from "../../state/gameState";
import { ENDINGS, resolveEnding, type EndingDef, type EndingBeat } from "../../cleaners/endings";

const MOOD_TINT: Record<NonNullable<EndingBeat["mood"]>, string> = {
  warm: hex(PAL.emberSoft),
  cold: hex(PAL.gloomGlow),
  neutral: hex(PAL.thatchHi),
  white: hex(PAL.gloomHi),
};

export class CreditsScene extends Phaser.Scene {
  private ending!: EndingDef;
  private titleObj?: Phaser.GameObjects.Text;
  private bodyObj?: Phaser.GameObjects.Text;
  private skipping = false;

  constructor() {
    super("Credits");
  }

  init(data: { endingId?: string } = {}) {
    const explicit = data.endingId && ENDINGS[data.endingId];
    this.ending = explicit
      ? explicit
      : resolveEnding(GameState.state.endingFlags, GameState.state.awareness);
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // SKIP — a small italic hint, tucked in the corner. Pressing SPACE or
    // ENTER jumps to the post-ending Title splash. We let the player skip;
    // these endings are meant to land, not to be locked behind a button.
    const skipHint = this.add
      .text(VIEW_W - 24, VIEW_H - 24, "SPACE  ·  skip", {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "11px",
        color: hex(PAL.inkFaint),
        fontStyle: "italic 400",
      })
      .setOrigin(1, 1)
      .setAlpha(0.5)
      .setScrollFactor(0);
    this.tweens.add({ targets: skipHint, alpha: 0.5, duration: 1200, delay: 2400 });
    void skipHint;

    const skip = () => {
      if (this.skipping) return;
      this.skipping = true;
      this.cameras.main.fadeOut(900, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start("Title");
      });
    };
    this.input.keyboard?.on("keydown-SPACE", skip);
    this.input.keyboard?.on("keydown-ENTER", skip);
    this.input.keyboard?.on("keydown-ESC", skip);

    this.cameras.main.fadeIn(2400, 0, 0, 0);

    // Title card — two seconds in, three seconds visible, two seconds out.
    // This sets the tone before the body beats start arriving.
    this.titleObj = this.add
      .text(VIEW_W / 2, VIEW_H * 0.34, this.ending.title, {
        fontFamily: '"Cinzel", "Times New Roman", serif',
        fontSize: "38px",
        color: hex(PAL.thatchHi),
        fontStyle: "800",
        align: "center",
      })
      .setOrigin(0.5)
      .setLetterSpacing(10)
      .setAlpha(0)
      .setScrollFactor(0);

    this.tweens.add({
      targets: this.titleObj,
      alpha: { from: 0, to: 1 },
      duration: 1800,
      delay: 1400,
      yoyo: true,
      hold: 3400,
      onComplete: () => {
        this.titleObj?.destroy();
        this.titleObj = undefined;
        this.playBeat(0);
      },
    });
  }

  private playBeat(idx: number) {
    if (this.skipping) return;
    if (idx >= this.ending.beats.length) {
      this.playFinalLine();
      return;
    }
    const beat = this.ending.beats[idx];
    const tint = MOOD_TINT[beat.mood ?? "neutral"];
    const hold = beat.hold ?? 4200;

    this.bodyObj = this.add
      .text(VIEW_W / 2, VIEW_H / 2, beat.text, {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "22px",
        color: tint,
        fontStyle: "italic 400",
        align: "center",
        wordWrap: { width: Math.min(960, VIEW_W - 200) },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0)
      .setLineSpacing(8);

    this.tweens.add({
      targets: this.bodyObj,
      alpha: { from: 0, to: 1 },
      duration: 1400,
      yoyo: true,
      hold,
      onComplete: () => {
        this.bodyObj?.destroy();
        this.bodyObj = undefined;
        // small breath between beats; not too long or the silence drags
        this.time.delayedCall(600, () => this.playBeat(idx + 1));
      },
    });
  }

  /**
   * The very last image: a single quiet line, held for a long time. Then
   * fade to black and return to Title. The text intentionally feels small
   * — like a credit-card receipt at the end of a dinner you can't taste.
   */
  private playFinalLine() {
    if (this.skipping) return;
    const line = this.add
      .text(VIEW_W / 2, VIEW_H / 2, "thank you for playing.", {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "16px",
        color: hex(PAL.inkDim),
        fontStyle: "italic 400",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0);
    this.tweens.add({
      targets: line,
      alpha: { from: 0, to: 0.9 },
      duration: 2400,
      yoyo: true,
      hold: 6400,
      onComplete: () => {
        this.cameras.main.fadeOut(2400, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start("Title");
        });
      },
    });
  }
}
