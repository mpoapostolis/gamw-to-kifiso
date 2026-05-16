/**
 * ΑΚΟΜΑ ΕΓΩ — the story engine.
 *
 * One scene plays one chapter. It builds the chapter's tableau (the living
 * picture), then walks its beats: title cards fade, lines type out and wait
 * for a click, choices show buttons. At the end of a chapter it restarts
 * itself with the next chapter index. After the sixth, it lets the screen
 * go quietly to black and returns to the title.
 *
 * No HUD, no inventory, no combat. The whole game is: words, a picture
 * that breathes, the click of the mouse, and the cold creeping in.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL } from "../../palette";
import { Audio } from "../../audio";
import { applyPostFX, setColdShift, type CleanersFXPipeline } from "../../fx/postProcess";
import { CHAPTERS, type Beat, type Chapter } from "../../still/story";
import type { TableauHandle } from "../../still/tableau";
import { getTableau } from "./tableaux/index";

const SPECTRAL = '"Spectral", Georgia, serif';
// Chapter title cards are Greek — Cinzel has no Greek glyphs, so the
// title face is a Greek-capable serif stack.
const TITLE_FONT = '"Spectral", "Times New Roman", serif';

/** Per-tone text colour. */
const TONE_COLOR: Record<string, number> = {
  normal: PAL.thatchHi,
  inner: PAL.gloomGlow,
  reader: PAL.emberHot,
};
/** Per-tone typewriter speed — ms per character. Reader is the slowest. */
const TONE_SPEED: Record<string, number> = {
  normal: 34,
  inner: 42,
  reader: 64,
};

export class StoryScene extends Phaser.Scene {
  private chapterIndex = 0;
  private chapter!: Chapter;
  private tableau: TableauHandle | null = null;
  private fx: CleanersFXPipeline | null = null;

  private beatIndex = -1;
  /** the text object for the current line */
  private lineText!: Phaser.GameObjects.Text;
  /** dark band behind the text for legibility */
  private band!: Phaser.GameObjects.Graphics;
  /** "click to continue" chevron */
  private cont!: Phaser.GameObjects.Text;

  // typewriter state
  private fullLine = "";
  private shown = 0;
  private typeEvent?: Phaser.Time.TimerEvent;
  private typing = false;

  // choice state
  private choiceObjs: Phaser.GameObjects.Text[] = [];
  private awaitingChoice = false;
  private busy = false; // true during title cards / fades, swallows input
  /** scene-time until which advance input is ignored (debounces the click
   *  that picked a choice from also skipping the reply's typewriter). */
  private inputLockUntil = 0;

  constructor() {
    super("Story");
  }

  init(data: { chapter?: number } = {}) {
    this.chapterIndex = data.chapter ?? 0;
    this.beatIndex = -1;
    this.busy = false;
    this.typing = false;
    this.awaitingChoice = false;
    this.choiceObjs = [];
    this.tableau = null;
  }

