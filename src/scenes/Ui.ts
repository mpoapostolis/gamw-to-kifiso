/**
 * UI — the HUD (hearts, coin, quest), floating prompts & toasts, the dialogue
 * box with its typewriter, full-screen story cards, the wake-from-death screen,
 * and a pause panel. Runs as its own scene over the world.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../consts";
import { hex, PAL } from "../palette";
import { SFX } from "../sfx";
import type { DialogPage, GameCtx } from "../types";
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

  constructor() {
    super("UI");
  }

  create() {
    this.gameScene = this.scene.get("Game") as unknown as GameScene;
    this.ctx = this.gameScene.ctx;

    // ----- HUD ----------------------------------------------------------
    // hearts
    this.rebuildHearts();
    // coin
    const coinBg = this.add.graphics().setDepth(20);
    drawPanel(coinBg, VIEW_W - 168, 14, 154, 44, PAL.panelEdge);
    this.add.image(VIEW_W - 168 + 26, 14 + 22, "ui_coin").setDepth(21);
    this.hudGold = this.add
      .text(VIEW_W - 168 + 46, 14 + 22, "0", { fontFamily: CINZEL, fontSize: "22px", color: hex(PAL.ink), fontStyle: "600" })
      .setOrigin(0, 0.5)
      .setDepth(21);
    // quest / kills
    const killBg = this.add.graphics().setDepth(20);
    drawPanel(killBg, 16, 70, 196, 38, PAL.panelEdge);
    this.hudKillIcon = this.add.image(16 + 22, 70 + 19, "ui_sigil").setDepth(21).setScale(0.8);
    this.hudKills = this.add
      .text(16 + 40, 70 + 19, "Κορνάρες: 0", { fontFamily: SPECTRAL, fontSize: "15px", color: hex(PAL.inkDim), fontStyle: "500" })
      .setOrigin(0, 0.5)
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

    // advance handlers (shared by dialog & story & death) + pause toggle
    const advance = () => this.onAdvance();
    this.input.keyboard?.on("keydown-SPACE", advance);
    this.input.keyboard?.on("keydown-ENTER", advance);
    this.input.keyboard?.on("keydown-E", advance);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, advance);
    // ESC: pause toggle. Bound on the raw event so it survives the GameScene
    // being paused (which would stop GameScene's input plugin from firing).
    this.input.keyboard?.on("keydown", (ev: KeyboardEvent) => {
      SFX.unlock();
      if (ev.key === "Escape" || ev.code === "Escape" || ev.keyCode === 27) {
        if (!this.deathRoot.visible && !this.storyRoot.visible && !this.dlgRoot.visible) {
          this.togglePause();
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

  setGold(n: number) {
    if (!this.hudGold) return;
    this.hudGold.setText(`${n}`);
    this.tweens.add({ targets: this.hudGold, scale: { from: 1.3, to: 1 }, duration: 220, ease: "Back.easeOut" });
  }

  setKills(n: number) {
    if (!this.hudKills) return;
    const q = this.ctx?.questState ?? 0;
    let msg: string;
    if (this.ctx?.wardenDown) msg = `Κηφισός: ησυχία  ·  ${n} κορνάρες`;
    else if (q >= 2) msg = `Κορνάρες: ${n}  ·  ένας ΑΛΛΟΣ μένει στη Μεταμόρφωση`;
    else if (q === 1) msg = `Κορνάρες: ${Math.min(n, 5)} / 5`;
    else msg = `Κορνάρες: ${n}`;
    this.hudKills.setText(msg);
    this.hudKillIcon.setTint(this.ctx?.wardenDown ? PAL.emberSoft : 0xffffff);
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
    const boxW = 900;
    const boxH = 168;
    const x = VIEW_W / 2 - boxW / 2;
    const y = VIEW_H - boxH - 28;
    this.dlgPanel = this.add.graphics();
    drawPanel(this.dlgPanel, x, y, boxW, boxH, PAL.panelEdgeHi);
    this.dlgPortraitBg = this.add.image(x + 24 + 40, y + 24 + 40, "ui_portrait_bg").setDisplaySize(86, 86);
    this.dlgPortrait = this.add.image(x + 24 + 40, y + 24 + 48, "npc_elder").setOrigin(0.5, 1).setScale(1.7);
    this.dlgName = this.add.text(x + 132, y + 18, "", { fontFamily: CINZEL, fontSize: "20px", color: hex(PAL.emberHot), fontStyle: "600" }).setLetterSpacing(2);
    this.dlgText = this.add.text(x + 132, y + 50, "", {
      fontFamily: SPECTRAL,
      fontSize: "20px",
      color: hex(PAL.ink),
      fontStyle: "400",
      lineSpacing: 7,
      wordWrap: { width: boxW - 132 - 32 },
    });
    this.dlgHint = this.add
      .text(x + boxW - 18, y + boxH - 14, "SPACE  ▸  παρακάτω", { fontFamily: SPECTRAL, fontSize: "13px", color: hex(PAL.inkFaint), fontStyle: "italic 400" })
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
      .text(VIEW_W / 2, VIEW_H - 64, "SPACE / κλικ  ▸  συνέχεια", { fontFamily: SPECTRAL, fontSize: "15px", color: hex(PAL.inkFaint), fontStyle: "italic 400" })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.storyHint, alpha: { from: 1, to: 0.3 }, yoyo: true, repeat: -1, duration: 1000, ease: "Sine.easeInOut" });
    this.storyRoot = this.add.container(0, 0, [this.storyDim, this.storyTitle, this.storyBody, this.storyHint]).setDepth(80).setVisible(false);
  }

  showStory(title: string, lines: string[], onDone: () => void) {
    this.storyLines = lines;
    this.storyIdx = 0;
    this.storyOnDone = onDone;
    this.storyTitle.setText(title.toUpperCase());
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
      .text(VIEW_W / 2, VIEW_H / 2 - 36, "ΣΕ ΠΗΡΕ Η ΜΠΑΛΑ", { fontFamily: CINZEL, fontSize: "54px", color: hex(PAL.gloomGlow), fontStyle: "800" })
      .setOrigin(0.5)
      .setLetterSpacing(10)
      .setShadow(0, 4, "rgba(0,0,0,0.7)", 8);
    const sub = this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 26, "σου χύθηκε ο καφές. αλλά δεν τέλειωσε.", { fontFamily: SPECTRAL, fontSize: "20px", color: hex(PAL.inkDim), fontStyle: "italic 400" })
      .setOrigin(0.5);
    const hint = this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 84, "πάτα οτιδήποτε  ▸  ξύπνα δίπλα στη φωτιά", { fontFamily: SPECTRAL, fontSize: "16px", color: hex(PAL.inkFaint), fontStyle: "400" })
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
    const title = this.add.text(VIEW_W / 2, VIEW_H / 2 - 150, "ΓΑΜΩ ΤΟΝ ΚΗΦΙΣΟ ΜΟΥ", { fontFamily: CINZEL, fontSize: "30px", color: hex(PAL.ink), fontStyle: "800" }).setOrigin(0.5).setLetterSpacing(8);
    const lines = [
      "κίνηση         W A S D   ·   ↑ ↓ ← →",
      "κόρνα         SPACE   ·   αριστερό κλικ",
      "φτέρνισμα    SHIFT   (στιγμιαία ασφάλεια)",
      "κουβέντα     E   (δίπλα σε γείτονα)",
      "mute            M             pause           ESC",
      "",
      "Πάτα κόρνα σε 5 μαλάκες στη Λεωφόρο Κηφισού",
      "και γύρνα να σ' το πει ο Παππού Γιάννης.",
      "Μην ξεχνάς να πίνεις καφέ.",
    ];
    const body = this.add
      .text(VIEW_W / 2, VIEW_H / 2 - 80, lines.join("\n"), { fontFamily: SPECTRAL, fontSize: "17px", color: hex(PAL.inkDim), fontStyle: "400", align: "center", lineSpacing: 9 })
      .setOrigin(0.5, 0);
    const hint = this.add.text(VIEW_W / 2, VIEW_H / 2 + 152, "ESC  ▸  πίσω στον δρόμο", { fontFamily: SPECTRAL, fontSize: "14px", color: hex(PAL.inkFaint), fontStyle: "italic 400" }).setOrigin(0.5);
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
}
