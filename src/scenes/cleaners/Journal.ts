/**
 * THE CLEANERS — Journal scene.
 *
 * The closest thing to a soul in this game. Persists across days even
 * though the character canonically dies each night. Read-only for now;
 * the THE BREAK ending will add a hold-J-during-wipe interaction that
 * lets the player write their own line during the memory wipe.
 *
 * Launched as an overlay scene from any day-room: the room is paused, the
 * journal slides over the top, ESC or J closes it.
 *
 * Design doc §7.7 / §12.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL, shade } from "../../palette";
import { GameState } from "../../state/gameState";

export class JournalScene extends Phaser.Scene {
  private keyJ!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private parentSceneKey: string | null = null;
  private scrollY = 0;
  private container!: Phaser.GameObjects.Container;
  private maskGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "Journal" });
  }

  create() {
    // remember who launched us — we'll resume them on close
    const launched = this.scene.manager.getScenes(true).filter((s) => s !== this);
    this.parentSceneKey = launched[0]?.scene.key ?? null;

    // ---- backdrop wash so the world fades out --------------------
    this.add
      .rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x000000, 0.78)
      .setScrollFactor(0);

    // ---- the notebook page -------------------------------------
    const pageW = Math.min(820, VIEW_W - 120);
    const pageH = VIEW_H - 120;
    const pageX = VIEW_W / 2 - pageW / 2;
    const pageY = 60;

    const page = this.add.graphics().setScrollFactor(0);
    page.fillStyle(0x000000, 0.55);
    page.fillRoundedRect(pageX + 6, pageY + 10, pageW, pageH, 14);
    page.fillStyle(0x1a130c, 1);
    page.fillRoundedRect(pageX, pageY, pageW, pageH, 12);
    page.lineStyle(2, shade(PAL.woodHi, -0.2), 0.85);
    page.strokeRoundedRect(pageX, pageY, pageW, pageH, 12);
    page.fillStyle(shade(PAL.thatchHi, -0.05), 1);
    page.fillRoundedRect(pageX + 14, pageY + 14, pageW - 28, pageH - 28, 8);
    // a faint margin line
    page.lineStyle(1, PAL.heart, 0.5);
    page.lineBetween(pageX + 60, pageY + 24, pageX + 60, pageY + pageH - 24);
    // ruled lines for atmosphere — they sit behind the text
    page.lineStyle(1, shade(PAL.thatch, -0.18), 0.35);
    for (let y = pageY + 70; y < pageY + pageH - 30; y += 26)
      page.lineBetween(pageX + 30, y, pageX + pageW - 30, y);

    this.add
      .text(pageX + pageW / 2, pageY + 36, "JOURNAL", {
        fontFamily: '"Cinzel", "Times New Roman", serif',
        fontSize: "22px",
        color: hex(PAL.heartDark),
        fontStyle: "800",
      })
      .setOrigin(0.5)
      .setLetterSpacing(6)
      .setScrollFactor(0);

    this.add
      .text(pageX + pageW - 22, pageY + 24, `Day ${GameState.state.dayIndex}`, {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "14px",
        color: hex(PAL.inkDim),
        fontStyle: "italic 400",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    // ---- entries (scrollable container) --------------------------
    const listX = pageX + 70;
    const listY = pageY + 70;
    const listW = pageW - 100;
    const listH = pageH - 100;

    this.container = this.add.container(listX, listY).setScrollFactor(0);
    this.container.setData("baseY", listY);
    // mask
    this.maskGfx = this.add.graphics().setScrollFactor(0).setVisible(false);
    this.maskGfx.fillStyle(0xffffff, 1);
    this.maskGfx.fillRect(listX, listY, listW, listH);
    this.container.setMask(new Phaser.Display.Masks.GeometryMask(this, this.maskGfx));

    const entries = [...GameState.state.journalEntries].sort((a, b) => a.ts - b.ts);
    if (entries.length === 0) {
      this.container.add(
        this.add.text(0, 0, "the page is empty.", {
          fontFamily: '"Spectral", Georgia, serif',
          fontSize: "16px",
          color: hex(PAL.inkDim),
          fontStyle: "italic 400",
        }),
      );
    } else {
      let y = 0;
      let currentDay = -1;
      for (const e of entries) {
        if (e.day !== currentDay) {
          currentDay = e.day;
          const head = this.add.text(0, y, `— Day ${e.day} —`, {
            fontFamily: '"Cinzel", "Times New Roman", serif',
            fontSize: "13px",
            color: hex(PAL.emberDeep),
            fontStyle: "600",
          });
          head.setLetterSpacing(3);
          this.container.add(head);
          y += 26;
        }
        const txt = this.add.text(20, y, "•  " + e.text, {
          fontFamily: '"Spectral", Georgia, serif',
          fontSize: "15px",
          color: hex(PAL.heartDark),
          fontStyle: "italic 400",
          wordWrap: { width: listW - 24 },
        });
        this.container.add(txt);
        y += txt.height + 14;
      }
    }

    // ---- footer hints --------------------------------------------
    const hint = `${GameState.state.fragmentsFound.length} fragment${GameState.state.fragmentsFound.length === 1 ? "" : "s"} surfaced   ·   J / ESC to close   ·   ↑↓ to scroll`;
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

    // ---- input ---------------------------------------------------
    this.keyJ = this.input.keyboard!.addKey("J");
    this.keyEsc = this.input.keyboard!.addKey("ESC");
    this.input.keyboard!.on("keydown", (ev: KeyboardEvent) => {
      if (ev.key === "Escape" || ev.key === "j" || ev.key === "J") this.close();
    });
    // wheel scroll
    this.input.on("wheel", (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.6, -2000, 0);
      this.container.setY(listY + this.scrollY);
    });

    this.cameras.main.fadeIn(180, 0, 0, 0);
  }

  private close() {
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.parentSceneKey) this.scene.resume(this.parentSceneKey);
      this.scene.stop();
    });
  }

  update() {
    // arrow / WASD scroll. The container's "baseY" was stamped in create().
    const up = this.input.keyboard!.addKey("UP").isDown || this.input.keyboard!.addKey("W").isDown;
    const dn = this.input.keyboard!.addKey("DOWN").isDown || this.input.keyboard!.addKey("S").isDown;
    if (up) this.scrollY = Math.min(0, this.scrollY + 4);
    if (dn) this.scrollY = Math.max(-2000, this.scrollY - 4);
    if (up || dn) {
      const baseY = (this.container.getData("baseY") as number) ?? 0;
      this.container.setY(baseY + this.scrollY);
    }
    // suppress unused-warnings
    void this.keyJ;
    void this.keyEsc;
  }
}
