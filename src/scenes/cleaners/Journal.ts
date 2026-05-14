/**
 * THE CLEANERS — the journal overlay.
 *
 * The closest thing to a soul in this game. Persists across days even
 * though the character canonically dies each night. Read-only for now;
 * the THE BREAK ending will add the hold-J-during-wipe interaction that
 * lets the player write their own line over the memory wipe.
 *
 * Launched via `openJournal(scene)` from any room. The room is paused,
 * the journal renders an oversize parchment page on top, and ESC or J
 * closes it — at which point the original room is resumed.
 *
 * Design doc §7.7 / §12.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL, shade } from "../../palette";
import { GameState } from "../../state/gameState";
import { dayName } from "../../cleaners/dayObjectives";

export class JournalScene extends Phaser.Scene {
  /** The scene key that asked us to open. We resume it on close. */
  private parentSceneKey: string | null = null;
  /** Container holding every entry — we shift its y to scroll. */
  private container!: Phaser.GameObjects.Container;
  /** The mask rectangle so entries don't bleed past the page edges. */
  private maskGfx!: Phaser.GameObjects.Graphics;
  /** Current scroll offset; 0 is top, negative is scrolled down. */
  private scrollY = 0;
  /** Scrollable area max negative scroll, set after entries render. */
  private maxScroll = 0;
  /** Cached scroll keys so update() doesn't allocate every frame. */
  private kUp!: Phaser.Input.Keyboard.Key;
  private kDown!: Phaser.Input.Keyboard.Key;
  private kW!: Phaser.Input.Keyboard.Key;
  private kS!: Phaser.Input.Keyboard.Key;
  /** Y position of the visible top of the entries area; cached for scroll. */
  private listY = 0;

  constructor() {
    super({ key: "Journal" });
  }

  init(data: { from?: string } = {}) {
    this.parentSceneKey = data.from ?? null;
    this.scrollY = 0;
    this.maxScroll = 0;
  }

  create() {
    // ---- backdrop wash so the room behind us fades --------------------
    this.add
      .rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x000000, 0.78)
      .setScrollFactor(0);

    // ---- the notebook page itself -------------------------------------
    const pageW = Math.min(820, VIEW_W - 120);
    const pageH = VIEW_H - 100;
    const pageX = VIEW_W / 2 - pageW / 2;
    const pageY = 50;

    const page = this.add.graphics().setScrollFactor(0);
    // drop shadow
    page.fillStyle(0x000000, 0.55);
    page.fillRoundedRect(pageX + 6, pageY + 10, pageW, pageH, 14);
    // dark frame
    page.fillStyle(0x1a130c, 1);
    page.fillRoundedRect(pageX, pageY, pageW, pageH, 12);
    page.lineStyle(2, shade(PAL.woodHi, -0.2), 0.85);
    page.strokeRoundedRect(pageX, pageY, pageW, pageH, 12);
    // parchment inner
    page.fillStyle(shade(PAL.thatchHi, -0.05), 1);
    page.fillRoundedRect(pageX + 14, pageY + 14, pageW - 28, pageH - 28, 8);
    // margin line
    page.lineStyle(1, PAL.heart, 0.5);
    page.lineBetween(pageX + 60, pageY + 24, pageX + 60, pageY + pageH - 24);
    // ruled lines for atmosphere
    page.lineStyle(1, shade(PAL.thatch, -0.18), 0.32);
    for (let y = pageY + 84; y < pageY + pageH - 30; y += 26)
      page.lineBetween(pageX + 30, y, pageX + pageW - 30, y);

    // ---- header (title + current day) ---------------------------------
    this.add
      .text(pageX + pageW / 2, pageY + 36, "JOURNAL", {
        fontFamily: '"Cinzel", "Times New Roman", serif',
        fontSize: "24px",
        color: hex(PAL.heartDark),
        fontStyle: "800",
      })
      .setOrigin(0.5)
      .setLetterSpacing(8)
      .setScrollFactor(0);

    this.add
      .text(pageX + pageW - 24, pageY + 22, `Day ${GameState.state.dayIndex}  ·  ${dayName(GameState.state.dayIndex)}`, {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "13px",
        color: hex(PAL.inkDim),
        fontStyle: "italic 400",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    // a thin warm rule beneath the title
    const rule = this.add.graphics().setScrollFactor(0);
    rule.lineStyle(1, PAL.heartDark, 0.6);
    rule.lineBetween(pageX + 60, pageY + 64, pageX + pageW - 30, pageY + 64);
    rule.fillStyle(PAL.emberSoft, 0.9);
    rule.fillTriangle(pageX + 60, pageY + 64, pageX + 56, pageY + 60, pageX + 56, pageY + 68);

    // ---- the entries area --------------------------------------------
    const listX = pageX + 70;
    const listY = pageY + 78;
    const listW = pageW - 100;
    const listH = pageH - 130;
    this.listY = listY;

    this.container = this.add.container(listX, listY).setScrollFactor(0);
    this.maskGfx = this.add.graphics().setScrollFactor(0).setVisible(false);
    this.maskGfx.fillStyle(0xffffff, 1);
    this.maskGfx.fillRect(listX - 4, listY, listW + 8, listH);
    this.container.setMask(new Phaser.Display.Masks.GeometryMask(this, this.maskGfx));

    const entries = [...GameState.state.journalEntries].sort((a, b) => a.ts - b.ts);
    let totalY = 0;
    if (entries.length === 0) {
      const empty = this.add.text(
        0, 8,
        "the page is empty. interact with what you find — press E on what looks wrong — and you will write here.",
        {
          fontFamily: '"Spectral", Georgia, serif',
          fontSize: "15px",
          color: hex(PAL.inkDim),
          fontStyle: "italic 400",
          wordWrap: { width: listW - 24 },
        },
      );
      this.container.add(empty);
      totalY = empty.height + 8;
    } else {
      let currentDay = -1;
      for (const e of entries) {
        if (e.day !== currentDay) {
          currentDay = e.day;
          // Day separator: rule + Cinzel label
          const sep = this.add.graphics();
          sep.lineStyle(1, shade(PAL.heart, -0.1), 0.45);
          sep.lineBetween(0, totalY + 8, listW - 24, totalY + 8);
          this.container.add(sep);
          const head = this.add
            .text(0, totalY + 14, `Day ${e.day}  ·  ${dayName(e.day)}`, {
              fontFamily: '"Cinzel", "Times New Roman", serif',
              fontSize: "12px",
              color: hex(PAL.emberDeep),
              fontStyle: "800",
            })
            .setLetterSpacing(4);
          this.container.add(head);
          totalY += 38;
        }
        // entry text — italic Spectral, mauve ink, ample line spacing
        const txt = this.add.text(20, totalY, "•  " + e.text, {
          fontFamily: '"Spectral", Georgia, serif',
          fontSize: "15px",
          color: hex(PAL.heartDark),
          fontStyle: "italic 400",
          wordWrap: { width: listW - 44 },
        });
        txt.setLineSpacing(4);
        this.container.add(txt);
        totalY += txt.height + 16;
      }
    }

    // store the clamp for scrolling
    this.maxScroll = Math.max(0, totalY - listH);

    // ---- footer (controls) -------------------------------------------
    const n = GameState.state.fragmentsFound.length;
    const hint = `${n}  fragment${n === 1 ? "" : "s"}  surfaced     ·     J / ESC to close     ·     ↑ ↓ / mouse-wheel to scroll`;
    this.add
      .text(pageX + pageW / 2, pageY + pageH - 22, hint, {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "11px",
        color: hex(PAL.inkFaint),
        fontStyle: "italic 400",
      })
      .setOrigin(0.5)
      .setLetterSpacing(1.5)
      .setScrollFactor(0);

    // ---- input ------------------------------------------------------
    // We use a one-shot keydown listener so the journal doesn't close on
    // the SAME J press that opened it (Phaser's keyboard plugin queues
    // events; we wait one tick before accepting input).
    this.kUp = this.input.keyboard!.addKey("UP");
    this.kDown = this.input.keyboard!.addKey("DOWN");
    this.kW = this.input.keyboard!.addKey("W");
    this.kS = this.input.keyboard!.addKey("S");
    this.time.delayedCall(180, () => {
      this.input.keyboard!.on("keydown", (ev: KeyboardEvent) => {
        if (ev.key === "Escape" || ev.key === "j" || ev.key === "J") this.close();
      });
    });
    this.input.on("wheel", (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      this.scrollBy(dy * 0.6);
    });

    this.cameras.main.fadeIn(180, 0, 0, 0);
  }

  /** Adjust scroll by `delta` and clamp. */
  private scrollBy(delta: number) {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, -this.maxScroll, 0);
    this.container.setY(this.listY + this.scrollY);
  }

  private close() {
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Resume the room that paused itself to open us. The Hud / pipeline
      // stay running independently — they were never paused.
      if (this.parentSceneKey) {
        const target = this.scene.manager.getScene(this.parentSceneKey);
        if (target && target.scene.isPaused()) this.scene.resume(this.parentSceneKey);
      }
      this.scene.stop();
    });
  }

  update() {
    // keyboard scroll. Cached keys = no per-frame allocation.
    if (this.kUp.isDown || this.kW.isDown) this.scrollBy(6);
    if (this.kDown.isDown || this.kS.isDown) this.scrollBy(-6);
  }
}
