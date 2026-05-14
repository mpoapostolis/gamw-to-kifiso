/**
 * Cafe — a small corner café / general store. Warm timber, a long counter,
 * a chalkboard menu, a handful of round tables. The shopkeeper stands behind
 * the counter and remembers your order wrong, the same way, every morning.
 *
 * Music: `music_cafe` (falls back to `music_hope` if not loaded).
 */
import Phaser from "phaser";
import { DEPTH, VIEW_H, VIEW_W } from "../consts";
import { hex, PAL, shade } from "../palette";
import { SFX } from "../sfx";
import { TILE } from "../textures";
import { Audio } from "../audio";
import { DIALOGUES } from "../dialogues";
import type { DialogPage, Fx, GameCtx, NpcSpawn } from "../types";
import { Player } from "../objects/Player";
import { Npc } from "../objects/Npc";
import type { GameScene } from "./Game";
import type { UIScene } from "./Ui";

export class CafeScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private ui!: UIScene;
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private shopkeeper!: Npc;
  private keyE!: Phaser.Input.Keyboard.Key;
  private exit!: { x: number; y: number };
  private counter!: { x: number; y: number };
  private chalkboard!: { x: number; y: number };
  private shelf!: { x: number; y: number };
  private tables: { x: number; y: number }[] = [];
  private returnAt!: { x: number; y: number };
  private inDialog = false;
  private chalkboardExamined = false;
  private tableExamined = false;

  constructor() {
    super("Cafe");
  }

  init(data: { returnAt: { x: number; y: number } }) {
    this.returnAt = data?.returnAt ?? { x: 16 * TILE, y: 22 * TILE };
  }

  create() {
    this.gameScene = this.scene.get("Game") as GameScene;
    this.ui = this.scene.get("UI") as unknown as UIScene;
    this.ctx = this.gameScene.ctx;
    this.fx = this.gameScene.fx;
    this.cameras.main.setBackgroundColor(hex(PAL.night));

    Audio.playMusic(this, "music_cafe");

    // ---- room: 14 × 9 tiles, centred --------------------------------
    const cols = 14;
    const rows = 9;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 12;
    const right = ox + rW;
    const bottom = oy + rH;

    // ---- floor: brick-red tiles in a chequer --------------------------
    const floor = this.add.graphics();
    floor.fillStyle(shade(PAL.heart, -0.25), 1);
    floor.fillRect(ox, oy, rW, rH);
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const alt = (tx + ty) % 2 === 0;
        floor.fillStyle(alt ? shade(PAL.heart, -0.22) : shade(PAL.heart, -0.34), 1);
        floor.fillRect(ox + tx * TILE, oy + ty * TILE, TILE, TILE);
        // soft grout line
        floor.lineStyle(1, shade(PAL.heart, -0.5), 0.35);
        floor.strokeRect(ox + tx * TILE, oy + ty * TILE, TILE, TILE);
      }
    }

    // ---- walls: warm wood panels with a chair rail ------------------
    const walls = this.add.graphics();
    // back wall (north strip)
    walls.fillStyle(PAL.woodMid, 1);
    walls.fillRect(ox - 20, oy - 70, rW + 40, 74);
    // crown moulding
    walls.fillStyle(PAL.woodHi, 0.85);
    walls.fillRect(ox - 20, oy - 70, rW + 40, 5);
    // chair rail
    walls.fillStyle(shade(PAL.woodDark, -0.1), 1);
    walls.fillRect(ox - 20, oy - 30, rW + 40, 4);
    // wainscot panels under the rail
    walls.fillStyle(shade(PAL.woodMid, -0.18), 1);
    walls.fillRect(ox - 20, oy - 26, rW + 40, 30);
    // vertical seams every 1.4 tiles
    walls.lineStyle(1, shade(PAL.woodDark, -0.2), 0.5);
    for (let x = ox; x < right; x += TILE * 1.4) walls.lineBetween(x, oy - 26, x, oy + 2);
    // skirting (bottom)
    walls.fillStyle(PAL.woodDark, 1);
    walls.fillRect(ox - 20, bottom, rW + 40, 8);

    // ---- a big window on the LEFT wall: sodium-amber glow -----------
    const winX = ox + 4;
    const winY = oy + rH * 0.32;
    const winW = 14;
    const winH = TILE * 3.2;
    // glow behind
    this.add
      .image(winX + 4, winY + winH / 2, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.4)
      .setAlpha(0.6)
      .setDepth(DEPTH.bloom);
    const win = this.add.graphics();
    // frame
    win.fillStyle(PAL.woodDark, 1);
    win.fillRoundedRect(winX - 6, winY - 6, winW + 12, winH + 12, 3);
    // glass — sodium amber outside
    win.fillStyle(PAL.ember, 0.95);
    win.fillRect(winX, winY, winW, winH);
    win.fillStyle(PAL.emberHot, 0.5);
    win.fillRect(winX, winY, winW, winH * 0.4);
    // muntin
    win.lineStyle(2, PAL.woodDark, 1);
    win.lineBetween(winX, winY + winH / 2, winX + winW, winY + winH / 2);
    win.lineBetween(winX + winW / 2, winY, winX + winW / 2, winY + winH);
    // a soft spill of amber onto the floor near the window
    const spill = this.add.graphics().setDepth(oy - 5);
    spill.fillStyle(PAL.emberSoft, 0.18);
    spill.fillEllipse(winX + 24, winY + winH / 2 + 30, 60, winH * 0.8);

    // ---- the COUNTER along the back wall ----------------------------
    const cX = ox + TILE * 2.2;
    const cY = oy + TILE * 1.6;
    const cW = TILE * 9;
    const cH = TILE * 1.2;
    const counter = this.add.graphics();
    // shadow
    counter.fillStyle(PAL.shadow, 0.32);
    counter.fillRoundedRect(cX + 4, cY + cH + 4, cW, 10, 4);
    // base
    counter.fillStyle(PAL.woodDark, 1);
    counter.fillRoundedRect(cX, cY, cW, cH, 4);
    counter.fillStyle(PAL.woodMid, 1);
    counter.fillRoundedRect(cX + 3, cY + 3, cW - 6, cH - 12, 3);
    // counter top — polished
    counter.fillStyle(PAL.woodHi, 1);
    counter.fillRoundedRect(cX - 4, cY - 6, cW + 8, 10, 3);
    counter.fillStyle(shade(PAL.woodHi, 0.18), 0.55);
    counter.fillRect(cX, cY - 4, cW, 2);
    // a small brass bell on the counter
    counter.fillStyle(PAL.gold, 1);
    counter.fillCircle(cX + cW - 22, cY - 8, 4);
    counter.fillStyle(PAL.goldHi, 0.9);
    counter.fillCircle(cX + cW - 23, cY - 9, 1.6);
    // a stack of paper receipts
    counter.fillStyle(PAL.thatchHi, 1);
    counter.fillRect(cX + 28, cY - 5, 22, 6);
    counter.fillStyle(shade(PAL.thatchHi, -0.15), 0.7);
    counter.fillRect(cX + 28, cY - 2, 22, 1);
    this.counter = { x: cX + cW / 2, y: cY + cH };

    // ---- a small SHOP SHELF at the right end of the counter ----------
    // Brass-railed display with three little jars + a tag. Interacting with
    // this opens DIALOGUES.shopkeeper_shop (the actual trade dialog).
    const shX = cX + cW + 6;
    const shY = cY - 4;
    const shW = TILE * 1.8;
    const shH = cH + 4;
    const sh = this.add.graphics();
    // shadow
    sh.fillStyle(PAL.shadow, 0.35);
    sh.fillRoundedRect(shX + 4, shY + shH + 4, shW, 8, 3);
    // cabinet body
    sh.fillStyle(PAL.woodDark, 1);
    sh.fillRoundedRect(shX, shY, shW, shH, 3);
    sh.fillStyle(PAL.woodMid, 1);
    sh.fillRoundedRect(shX + 3, shY + 3, shW - 6, shH - 10, 2);
    // top rail (brass)
    sh.fillStyle(PAL.gold, 1);
    sh.fillRect(shX - 2, shY - 4, shW + 4, 4);
    sh.fillStyle(PAL.goldHi, 0.7);
    sh.fillRect(shX - 2, shY - 4, shW + 4, 1);
    // three jars on the shelf
    for (let i = 0; i < 3; i++) {
      const jx = shX + 10 + i * 12;
      const jy = shY + 12;
      sh.fillStyle(PAL.thatchHi, 0.85);
      sh.fillRoundedRect(jx - 4, jy, 8, 14, 1);
      sh.fillStyle(PAL.goldHi, 0.6);
      sh.fillRect(jx - 3, jy + 1, 6, 2);
    }
    // a small handwritten tag dangling below
    this.add
      .text(shX + shW / 2, shY + shH + 12, "·  shop  ·", {
        fontFamily: '"Spectral", serif',
        fontSize: "9px",
        color: hex(PAL.goldHi),
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setDepth(1);
    this.shelf = { x: shX + shW / 2, y: shY + shH };

    // ---- three bar stools in front of the counter -------------------
    for (let i = 0; i < 3; i++) {
      const sx = cX + cW * 0.18 + i * cW * 0.32;
      const sy = cY + cH + 26;
      const st = this.add.graphics().setDepth(sy);
      // shadow
      st.fillStyle(PAL.shadow, 0.3);
      st.fillEllipse(sx, sy + 14, 24, 6);
      // post
      st.fillStyle(PAL.woodDark, 1);
      st.fillRect(sx - 2, sy - 6, 4, 18);
      // seat
      st.fillStyle(PAL.heartDark, 1);
      st.fillCircle(sx, sy - 6, 9);
      st.fillStyle(PAL.heart, 1);
      st.fillCircle(sx, sy - 7, 7);
      st.fillStyle(PAL.heartHi, 0.55);
      st.fillCircle(sx - 1, sy - 8, 3);
    }

    // ---- chalkboard menu on the wall behind the counter -------------
    const chbX = cX + cW - TILE * 1.8;
    const chbY = oy - 50;
    const chb = this.add.graphics();
    chb.fillStyle(PAL.woodDark, 1);
    chb.fillRoundedRect(chbX - 38, chbY, 76, 48, 3);
    chb.fillStyle(shade(PAL.grassDeep, -0.45), 1);
    chb.fillRoundedRect(chbX - 34, chbY + 4, 68, 40, 2);
    // faint chalk text
    chb.lineStyle(1, PAL.ink, 0.55);
    chb.lineBetween(chbX - 26, chbY + 12, chbX + 22, chbY + 12);
    chb.lineBetween(chbX - 26, chbY + 18, chbX + 14, chbY + 18);
    chb.lineBetween(chbX - 26, chbY + 24, chbX + 22, chbY + 24);
    chb.lineBetween(chbX - 26, chbY + 30, chbX + 18, chbY + 30);
    // a heading word
    const chbCap = this.add
      .text(chbX, chbY + 8, "TODAY", {
        fontFamily: '"Spectral", serif',
        fontSize: "8px",
        color: hex(PAL.inkDim),
        fontStyle: "italic 600",
      })
      .setOrigin(0.5)
      .setDepth(1);
    void chbCap;
    this.chalkboard = { x: chbX, y: chbY + 48 };

    // ---- four small round café tables in the middle -----------------
    const tablePts: [number, number][] = [
      [ox + rW * 0.28, oy + rH * 0.58],
      [ox + rW * 0.5, oy + rH * 0.7],
      [ox + rW * 0.72, oy + rH * 0.58],
      [ox + rW * 0.5, oy + rH * 0.42],
    ];
    for (const [tx, ty] of tablePts) {
      const tG = this.add.graphics().setDepth(ty);
      // shadow
      tG.fillStyle(PAL.shadow, 0.34);
      tG.fillEllipse(tx, ty + 18, 42, 10);
      // pedestal
      tG.fillStyle(PAL.woodDark, 1);
      tG.fillRect(tx - 4, ty - 2, 8, 16);
      // top
      tG.fillStyle(PAL.woodMid, 1);
      tG.fillCircle(tx, ty - 6, 18);
      tG.fillStyle(PAL.woodHi, 0.7);
      tG.fillCircle(tx, ty - 8, 14);
      tG.fillStyle(shade(PAL.woodHi, 0.2), 0.5);
      tG.fillEllipse(tx - 3, ty - 11, 14, 5);
      // candle in the middle
      tG.fillStyle(PAL.ink, 1);
      tG.fillRect(tx - 1.4, ty - 14, 2.8, 6);
      tG.fillStyle(PAL.emberHot, 1);
      tG.fillTriangle(tx - 1.6, ty - 14, tx + 1.6, ty - 14, tx, ty - 19);
      // candle glow
      this.add
        .image(tx, ty - 16, "glow_warm")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.22)
        .setAlpha(0.55)
        .setDepth(ty - 0.5);
      // gentle flicker
      this.tweens.add({
        targets: tG,
        alpha: { from: 0.97, to: 1 },
        duration: 280 + Math.random() * 220,
        yoyo: true,
        repeat: -1,
      });
      // two chairs flanking
      for (const dx of [-26, 26]) {
        const chG = this.add.graphics().setDepth(ty + (dx > 0 ? 2 : -2));
        chG.fillStyle(PAL.shadow, 0.3);
        chG.fillEllipse(tx + dx, ty + 14, 22, 6);
        chG.fillStyle(PAL.woodDark, 1);
        chG.fillRoundedRect(tx + dx - 8, ty - 8, 16, 18, 3);
        chG.fillStyle(PAL.woodMid, 1);
        chG.fillRoundedRect(tx + dx - 6, ty - 6, 12, 6, 2);
        // backrest
        chG.fillStyle(PAL.woodDark, 1);
        chG.fillRect(tx + dx - 6, ty - 18, 12, 12);
        chG.fillStyle(shade(PAL.woodDark, 0.1), 0.85);
        chG.fillRect(tx + dx - 5, ty - 17, 10, 2);
      }
      this.tables.push({ x: tx, y: ty });
    }

    // ---- exit door bottom-centre with a doorbell jingle hint --------
    const dX = ox + rW / 2;
    const dY = bottom - 4;
    const dG = this.add.graphics();
    dG.fillStyle(PAL.woodDark, 1);
    dG.fillRoundedRect(dX - 24, dY - 84, 48, 80, 4);
    dG.fillStyle(PAL.woodMid, 1);
    dG.fillRoundedRect(dX - 22, dY - 80, 44, 74, 3);
    // panel seam
    dG.lineStyle(1, PAL.woodDark, 0.6);
    dG.lineBetween(dX, dY - 78, dX, dY - 8);
    // brass knob
    dG.fillStyle(PAL.gold, 1);
    dG.fillCircle(dX + 14, dY - 40, 2.6);
    // a tiny brass jingle bell hanging at the top
    dG.fillStyle(PAL.gold, 1);
    dG.fillCircle(dX, dY - 92, 3);
    dG.lineStyle(1, PAL.woodDark, 0.7);
    dG.lineBetween(dX, dY - 95, dX, dY - 84);
    // a little curved "jingle" hint
    dG.lineStyle(1, PAL.goldHi, 0.6);
    dG.beginPath();
    dG.arc(dX, dY - 92, 7, -Math.PI * 0.85, -Math.PI * 0.6);
    dG.strokePath();
    dG.beginPath();
    dG.arc(dX, dY - 92, 9, -Math.PI * 0.85, -Math.PI * 0.55);
    dG.strokePath();
    this.exit = { x: dX, y: dY };

    // ---- shopkeeper behind the counter -------------------------------
    const sSpawn: NpcSpawn = {
      id: "shopkeeper",
      key: "npc_smith",
      altKey: "npc_smith_b",
      name: "Shopkeeper",
      x: cX + cW * 0.5,
      y: cY - 8,
      roam: 0,
      dialog: DIALOGUES.shopkeeper,
    };
    this.shopkeeper = new Npc(this, sSpawn);

    // ---- Player ------------------------------------------------------
    this.player = new Player(this, this.exit.x, this.exit.y - 18, this.ctx, this.fx);
    this.player.surface = "wood";
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 20, oy - 80, rW + 40, rH + 90);

    // ---- solids ------------------------------------------------------
    const solids = this.physics.add.staticGroup();
    const w = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    w(ox + rW / 2, oy - 16, rW + 60, 32);
    w(ox + rW / 2, bottom + 8, rW + 60, 32);
    w(ox - 16, oy + rH / 2, 32, rH + 30);
    w(right + 16, oy + rH / 2, 32, rH + 30);
    // counter — the player can lean against it but not vault over
    w(cX + cW / 2, cY + cH / 2, cW + 8, cH + 8);
    // tables (each blocks its own small radius)
    for (const t of this.tables) w(t.x, t.y - 4, 38, 30);
    this.physics.add.collider(this.player, solids);

    // ---- vignette + warm wash ---------------------------------------
    this.add.image(VIEW_W / 2, VIEW_H / 2, "vignette").setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(DEPTH.vignette).setAlpha(0.78);
    this.add
      .rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0xff9a3a, 0.05)
      .setScrollFactor(0)
      .setDepth(DEPTH.vignette - 1);

    this.keyE = this.input.keyboard!.addKey("E");
    this.cameras.main.fadeIn(620, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.ui.showAreaBanner("The Cafe");
  }

  update() {
    if (this.player.dead || this.inDialog) {
      this.ui.hidePrompt();
      return;
    }
    type T = "exit" | "counter" | "shelf" | "chalkboard" | "table" | null;
    let target: T = null;
    const px = this.player.x;
    const py = this.player.y;

    if (Phaser.Math.Distance.Between(px, py, this.exit.x, this.exit.y - 30) < 48) target = "exit";
    // Shelf check comes BEFORE counter so the player can browse the shop
    // without the counter prompt stealing focus when they stand right beside
    // both.
    else if (Phaser.Math.Distance.Between(px, py, this.shelf.x, this.shelf.y) < 52) target = "shelf";
    else if (Math.abs(px - this.shopkeeper.x) < 60 && Math.abs(py - this.counter.y) < 80) target = "counter";
    else if (Math.abs(px - this.chalkboard.x) < 56 && Math.abs(py - this.counter.y) < 90) target = "chalkboard";
    else {
      for (const t of this.tables) {
        if (Phaser.Math.Distance.Between(px, py, t.x, t.y) < 38) {
          target = "table";
          break;
        }
      }
    }

    const labels: Record<NonNullable<T>, string> = {
      exit: "E  ·  outside",
      counter: "E  ·  Shopkeeper",
      shelf: "E  ·  browse the shelf  (trade memories)",
      chalkboard: "E  ·  read the menu",
      table: "E  ·  sit at the table",
    };
    if (target) this.ui.showPrompt(labels[target], px - this.cameras.main.worldView.x, py - this.cameras.main.worldView.y - 56);
    else this.ui.hidePrompt();

    if (target && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (target === "exit") this.exitScene();
      else if (target === "counter") this.startDialog(this.shopkeeper, DIALOGUES.shopkeeper);
      else if (target === "shelf") this.startDialog(this.shopkeeper, DIALOGUES.shopkeeper_shop);
      else if (target === "chalkboard") this.readChalkboard();
      else if (target === "table") this.sitAtTable();
    }
  }

  private readChalkboard() {
    this.ui.toast("today's special: yesterday's bread.", PAL.gloomGlow);
    if (this.ctx.day >= 3 && !this.chalkboardExamined) {
      this.chalkboardExamined = true;
      Audio.chime(this);
      this.ctx.addNote("cafeMenu");
    }
  }

  private sitAtTable() {
    if (this.tableExamined) {
      this.ui.toast("you sit. nothing comes. you stand again.", PAL.inkDim);
      return;
    }
    this.tableExamined = true;
    this.ui.toast("you sit for a moment. you don't remember the last time you came here.", PAL.gloomGlow);
  }

  /**
   * Start a dialog with the shopkeeper. If a specific dialog function is
   * passed (e.g. `DIALOGUES.shopkeeper_shop`), it's used instead of the
   * NPC's default dialog — this lets the same NPC offer different
   * conversations depending on which surface (counter vs shelf) the player
   * pressed E on.
   */
  private startDialog(npc: Npc, dialog?: (c: GameCtx) => DialogPage[]) {
    if (this.inDialog) return;
    this.inDialog = true;
    this.player.controlsLocked = true;
    npc.setTalking(true);
    SFX.open();
    this.ui.hidePrompt();
    const pages = (dialog ?? npc.spawn.dialog)(this.ctx);
    this.ui.showDialog(pages, () => {
      this.inDialog = false;
      npc.setTalking(false);
      this.player.controlsLocked = false;
    });
  }

  private exitScene() {
    SFX.close();
    this.cameras.main.fadeOut(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop("Cafe");
      this.scene.wake("Game");
      this.gameScene.events.emit("cafe-exit", this.returnAt);
    });
  }
}