  create() {
    this.chapter = CHAPTERS[this.chapterIndex] ?? CHAPTERS[0];
    this.cameras.main.setBackgroundColor("#05050a");

    // ---- the tableau (living picture behind the words) ---------------
    const builder = getTableau(this.chapter.tableau);
    this.tableau = builder ? builder(this, this.chapter.chill) : null;

    // ---- post-FX: the world cools as the story goes ------------------
    this.fx = applyPostFX(this);
    if (this.fx) setColdShift(this.fx, this.chapter.chill);

    // ---- ambient bed -------------------------------------------------
    if (this.chapter.ambient) Audio.playMusic(this, this.chapter.ambient, 2200);
    else Audio.stopMusic(this);

    // ---- the text band (a soft dark gradient so words always read) ---
    this.band = this.add.graphics().setScrollFactor(0).setDepth(9000);
    this.band.fillStyle(0x05050a, 0.0);
    this.band.fillStyle(0x05050a, 0.62);
    this.band.fillRect(0, VIEW_H - 250, VIEW_W, 250);
    this.band.fillStyle(0x05050a, 0.32);
    this.band.fillRect(0, VIEW_H - 300, VIEW_W, 50);

    // ---- the line itself ---------------------------------------------
    this.lineText = this.add
      .text(VIEW_W / 2, VIEW_H - 150, "", {
        fontFamily: SPECTRAL,
        fontSize: "23px",
        color: hex(PAL.thatchHi),
        fontStyle: "italic 400",
        align: "center",
        wordWrap: { width: 900 },
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(9010)
      .setScrollFactor(0);

    // ---- the "continue" chevron --------------------------------------
    this.cont = this.add
      .text(VIEW_W / 2, VIEW_H - 54, "▾", {
        fontFamily: SPECTRAL,
        fontSize: "20px",
        color: hex(PAL.inkFaint),
      })
      .setOrigin(0.5)
      .setDepth(9010)
      .setScrollFactor(0)
      .setVisible(false);
    this.tweens.add({
      targets: this.cont,
      y: VIEW_H - 48,
      alpha: { from: 0.4, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.easeInOut",
    });

    // ---- input: click / SPACE / ENTER advances -----------------------
    this.input.on("pointerdown", () => this.onAdvance());
    this.input.keyboard?.on("keydown-SPACE", () => this.onAdvance());
    this.input.keyboard?.on("keydown-ENTER", () => this.onAdvance());

    // ---- cleanup on the way out --------------------------------------
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.typeEvent?.remove(false);
      this.tableau?.destroy?.();
    });

    this.cameras.main.fadeIn(this.chapterIndex === 0 ? 2000 : 1200, 5, 5, 10);
    // a breath before the first beat
    this.time.delayedCall(this.chapterIndex === 0 ? 1600 : 900, () => this.nextBeat());
  }

  update(time: number, delta: number) {
    this.tableau?.update?.(time, delta);
  }

  /* ================================================================= *
   * BEAT FLOW                                                         *
   * ================================================================= */

  private nextBeat() {
    this.beatIndex++;
    if (this.beatIndex >= this.chapter.beats.length) {
      this.endChapter();
      return;
    }
    const beat = this.chapter.beats[this.beatIndex];
    if (beat.kind === "title") this.playTitle(beat);
    else if (beat.kind === "line") this.playLine(beat.text, beat.tone ?? "normal");
    else if (beat.kind === "choice") this.playChoice(beat);
  }

  /** A chapter title card — large, centred, fades in and out. */
  private playTitle(beat: Extract<Beat, { kind: "title" }>) {
    this.busy = true;
    this.cont.setVisible(false);
    this.lineText.setText("");

    const main = this.add
      .text(VIEW_W / 2, VIEW_H / 2 - (beat.sub ? 16 : 0), beat.text, {
        fontFamily: TITLE_FONT,
        fontSize: beat.text.length > 6 ? "46px" : "32px",
        color: hex(PAL.thatchHi),
        fontStyle: "600",
      })
      .setOrigin(0.5)
      .setDepth(9020)
      .setScrollFactor(0)
      .setAlpha(0)
      .setLetterSpacing(beat.text.length > 6 ? 14 : 8);

    const sub = beat.sub
      ? this.add
          .text(VIEW_W / 2, VIEW_H / 2 + 30, beat.sub, {
            fontFamily: SPECTRAL,
            fontSize: "18px",
            color: hex(PAL.inkDim),
            fontStyle: "italic 400",
          })
          .setOrigin(0.5)
          .setDepth(9020)
          .setScrollFactor(0)
          .setAlpha(0)
          .setLetterSpacing(4)
      : null;

    const objs: Phaser.GameObjects.Text[] = sub ? [main, sub] : [main];
    this.tweens.add({
      targets: objs,
      alpha: 1,
      duration: 1400,
      hold: 2000,
      yoyo: true,
      onComplete: () => {
        objs.forEach((o) => o.destroy());
        this.busy = false;
        this.nextBeat();
      },
    });
  }

  /** A line of narration. Types out, then waits for a click. */
  private playLine(text: string, tone: string) {
    this.busy = false;
    this.awaitingChoice = false;
    this.cont.setVisible(false);
    this.fullLine = text;
    this.shown = 0;
    this.typing = true;
    this.lineText.setColor(hex(TONE_COLOR[tone] ?? PAL.thatchHi));
    this.lineText.setText("");
    // reader-tone lines sit a little higher and brighter — they are the
    // ones spoken straight at the player.
    this.lineText.setY(tone === "reader" ? VIEW_H - 180 : VIEW_H - 150);
    this.lineText.setFontSize(tone === "reader" ? 25 : 23);

    const speed = TONE_SPEED[tone] ?? 34;
    this.typeEvent?.remove(false);
    this.typeEvent = this.time.addEvent({
      delay: speed,
      loop: true,
      callback: () => {
        this.shown++;
        this.lineText.setText(this.fullLine.slice(0, this.shown));
        if (this.shown >= this.fullLine.length) {
          this.typeEvent?.remove(false);
          this.typing = false;
          this.cont.setVisible(true);
        }
      },
    });
  }

  /** A branch. All options converge — they only change one reply line. */
  private playChoice(beat: Extract<Beat, { kind: "choice" }>) {
    this.busy = false;
    this.typing = false;
    this.awaitingChoice = true;
    this.cont.setVisible(false);
    this.lineText.setText("");

    const startY = VIEW_H - 196;
    beat.options.forEach((opt, i) => {
      const btn = this.add
        .text(VIEW_W / 2, startY + i * 44, opt.label, {
          fontFamily: SPECTRAL,
          fontSize: "20px",
          color: hex(PAL.inkDim),
          fontStyle: "italic 400",
          backgroundColor: "rgba(8, 8, 14, 0.55)",
          padding: { left: 18, right: 18, top: 7, bottom: 7 },
        })
        .setOrigin(0.5)
        .setDepth(9030)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      btn.on("pointerover", () => btn.setColor(hex(PAL.emberHot)));
      btn.on("pointerout", () => btn.setColor(hex(PAL.inkDim)));
      btn.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.pickChoice(opt.reply);
      });
      this.choiceObjs.push(btn);
    });
  }

  private pickChoice(reply: string) {
    if (!this.awaitingChoice) return;
    this.awaitingChoice = false;
    this.choiceObjs.forEach((o) => o.destroy());
    this.choiceObjs = [];
    // Swallow advance input for a third of a second — the very click that
    // picked the option must not also skip the reply's typewriter.
    this.inputLockUntil = this.time.now + 320;
    // the reply prints like an ordinary line; advancing past it continues
    this.playLine(reply, "normal");
  }

  /* ================================================================= *
   * INPUT                                                             *
   * ================================================================= */

  private onAdvance() {
    if (this.busy || this.awaitingChoice) return;
    if (this.time.now < this.inputLockUntil) return;
    if (this.typing) {
      // first click: finish the line instantly
      this.typeEvent?.remove(false);
      this.shown = this.fullLine.length;
      this.lineText.setText(this.fullLine);
      this.typing = false;
      this.cont.setVisible(true);
      return;
    }
    // line is fully shown — move on
    this.cont.setVisible(false);
    this.nextBeat();
  }

  /* ================================================================= *
   * CHAPTER TRANSITIONS                                               *
   * ================================================================= */

  private endChapter() {
    this.busy = true;
    this.cont.setVisible(false);
    const isLast = this.chapterIndex >= CHAPTERS.length - 1;

    if (isLast) {
      // The end. A long, slow fall into black, then a held silence, then
      // the title screen. No credits crawl — the last line was the credit.
      this.cameras.main.fadeOut(6000, 5, 5, 10);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.time.delayedCall(4000, () => this.scene.start("Title"));
      });
      return;
    }

    // Between chapters: a slower, gentler fade than a normal cut.
    this.cameras.main.fadeOut(1600, 5, 5, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ chapter: this.chapterIndex + 1 });
    });
  }
}
