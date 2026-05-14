/**
 * UI — the HUD (hearts, coin, quest), floating prompts & toasts, the dialogue
 * box with its typewriter, full-screen story cards, the wake-from-death screen,
 * and a pause panel. Runs as its own scene over the world.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../consts";
import { hex, PAL } from "../palette";
import { SFX } from "../sfx";
import { ITEMS, NOTES } from "../story";
import type { DialogPage, GameCtx } from "../types";
import { activeQuest } from "../quests";
import type { GameScene } from "./Game";

const SPECTRAL = '"Spectral", Georgia, serif';
const CINZEL = '"Cinzel", "Times New Roman", serif';

/** A rounded panel with border + a faint warm inner light, drawn into a Graphics. */
function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, accent: number = PAL.panelEdge) {
  g.clear();
  g.fillStyle(PAL.shadow, 0.45);
  g.fillRoundedRect(x + 3, y + 5, w, h, 12);
  g.fillStyle(PAL.panel, 0.96);
  g.fillRoundedRect(x, y, w, h, 12);
  g.fillStyle(PAL.panelHi, 0.5);
  g.fillRoundedRect(x + 2, y + 2, w - 4, 14, 10);
  g.lineStyle(2, accent, 1);
  g.strokeRoundedRect(x, y, w, h, 12);
  g.lineStyle(1, PAL.panelEdgeHi, 0.4);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 10);
}

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private ctx!: GameCtx;

  // HUD
  private heartIcons: Phaser.GameObjects.Image[] = [];
  private hudGold!: Phaser.GameObjects.Text;
  private hudKills!: Phaser.GameObjects.Text;
  private hudKillIcon!: Phaser.GameObjects.Image;
  private hudClock!: Phaser.GameObjects.Text;
  private hudDay!: Phaser.GameObjects.Text;
  private hudQuestTitle!: Phaser.GameObjects.Text;
  private hudQuestHint!: Phaser.GameObjects.Text;
  private hudQuestG!: Phaser.GameObjects.Graphics;
  private minimapG!: Phaser.GameObjects.Graphics;

  // banner / prompt / toasts
  private banner!: Phaser.GameObjects.Text;
  private bannerLine!: Phaser.GameObjects.Graphics;
  private promptG!: Phaser.GameObjects.Graphics;
  private promptT!: Phaser.GameObjects.Text;
  private promptVisible = false;
  private toasts: Phaser.GameObjects.Container[] = [];

  // dialog
  private dlgRoot!: Phaser.GameObjects.Container;
  private dlgPanel!: Phaser.GameObjects.Graphics;
  private dlgPortraitBg!: Phaser.GameObjects.Image;
  private dlgPortrait!: Phaser.GameObjects.Image;
  private dlgName!: Phaser.GameObjects.Text;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgHint!: Phaser.GameObjects.Text;
  private dlgPages: DialogPage[] = [];
  private dlgIdx = 0;
  private dlgOnDone: (() => void) | null = null;
  private typer?: Phaser.Time.TimerEvent;
  private typing = false;
  private fullLine = "";

  // story cards
  private storyRoot!: Phaser.GameObjects.Container;
  private storyDim!: Phaser.GameObjects.Rectangle;
  private storyTitle!: Phaser.GameObjects.Text;
  private storyBody!: Phaser.GameObjects.Text;
  private storyHint!: Phaser.GameObjects.Text;
  private storyLines: string[] = [];
  private storyIdx = 0;
  private storyOnDone: (() => void) | null = null;
  private storyBusy = false;

  // death
  private deathRoot!: Phaser.GameObjects.Container;
  private deathOnWake: (() => void) | null = null;

  // pause
  private pauseRoot!: Phaser.GameObjects.Container;
  paused = false;

  // notebook
  private notebookRoot!: Phaser.GameObjects.Container;
  private notebookList!: Phaser.GameObjects.Text;
  notebookOpen = false;
  private noteCount = 0;

  // pocket / inventory
  private inventoryRoot!: Phaser.GameObjects.Container;
  private inventoryList!: Phaser.GameObjects.Text;
  inventoryOpen = false;

  constructor() {
    super("UI");
  }

  create() {
    this.gameScene = this.scene.get("Game") as unknown as GameScene;
    this.ctx = this.gameScene.ctx;

    // ----- HUD ----------------------------------------------------------
    // hearts
    this.rebuildHearts();
    // memories counter (right side)
    const coinBg = this.add.graphics().setDepth(20);
    drawPanel(coinBg, VIEW_W - 200, 14, 186, 56, PAL.panelEdgeHi);
    this.add.image(VIEW_W - 200 + 28, 14 + 22, "ui_coin").setDepth(21).setScale(0.95);
    this.hudGold = this.add
      .text(VIEW_W - 200 + 50, 14 + 22, "0", { fontFamily: CINZEL, fontSize: "22px", color: hex(PAL.ink), fontStyle: "600" })
      .setOrigin(0, 0.5)
      .setDepth(21);
    this.add
      .text(VIEW_W - 200 + 50, 14 + 44, "memories", { fontFamily: SPECTRAL, fontSize: "11px", color: hex(PAL.inkDim), fontStyle: "italic 400" })
      .setOrigin(0, 0.5)
      .setDepth(21)
      .setLetterSpacing(1.5);

    // active quest panel (under memories)
    this.hudQuestG = this.add.graphics().setDepth(20);
    drawPanel(this.hudQuestG, VIEW_W - 320, 82, 306, 70, PAL.panelEdge);
    this.add
      .text(VIEW_W - 320 + 14, 82 + 10, "CURRENT", { fontFamily: CINZEL, fontSize: "11px", color: hex(PAL.emberSoft), fontStyle: "600" })
      .setLetterSpacing(3)
      .setDepth(21);
    this.hudQuestTitle = this.add
      .text(VIEW_W - 320 + 14, 82 + 26, "—", { fontFamily: SPECTRAL, fontSize: "15px", color: hex(PAL.ink), fontStyle: "600" })
      .setDepth(21);
    this.hudQuestHint = this.add
      .text(VIEW_W - 320 + 14, 82 + 46, "", { fontFamily: SPECTRAL, fontSize: "12px", color: hex(PAL.inkDim), fontStyle: "italic 400", wordWrap: { width: 286 } })
      .setDepth(21);

    // mini-map (small circular radar in the upper-right corner)
    this.minimapG = this.add.graphics().setDepth(20);
    this.minimapG.setPosition(VIEW_W - 86, VIEW_H - 86);
    // quest / kills
    const killBg = this.add.graphics().setDepth(20);
    drawPanel(killBg, 16, 70, 196, 38, PAL.panelEdge);
    this.hudKillIcon = this.add.image(16 + 22, 70 + 19, "ui_sigil").setDepth(21).setScale(0.8);
    this.hudKills = this.add
      .text(16 + 40, 70 + 19, "TAB  ·  0 notes", { fontFamily: SPECTRAL, fontSize: "14px", color: hex(PAL.inkDim), fontStyle: "500" })
      .setOrigin(0, 0.5)
      .setDepth(21);

    // ----- clock (top-centre) ------------------------------------------
    const clockBg = this.add.graphics().setDepth(20);
    drawPanel(clockBg, VIEW_W / 2 - 110, 14, 220, 56, PAL.panelEdgeHi);
    this.hudClock = this.add
      .text(VIEW_W / 2, 14 + 22, "07:00", { fontFamily: CINZEL, fontSize: "26px", color: hex(PAL.ink), fontStyle: "800" })
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setDepth(21);
    this.hudDay = this.add
      .text(VIEW_W / 2, 14 + 46, "Day 1", { fontFamily: SPECTRAL, fontSize: "13px", color: hex(PAL.inkDim), fontStyle: "italic 400" })
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setDepth(21);

    // ----- banner -------------------------------------------------------
    this.bannerLine = this.add.graphics().setDepth(15).setScrollFactor(0);
    this.banner = this.add
      .text(VIEW_W / 2, 96, "", { fontFamily: CINZEL, fontSize: "34px", color: hex(PAL.ink), fontStyle: "600" })
      .setOrigin(0.5)
      .setLetterSpacing(8)
      .setShadow(0, 3, "rgba(0,0,0,0.6)", 6)
      .setDepth(16)
      .setAlpha(0);

    // ----- prompt -------------------------------------------------------
    this.promptG = this.add.graphics().setDepth(25);
    this.promptT = this.add
      .text(0, 0, "", { fontFamily: SPECTRAL, fontSize: "16px", color: hex(PAL.ink), fontStyle: "600" })
      .setOrigin(0.5)
      .setDepth(26)
      .setAlpha(0);
    this.promptG.setAlpha(0);

    // ----- dialog -------------------------------------------------------
    this.buildDialog();
    // ----- story cards --------------------------------------------------
    this.buildStory();
    // ----- death --------------------------------------------------------
    this.buildDeath();
    // ----- pause --------------------------------------------------------
    this.buildPause();
    // ----- notebook -----------------------------------------------------
    this.buildNotebook();
    // ----- inventory ----------------------------------------------------
    this.buildInventory();

    // advance handlers (shared by dialog & story & death) + pause toggle
    const advance = () => this.onAdvance();
    this.input.keyboard?.on("keydown-SPACE", advance);
    this.input.keyboard?.on("keydown-ENTER", advance);
    this.input.keyboard?.on("keydown-E", advance);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, advance);
    // ESC: pause · TAB: notebook · I: pocket · raw event survives GameScene pause.
    this.input.keyboard?.on("keydown", (ev: KeyboardEvent) => {
      SFX.unlock();
      const idle = !this.deathRoot.visible && !this.storyRoot.visible && !this.dlgRoot.visible;
      if (ev.key === "Escape" || ev.code === "Escape") {
        if (idle && !this.notebookOpen && !this.inventoryOpen) {
          this.togglePause();
          ev.preventDefault?.();
        }
      } else if (ev.key === "Tab" || ev.code === "Tab") {
        if (idle && !this.paused && !this.inventoryOpen) {
          this.toggleNotebook();
          ev.preventDefault?.();
        }
      } else if (ev.key === "i" || ev.key === "I" || ev.code === "KeyI") {
        if (idle && !this.paused && !this.notebookOpen) {
          this.toggleInventory();
          ev.preventDefault?.();
        }
      }
    });

    // initial HUD values from ctx
    this.setHearts(this.ctx.hp, this.ctx.maxHp);
    this.setGold(this.ctx.gold);
    this.setKills(this.ctx.gloomKilled);

    // kick off the prologue once we exist
    if (this.gameScene.pendingPrologue) this.gameScene.startPrologue();
  }

  /**
   * Self-poll the active quest each frame, so the panel stays current no
   * matter which scene the player is actually in. (Without this the HUD only
   * refreshed inside Game.update — interior scenes left the panel stale.)
   */
  update() {
    if (!this.ctx || !this.hudQuestTitle) return;
    const q = activeQuest(this.ctx);
    const title = q ? q.title : "—";
    const hint = q ? (q.dynamicHint ? q.dynamicHint(this.ctx) : q.hint) : "";
    // setText is cheap if the value hasn't changed, but the explicit check
    // saves Phaser the BitmapData rebuild for the (very common) no-op frame.
    if (this.hudQuestTitle.text !== title) this.hudQuestTitle.setText(title);
    if (this.hudQuestHint.text !== hint) this.hudQuestHint.setText(hint);
  }

  /* ------------------------------------------------------------------ *
   * HUD                                                                *
   * ------------------------------------------------------------------ */
  private hudHeartsBg?: Phaser.GameObjects.Graphics;
  private rebuildHearts() {
    this.heartIcons.forEach((h) => h.destroy());
    this.heartIcons = [];
    const slots = Math.max(1, Math.ceil(this.ctx?.maxHp ? this.ctx.maxHp / 2 : 5));
    const pad = 12;
    const size = 30;
    const w = pad * 2 + slots * (size - 6) + 8;
    if (!this.hudHeartsBg) this.hudHeartsBg = this.add.graphics().setDepth(20);
    drawPanel(this.hudHeartsBg, 16, 14, Math.max(120, w), 42, PAL.hpRim);
    for (let i = 0; i < slots; i++) {
      this.heartIcons.push(this.add.image(16 + pad + 14 + i * (size - 6), 14 + 21, "ui_heart_full").setDepth(22));
    }
  }

  setHearts(hp: number, maxHp: number, grew = false) {
    if (this.heartIcons.length !== Math.ceil(maxHp / 2)) this.rebuildHearts();
    for (let i = 0; i < this.heartIcons.length; i++) {
      const full = hp >= (i + 1) * 2;
      const half = !full && hp === i * 2 + 1;
      this.heartIcons[i].setTexture(full ? "ui_heart_full" : half ? "ui_heart_half" : "ui_heart_empty");
    }
    if (grew) this.flashHearts();
  }

  flashHearts() {
    this.heartIcons.forEach((h, i) =>
      this.tweens.add({ targets: h, scale: { from: 1, to: 1.4 }, yoyo: true, duration: 180, delay: i * 40, ease: "Quad.easeOut" }),
    );
  }

  /** Re-pull HUD state from ctx (used after a memory wipe). */
  refreshAll() {
    if (!this.ctx) return;
    // rebuild notebook list from notes
    if (this.notebookList) {
      const lines: string[] = [];
      for (const id of Object.keys(this.ctx.notes)) {
        if (!this.ctx.notes[id]) continue;
        const line = NOTES[id] ?? id;
        lines.push("•  " + line);
      }
      this.noteCount = lines.length;
      this.notebookList.setText(lines.join("\n\n"));
      this.hudKills?.setText(`TAB  ·  ${this.noteCount} note${this.noteCount === 1 ? "" : "s"}`);
    }
    this.refreshInventory();
  }

  /** Update the active-quest HUD panel. Pass empty strings to clear. */
  setActiveQuest(title: string, hint: string) {
    if (!this.hudQuestTitle) return;
    this.hudQuestTitle.setText(title || "—");
    this.hudQuestHint.setText(hint || "");
  }

  /**
   * Repaint the radar in the bottom-right corner. Coords are world-space.
   * Doors are bright amber dots; NPCs are soft cream dots; the player is the
   * pulsing central marker. If `questTarget` is provided, a gold pulsing ring
   * is drawn around the matching spot (or, when the target falls outside the
   * radar, on the arc at the edge so it still points the right way).
   */
  setMinimap(
    px: number,
    py: number,
    worldW: number,
    worldH: number,
    doors: Array<{ x: number; y: number; open?: boolean }>,
    npcs: Array<{ x: number; y: number }>,
    questTarget?: { x: number; y: number } | null,
  ) {
    if (!this.minimapG) return;
    const r = 60;
    const cx = 0;
    const cy = 0;
    this.minimapG.clear();
    // backing disc
    this.minimapG.fillStyle(PAL.panel, 0.85);
    this.minimapG.fillCircle(cx, cy, r);
    this.minimapG.lineStyle(2, PAL.panelEdgeHi, 0.9);
    this.minimapG.strokeCircle(cx, cy, r);
    this.minimapG.lineStyle(1, PAL.panelEdge, 0.5);
    this.minimapG.strokeCircle(cx, cy, r - 6);
    // crosshair
    this.minimapG.lineStyle(1, PAL.inkFaint, 0.4);
    this.minimapG.lineBetween(cx - r + 8, cy, cx + r - 8, cy);
    this.minimapG.lineBetween(cx, cy - r + 8, cx, cy + r - 8);
    // scale: show roughly an 800×800 px area around the player
    const view = 900;
    const scale = (r - 6) / (view / 2);
    const project = (x: number, y: number): [number, number] | null => {
      const dx = (x - px) * scale;
      const dy = (y - py) * scale;
      if (Math.hypot(dx, dy) > r - 6) return null;
      return [cx + dx, cy + dy];
    };
    // NPCs first (back layer)
    this.minimapG.fillStyle(PAL.ink, 0.7);
    for (const n of npcs) {
      const p = project(n.x, n.y);
      if (!p) continue;
      this.minimapG.fillCircle(p[0], p[1], 2);
    }
    // doors
    for (const d of doors) {
      const p = project(d.x, d.y);
      if (!p) continue;
      const tint = d.open === false ? PAL.inkFaint : PAL.emberHot;
      this.minimapG.fillStyle(tint, d.open === false ? 0.55 : 1);
      this.minimapG.fillCircle(p[0], p[1], 3.5);
      this.minimapG.lineStyle(1, PAL.ember, 0.7);
      this.minimapG.strokeCircle(p[0], p[1], 5);
    }
    // quest target pulse — bright gold ring at the active objective. If the
    // target is off-radar, project it onto the edge so the ring still hints
    // at the right direction.
    if (questTarget) {
      let qx: number;
      let qy: number;
      const p = project(questTarget.x, questTarget.y);
      if (p) {
        qx = p[0];
        qy = p[1];
      } else {
        const dx = questTarget.x - px;
        const dy = questTarget.y - py;
        const a = Math.atan2(dy, dx);
        qx = cx + Math.cos(a) * (r - 8);
        qy = cy + Math.sin(a) * (r - 8);
      }
      const pulseQ = 0.6 + 0.4 * Math.sin(this.time.now * 0.006);
      this.minimapG.lineStyle(2, PAL.goldHi, 0.95 * pulseQ);
      this.minimapG.strokeCircle(qx, qy, 7 + 2 * pulseQ);
      this.minimapG.fillStyle(PAL.gold, 0.9);
      this.minimapG.fillCircle(qx, qy, 2.4);
    }
    // player pulse
    const pulse = 0.85 + 0.15 * Math.sin(this.time.now * 0.005);
    this.minimapG.fillStyle(PAL.hpRim, 1);
    this.minimapG.fillCircle(cx, cy, 3.5 * pulse);
    this.minimapG.lineStyle(1, PAL.ink, 0.95);
    this.minimapG.strokeCircle(cx, cy, 4 * pulse);
    // worldW/H for reference only — could be used to draw a sub-world frame
    void worldW;
    void worldH;
  }

  setClock(minutes: number, day: number, danger = false) {
    if (!this.hudClock) return;
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes) % 60;
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    this.hudClock.setText(`${pad(h)}:${pad(m)}`);
    this.hudClock.setColor(hex(danger ? PAL.gloomGlow : PAL.ink));
    this.hudDay?.setText(`Day ${day}`);
  }

  setGold(n: number) {
    if (!this.hudGold) return;
    this.hudGold.setText(`${n}`);
    this.tweens.add({ targets: this.hudGold, scale: { from: 1.3, to: 1 }, duration: 220, ease: "Back.easeOut" });
  }

  setKills(_n: number) {
    if (!this.hudKills) return;
    this.hudKills.setText(`TAB  ·  ${this.noteCount} note${this.noteCount === 1 ? "" : "s"}`);
  }

  addNote(id: string) {
    if (!this.notebookList) return;
    const line = NOTES[id] ?? id;
    this.noteCount++;
    this.hudKills?.setText(`TAB  ·  ${this.noteCount} note${this.noteCount === 1 ? "" : "s"}`);
    this.notebookList.setText(this.notebookList.text + (this.notebookList.text ? "\n\n" : "") + "•  " + line);
    this.toast("+ note", PAL.heartHi);
    if (this.hudKillIcon) {
      this.tweens.add({ targets: this.hudKillIcon, scale: 1.3, yoyo: true, duration: 240, ease: "Back.easeOut" });
    }
  }

  /* ------------------------------------------------------------------ *
   * BANNER / PROMPT / TOAST                                             *
   * ------------------------------------------------------------------ */
  showAreaBanner(name: string) {
    this.banner.setText(name.toUpperCase());
    const w = this.banner.width;
    this.bannerLine.clear();
    this.bannerLine.lineStyle(2, PAL.panelEdgeHi, 0.9);
    this.bannerLine.lineBetween(VIEW_W / 2 - w / 2 - 30, 122, VIEW_W / 2 + w / 2 + 30, 122);
    this.bannerLine.fillStyle(PAL.emberSoft, 1);
    this.bannerLine.fillTriangle(VIEW_W / 2 - 6, 117, VIEW_W / 2 + 6, 117, VIEW_W / 2, 127);
    this.bannerLine.setAlpha(0).setScale(1);
    this.banner.setAlpha(0).setY(86);
    this.tweens.killTweensOf([this.banner, this.bannerLine]);
    this.tweens.add({ targets: [this.banner, this.bannerLine], alpha: 1, duration: 500, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: this.banner, y: 96, duration: 600, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: [this.banner, this.bannerLine], alpha: 0, duration: 600, delay: 2400, ease: "Cubic.easeIn" });
  }

  showPrompt(text: string, x?: number, y?: number) {
    this.promptT.setText(text);
    const w = this.promptT.width + 28;
    const h = 30;
    const px = x ?? VIEW_W / 2;
    const py = y ?? VIEW_H - 90;
    this.promptG.clear();
    this.promptG.fillStyle(PAL.panel, 0.92);
    this.promptG.fillRoundedRect(px - w / 2, py - h / 2, w, h, 8);
    this.promptG.lineStyle(1.5, PAL.emberSoft, 0.9);
    this.promptG.strokeRoundedRect(px - w / 2, py - h / 2, w, h, 8);
    this.promptT.setPosition(px, py);
    if (!this.promptVisible) {
      this.promptVisible = true;
      this.tweens.killTweensOf([this.promptG, this.promptT]);
      this.tweens.add({ targets: [this.promptG, this.promptT], alpha: 1, duration: 160 });
    }
  }
  hidePrompt() {
    if (!this.promptVisible) return;
    this.promptVisible = false;
    this.tweens.killTweensOf([this.promptG, this.promptT]);
    this.tweens.add({ targets: [this.promptG, this.promptT], alpha: 0, duration: 160 });
  }

  toast(text: string, tint: number = PAL.ink) {
    const y0 = VIEW_H - 132;
    const t = this.add.text(0, 0, text, { fontFamily: SPECTRAL, fontSize: "16px", color: hex(tint), fontStyle: "600", align: "center", wordWrap: { width: 520 } }).setOrigin(0.5);
    const g = this.add.graphics();
    const w = Math.min(560, t.width + 32);
    const h = t.height + 18;
    g.fillStyle(PAL.panel, 0.9);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    g.lineStyle(1.5, tint, 0.85);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
    const c = this.add.container(VIEW_W / 2, y0, [g, t]).setDepth(40).setAlpha(0);
    // push existing toasts up
    this.toasts.forEach((old) => this.tweens.add({ targets: old, y: old.y - (h + 8), duration: 200, ease: "Quad.easeOut" }));
    this.toasts.push(c);
    this.tweens.add({ targets: c, alpha: 1, y: y0 - 6, duration: 220, ease: "Back.easeOut" });
    this.tweens.add({
      targets: c,
      alpha: 0,
      y: c.y - 24,
      delay: 2600,
      duration: 500,
      onComplete: () => {
        this.toasts = this.toasts.filter((x) => x !== c);
        c.destroy();
      },
    });
    if (this.toasts.length > 4) {
      const dead = this.toasts.shift()!;
      this.tweens.killTweensOf(dead);
      dead.destroy();
    }
  }

  /* ------------------------------------------------------------------ *
   * DIALOG                                                             *
   * ------------------------------------------------------------------ */
  private buildDialog() {
    const boxW = 940;
    const boxH = 196;
    const x = VIEW_W / 2 - boxW / 2;
    const y = VIEW_H - boxH - 28;
    this.dlgPanel = this.add.graphics();
    drawPanel(this.dlgPanel, x, y, boxW, boxH, PAL.panelEdgeHi);
    // Larger portrait box — the big detailed face shows here
    const portraitW = 124;
    const portraitH = 156;
    this.dlgPortraitBg = this.add
      .image(x + 22 + portraitW / 2, y + 20 + portraitH / 2, "ui_portrait_bg")
      .setDisplaySize(portraitW + 4, portraitH + 4);
    this.dlgPortrait = this.add
      .image(x + 22 + portraitW / 2, y + 20 + portraitH / 2, "portrait_eleni")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(portraitW, portraitH);
    this.dlgName = this.add.text(x + 22 + portraitW + 22, y + 18, "", { fontFamily: CINZEL, fontSize: "22px", color: hex(PAL.emberHot), fontStyle: "600" }).setLetterSpacing(3);
    this.dlgText = this.add.text(x + 22 + portraitW + 22, y + 56, "", {
      fontFamily: SPECTRAL,
      fontSize: "20px",
      color: hex(PAL.ink),
      fontStyle: "400",
      lineSpacing: 7,
      wordWrap: { width: boxW - portraitW - 86 },
    });
    this.dlgHint = this.add
      .text(x + boxW - 20, y + boxH - 14, "SPACE  ▸  continue", { fontFamily: SPECTRAL, fontSize: "13px", color: hex(PAL.inkFaint), fontStyle: "italic 400" })
      .setOrigin(1, 1);
    this.tweens.add({ targets: this.dlgHint, alpha: { from: 1, to: 0.3 }, yoyo: true, repeat: -1, duration: 900, ease: "Sine.easeInOut" });
    this.dlgRoot = this.add
      .container(0, 0, [this.dlgPanel, this.dlgPortraitBg, this.dlgPortrait, this.dlgName, this.dlgText, this.dlgHint])
      .setDepth(50)
      .setVisible(false);
  }

  showDialog(pages: DialogPage[], onDone: () => void) {
    if (pages.length === 0) {
      onDone();
      return;
    }
    this.dlgPages = pages;
    this.dlgIdx = -1;
    this.dlgOnDone = onDone;
    this.dlgRoot.setVisible(true).setAlpha(0).setY(20);
    this.tweens.add({ targets: this.dlgRoot, alpha: 1, y: 0, duration: 220, ease: "Cubic.easeOut" });
    this.nextDialogPage();
  }

  private nextDialogPage() {
    this.dlgIdx++;
    if (this.dlgIdx >= this.dlgPages.length) {
      this.closeDialog();
      return;
    }
    const p = this.dlgPages[this.dlgIdx];
    p.effect?.(this.ctx);
    this.dlgName.setText(p.name);
    this.dlgPortrait.setTexture(p.portrait);
    this.dlgPortrait.setTint(p.tint ?? 0xffffff);
    this.startTyping(p.text);
    SFX.open();
  }

  private startTyping(text: string) {
    this.typer?.remove();
    this.fullLine = text;
    this.dlgText.setText("");
    this.typing = true;
    let i = 0;
    this.typer = this.time.addEvent({
      delay: 18,
      loop: true,
      callback: () => {
        i++;
        this.dlgText.setText(text.slice(0, i));
        if (i % 2 === 0 && text[i - 1] !== " ") SFX.talk();
        if (i >= text.length) {
          this.typing = false;
          this.typer?.remove();
        }
      },
    });
  }

  private closeDialog() {
    this.typer?.remove();
    this.tweens.add({
      targets: this.dlgRoot,
      alpha: 0,
      y: 16,
      duration: 200,
      onComplete: () => {
        this.dlgRoot.setVisible(false);
        const cb = this.dlgOnDone;
        this.dlgOnDone = null;
        SFX.close();
        cb?.();
      },
    });
  }

  /* ------------------------------------------------------------------ *
   * STORY CARDS                                                        *
   * ------------------------------------------------------------------ */
  private buildStory() {
    this.storyDim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, PAL.void, 0.94);
    this.storyTitle = this.add
      .text(VIEW_W / 2, 168, "", { fontFamily: CINZEL, fontSize: "44px", color: hex(PAL.ink), fontStyle: "800" })
      .setOrigin(0.5)
      .setLetterSpacing(10)
      .setShadow(0, 4, "rgba(255,138,42,0.35)", 16, false, true);
    this.storyBody = this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 8, "", {
        fontFamily: SPECTRAL,
        fontSize: "23px",
        color: hex(PAL.inkDim),
        fontStyle: "italic 400",
        align: "center",
        lineSpacing: 10,
        wordWrap: { width: 760 },
      })
      .setOrigin(0.5);
    this.storyHint = this.add
      .text(VIEW_W / 2, VIEW_H - 64, "SPACE / click  ▸  continue", { fontFamily: SPECTRAL, fontSize: "15px", color: hex(PAL.inkFaint), fontStyle: "italic 400" })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.storyHint, alpha: { from: 1, to: 0.3 }, yoyo: true, repeat: -1, duration: 1000, ease: "Sine.easeInOut" });
    this.storyRoot = this.add.container(0, 0, [this.storyDim, this.storyTitle, this.storyBody, this.storyHint]).setDepth(80).setVisible(false);
  }

  showStory(title: string, lines: string[], onDone: () => void) {
    this.storyLines = lines;
    this.storyIdx = 0;
    this.storyOnDone = onDone;
    // reset to the default title size, then shrink to fit if it overflows
    this.storyTitle.setFontSize("44px").setLetterSpacing(10);
    this.storyTitle.setText(title.toUpperCase());
    const maxW = VIEW_W - 120;
    if (this.storyTitle.width > maxW) {
      const ratio = maxW / this.storyTitle.width;
      const newSize = Math.max(18, Math.floor(44 * ratio));
      this.storyTitle.setFontSize(`${newSize}px`).setLetterSpacing(Math.max(2, Math.floor(10 * ratio)));
    }
    this.storyRoot.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.storyRoot, alpha: 1, duration: 600 });
    this.showStoryLine(true);
  }

  private showStoryLine(first = false) {
    const txt = this.storyLines[this.storyIdx] ?? "";
    this.storyBody.setText(txt).setAlpha(0).setY(VIEW_H / 2 + 18);
    this.storyBusy = true;
    this.tweens.add({
      targets: this.storyBody,
      alpha: 1,
      y: VIEW_H / 2 + 8,
      duration: first ? 800 : 500,
      delay: first ? 400 : 0,
      ease: "Cubic.easeOut",
      onComplete: () => (this.storyBusy = false),
    });
  }

  private nextStoryLine() {
    if (this.storyBusy) {
      // skip the fade-in
      this.tweens.killTweensOf(this.storyBody);
      this.storyBody.setAlpha(1).setY(VIEW_H / 2 + 8);
      this.storyBusy = false;
      return;
    }
    this.storyIdx++;
    if (this.storyIdx >= this.storyLines.length) {
      this.tweens.add({
        targets: this.storyRoot,
        alpha: 0,
        duration: 700,
        onComplete: () => {
          this.storyRoot.setVisible(false);
          const cb = this.storyOnDone;
          this.storyOnDone = null;
          cb?.();
        },
      });
      return;
    }
    this.tweens.add({
      targets: this.storyBody,
      alpha: 0,
      y: VIEW_H / 2 - 4,
      duration: 280,
      onComplete: () => this.showStoryLine(false),
    });
  }

  /* ------------------------------------------------------------------ *
   * DEATH                                                              *
   * ------------------------------------------------------------------ */
  private buildDeath() {
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x0a0612, 0.86);
    const big = this.add
      .text(VIEW_W / 2, VIEW_H / 2 - 36, "THEY TOOK YOU", { fontFamily: CINZEL, fontSize: "54px", color: hex(PAL.gloomGlow), fontStyle: "800" })
      .setOrigin(0.5)
      .setLetterSpacing(12)
      .setShadow(0, 4, "rgba(0,0,0,0.7)", 8);
    const sub = this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 32, "wake up.  another day.", { fontFamily: SPECTRAL, fontSize: "22px", color: hex(PAL.inkDim), fontStyle: "italic 400" })
      .setOrigin(0.5);
    const hint = this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 86, "press anything  ▸  the next morning", { fontFamily: SPECTRAL, fontSize: "16px", color: hex(PAL.inkFaint), fontStyle: "400" })
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: { from: 1, to: 0.35 }, yoyo: true, repeat: -1, duration: 950, ease: "Sine.easeInOut" });
    this.deathRoot = this.add.container(0, 0, [dim, big, sub, hint]).setDepth(85).setVisible(false);
  }

  showDeath(onWake: () => void) {
    this.deathOnWake = onWake;
    this.deathRoot.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.deathRoot, alpha: 1, duration: 700 });
  }

  /* ------------------------------------------------------------------ *
   * PAUSE                                                              *
   * ------------------------------------------------------------------ */
  private buildPause() {
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, PAL.void, 0.78);
    const panel = this.add.graphics();
    drawPanel(panel, VIEW_W / 2 - 280, VIEW_H / 2 - 180, 560, 360, PAL.panelEdgeHi);
    const title = this.add.text(VIEW_W / 2, VIEW_H / 2 - 150, "YESTERDAY ECHOES", { fontFamily: CINZEL, fontSize: "30px", color: hex(PAL.ink), fontStyle: "800" }).setOrigin(0.5).setLetterSpacing(10);
    const lines = [
      "walk           W A S D   ·   ↑ ↓ ← →",
      "talk            E   (next to a neighbour)",
      "notebook   TAB",
      "pocket        I",
      "pause         ESC                mute   M",
      "",
      "Talk to everyone. Notice when they say something",
      "that doesn't match what you remember.",
      "Slowly, something will wake up inside you.",
    ];
    const body = this.add
      .text(VIEW_W / 2, VIEW_H / 2 - 80, lines.join("\n"), { fontFamily: SPECTRAL, fontSize: "17px", color: hex(PAL.inkDim), fontStyle: "400", align: "center", lineSpacing: 9 })
      .setOrigin(0.5, 0);
    const hint = this.add.text(VIEW_W / 2, VIEW_H / 2 + 152, "ESC  ▸  back outside", { fontFamily: SPECTRAL, fontSize: "14px", color: hex(PAL.inkFaint), fontStyle: "italic 400" }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: { from: 1, to: 0.4 }, yoyo: true, repeat: -1, duration: 1000 });
    this.pauseRoot = this.add.container(0, 0, [dim, panel, title, body, hint]).setDepth(90).setVisible(false);
  }

  togglePause() {
    if (this.deathRoot.visible || this.storyRoot.visible) return;
    this.paused = !this.paused;
    this.pauseRoot.setVisible(this.paused);
    if (this.paused) {
      this.pauseRoot.setAlpha(0);
      this.tweens.add({ targets: this.pauseRoot, alpha: 1, duration: 200 });
      this.gameScene.scene.pause();
      SFX.open();
    } else {
      this.gameScene.scene.resume();
      SFX.close();
    }
  }

  /* ------------------------------------------------------------------ *
   * shared advance handler                                             *
   * ------------------------------------------------------------------ */
  private onAdvance() {
    if (this.storyRoot.visible) {
      this.nextStoryLine();
      return;
    }
    if (this.deathRoot.visible) {
      const cb = this.deathOnWake;
      this.deathOnWake = null;
      this.tweens.add({ targets: this.deathRoot, alpha: 0, duration: 250, onComplete: () => this.deathRoot.setVisible(false) });
      cb?.();
      return;
    }
    if (this.dlgRoot.visible) {
      if (this.typing) {
        // finish the line instantly
        this.typer?.remove();
        this.typing = false;
        this.dlgText.setText(this.fullLine);
        SFX.blip();
      } else {
        this.nextDialogPage();
      }
      return;
    }
  }

  /* ------------------------------------------------------------------ *
   * NOTEBOOK                                                           *
   * ------------------------------------------------------------------ */
  private buildNotebook() {
    const w = 720;
    const h = 520;
    const x = VIEW_W / 2 - w / 2;
    const y = VIEW_H / 2 - h / 2;
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, PAL.void, 0.7);
    const panel = this.add.graphics();
    drawPanel(panel, x, y, w, h, PAL.panelEdgeHi);
    const title = this.add
      .text(VIEW_W / 2, y + 36, "NOTES", { fontFamily: CINZEL, fontSize: "30px", color: hex(PAL.ink), fontStyle: "600" })
      .setOrigin(0.5)
      .setLetterSpacing(12);
    const ruleG = this.add.graphics();
    ruleG.lineStyle(1, PAL.panelEdgeHi, 0.7);
    ruleG.lineBetween(x + 60, y + 64, x + w - 60, y + 64);
    this.notebookList = this.add.text(x + 36, y + 86, "", {
      fontFamily: SPECTRAL,
      fontSize: "17px",
      color: hex(PAL.inkDim),
      fontStyle: "italic 400",
      wordWrap: { width: w - 72 },
      lineSpacing: 4,
    });
    const empty = this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 20, "(nothing yet)\n\ntalk to the neighbours · notice what they say again and again", { fontFamily: SPECTRAL, fontSize: "16px", color: hex(PAL.inkFaint), fontStyle: "italic 400", align: "center", lineSpacing: 6 })
      .setOrigin(0.5);
    const hint = this.add
      .text(VIEW_W / 2, y + h - 22, "TAB  ▸  back", { fontFamily: SPECTRAL, fontSize: "13px", color: hex(PAL.inkFaint), fontStyle: "italic 400" })
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: { from: 1, to: 0.4 }, yoyo: true, repeat: -1, duration: 1000 });
    this.notebookRoot = this.add.container(0, 0, [dim, panel, title, ruleG, this.notebookList, empty, hint]).setDepth(70).setVisible(false);
    // hide the "empty" hint once any note exists
    this.notebookList.on("destroy", () => empty.destroy());
    this.tweens.add({
      targets: empty,
      alpha: { from: 1, to: 1 },
      duration: 1,
      onUpdate: () => {
        empty.setAlpha(this.notebookList.text.length > 0 ? 0 : 1);
      },
      repeat: -1,
    });
  }

  toggleNotebook() {
    this.notebookOpen = !this.notebookOpen;
    this.notebookRoot.setVisible(this.notebookOpen);
    if (this.notebookOpen) {
      this.notebookRoot.setAlpha(0);
      this.tweens.add({ targets: this.notebookRoot, alpha: 1, duration: 220 });
      SFX.open();
      this.scene.get("Game").scene.pause();
    } else {
      SFX.close();
      this.scene.get("Game").scene.resume();
    }
  }

  /* ------------------------------------------------------------------ *
   * POCKET / INVENTORY                                                 *
   * ------------------------------------------------------------------ */
  private buildInventory() {
    const w = 720;
    const h = 520;
    const x = VIEW_W / 2 - w / 2;
    const y = VIEW_H / 2 - h / 2;
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, PAL.void, 0.7);
    const panel = this.add.graphics();
    drawPanel(panel, x, y, w, h, PAL.panelEdgeHi);
    const title = this.add
      .text(VIEW_W / 2, y + 36, "POCKET", { fontFamily: CINZEL, fontSize: "30px", color: hex(PAL.ink), fontStyle: "600" })
      .setOrigin(0.5)
      .setLetterSpacing(12);
    const ruleG = this.add.graphics();
    ruleG.lineStyle(1, PAL.panelEdgeHi, 0.7);
    ruleG.lineBetween(x + 60, y + 64, x + w - 60, y + 64);
    this.inventoryList = this.add.text(x + 36, y + 86, "", {
      fontFamily: SPECTRAL,
      fontSize: "17px",
      color: hex(PAL.inkDim),
      fontStyle: "400",
      wordWrap: { width: w - 72 },
      lineSpacing: 4,
    });
    const empty = this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 20, "(empty)", { fontFamily: SPECTRAL, fontSize: "16px", color: hex(PAL.inkFaint), fontStyle: "italic 400" })
      .setOrigin(0.5);
    const hint = this.add
      .text(VIEW_W / 2, y + h - 22, "I  ▸  back", { fontFamily: SPECTRAL, fontSize: "13px", color: hex(PAL.inkFaint), fontStyle: "italic 400" })
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: { from: 1, to: 0.4 }, yoyo: true, repeat: -1, duration: 1000 });
    this.inventoryRoot = this.add.container(0, 0, [dim, panel, title, ruleG, this.inventoryList, empty, hint]).setDepth(72).setVisible(false);
    this.tweens.add({
      targets: empty,
      alpha: { from: 1, to: 1 },
      duration: 1,
      onUpdate: () => empty.setAlpha(this.inventoryList.text.length > 0 ? 0 : 1),
      repeat: -1,
    });
  }

  private refreshInventory() {
    if (!this.inventoryList || !this.ctx) return;
    const lines: string[] = [];
    for (const id of Object.keys(this.ctx.inventory)) {
      if (!this.ctx.inventory[id]) continue;
      const item = ITEMS[id];
      if (!item) continue;
      lines.push(`◆  ${item.name}\n     ${item.description}`);
    }
    this.inventoryList.setText(lines.join("\n\n"));
  }

  addItem(id: string) {
    const item = ITEMS[id];
    if (!item) return;
    this.refreshInventory();
    this.toast(`+ ${item.name}`, PAL.heartHi);
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) this.refreshInventory();
    this.inventoryRoot.setVisible(this.inventoryOpen);
    if (this.inventoryOpen) {
      this.inventoryRoot.setAlpha(0);
      this.tweens.add({ targets: this.inventoryRoot, alpha: 1, duration: 220 });
      SFX.open();
      this.scene.get("Game").scene.pause();
    } else {
      SFX.close();
      this.scene.get("Game").scene.resume();
    }
  }
}
