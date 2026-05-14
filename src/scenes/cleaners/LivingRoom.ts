/**
 * THE CLEANERS — Living Room.
 *
 * A sofa, a coffee table with a stack of mail, a TV that is off. The
 * front door of the apartment is here — leads to the Stairwell (future
 * iteration). For now: navigable, three interactables, exit back to the
 * kitchen + bathroom.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL, shade } from "../../palette";
import { TILE } from "../../textures";
import { GameState } from "../../state/gameState";
import { SceneRouter } from "../../state/sceneRouter";
import { registerManifest } from "../../state/sceneManifest";
import { Player } from "../../objects/Player";
import { dummyCtx, dummyFx } from "./ctx";
import type { Fx, GameCtx } from "../../types";

interface Spot { x: number; y: number; r: number; label: string; act: () => void }

export class LivingRoomScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private spots: Spot[] = [];
  private prompt?: Phaser.GameObjects.Text;
  private spawn?: { x: number; y: number };
  private mailRead = false;

  constructor() { super("LivingRoom"); }
  init(data: { spawn?: { x: number; y: number } } = {}) { this.spawn = data.spawn; }

  create() {
    SceneRouter.current = "LivingRoom";
    registerManifest({
      id: "LivingRoom",
      label: "Living Room",
      palette: "day",
      ambient: "",
      exits: [
        { to: "Kitchen", label: "kitchen" },
        { to: "Bathroom", label: "bathroom" },
        // The front door — Stairwell scene lands in a future iteration.
      ],
      fragments: [
        { id: "frag_mail_wrong_name", journalText: "A letter on the coffee table is addressed to a name that isn't mine. Same street, same apartment.", awareness: 2 },
      ],
    });

    this.ctx = dummyCtx();
    this.fx = dummyFx();

    const cols = 13;
    const rows = 7;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    const right = ox + rW;
    const bottom = oy + rH;
    this.cameras.main.setBackgroundColor(hex(0x1a1410));

    // floor: warm rug + dark wood border
    const floor = this.add.graphics();
    floor.fillStyle(0x2c1d14, 1);
    floor.fillRect(ox, oy, rW, rH);
    // a central rug
    floor.fillStyle(0x4a2a1c, 1);
    floor.fillRoundedRect(ox + TILE, oy + TILE, rW - 2 * TILE, rH - 2 * TILE, 6);
    floor.fillStyle(shade(0x4a2a1c, -0.15), 1);
    for (let y = oy + TILE * 1.4; y < oy + rH - TILE; y += 24)
      floor.fillRect(ox + TILE * 1.2, y, rW - 2 * TILE - 16, 2);
    // tasseled edge
    floor.fillStyle(PAL.goldDark, 0.8);
    for (let x = ox + TILE; x < ox + rW - TILE; x += 8) {
      floor.fillRect(x, oy + TILE - 4, 5, 4);
      floor.fillRect(x, oy + rH - TILE, 5, 4);
    }
    // wood plank border
    floor.lineStyle(1, 0x110a06, 0.4);
    for (let r = 0; r < rows; r++) floor.lineBetween(ox, oy + r * TILE, right, oy + r * TILE);

    // back wall: tan with framed photo
    const wall = this.add.graphics();
    wall.fillStyle(shade(PAL.thatch, -0.35), 1);
    wall.fillRect(ox - 24, oy - 80, rW + 48, 84);
    wall.fillStyle(shade(PAL.thatch, -0.2), 0.6);
    wall.fillRect(ox - 24, oy - 80, rW + 48, 6);
    wall.fillStyle(shade(PAL.woodDark, -0.1), 1);
    wall.fillRect(ox - 24, bottom, rW + 48, 6);

    // a small framed photo on the wall
    const pX = ox + rW * 0.5;
    const pY = oy - 40;
    const photo = this.add.graphics().setDepth(oy);
    photo.fillStyle(PAL.woodDark, 1);
    photo.fillRect(pX - 22, pY - 16, 44, 32);
    photo.fillStyle(0x6a5a8a, 1);
    photo.fillRect(pX - 19, pY - 13, 38, 26);
    // a blurry figure in the photo
    photo.fillStyle(PAL.skin, 0.7);
    photo.fillCircle(pX, pY - 4, 5);
    photo.fillStyle(PAL.cloakDark, 0.85);
    photo.fillRect(pX - 7, pY + 1, 14, 10);

    // ---- SOFA (south side, two-cushion) ----
    const sX = ox + TILE * 2.6;
    const sY = oy + TILE * 3.4;
    const sW = TILE * 4.8;
    const sH = TILE * 1.5;
    const sofa = this.add.graphics().setDepth(sY + sH);
    sofa.fillStyle(0x000000, 0.35);
    sofa.fillRoundedRect(sX + 3, sY + sH - 3, sW, 10, 5);
    sofa.fillStyle(shade(PAL.heartDark, -0.15), 1);
    sofa.fillRoundedRect(sX, sY - 16, sW, sH + 16, 8);
    sofa.fillStyle(PAL.heartDark, 1);
    sofa.fillRoundedRect(sX + 4, sY - 12, sW - 8, sH + 8, 6);
    // two cushions
    for (const cx of [sX + sW * 0.28, sX + sW * 0.72]) {
      sofa.fillStyle(PAL.heart, 0.95);
      sofa.fillRoundedRect(cx - sW * 0.18, sY - 4, sW * 0.36, sH * 0.8, 6);
      sofa.fillStyle(PAL.heartHi, 0.5);
      sofa.fillRect(cx - sW * 0.16, sY - 2, sW * 0.32, 3);
    }
    // backrest fold
    sofa.lineStyle(1, shade(PAL.heartDark, -0.2), 0.6);
    sofa.lineBetween(sX + sW / 2, sY - 14, sX + sW / 2, sY + sH - 6);

    // ---- COFFEE TABLE + stack of mail ----
    const tX = ox + rW / 2 - TILE;
    const tY = oy + TILE * 5.2;
    const tW = TILE * 2;
    const tH = TILE * 1;
    const tG = this.add.graphics().setDepth(tY + tH);
    tG.fillStyle(0x000000, 0.32);
    tG.fillRoundedRect(tX + 3, tY + tH - 3, tW, 8, 3);
    tG.fillStyle(PAL.woodDark, 1);
    tG.fillRoundedRect(tX, tY, tW, tH, 4);
    tG.fillStyle(PAL.woodHi, 0.55);
    tG.fillRoundedRect(tX + 3, tY + 3, tW - 6, 3, 2);
    // stack of mail (cream rectangle with a corner fold)
    tG.fillStyle(PAL.thatchHi, 0.98);
    tG.fillRect(tX + 8, tY + 6, 26, 20);
    tG.fillStyle(shade(PAL.thatchHi, -0.18), 1);
    tG.fillRect(tX + 30, tY + 6, 4, 20);
    tG.lineStyle(1, PAL.inkDim, 0.65);
    tG.lineBetween(tX + 12, tY + 14, tX + 30, tY + 14);
    tG.lineBetween(tX + 12, tY + 19, tX + 28, tY + 19);

    this.spots.push({
      x: tX + tW * 0.5,
      y: tY + tH * 0.5,
      r: 50,
      label: "E  ·  the mail",
      act: () => this.readMail(),
    });

    // ---- TV (east wall) ----
    const tvX = right - TILE;
    const tvY = oy + TILE * 2.5;
    const tv = this.add.graphics().setDepth(tvY + 30);
    tv.fillStyle(PAL.woodDark, 1);
    tv.fillRoundedRect(tvX - 22, tvY - 24, 44, 56, 3);
    tv.fillStyle(0x0a0610, 1);
    tv.fillRect(tvX - 18, tvY - 20, 36, 32);
    // off-state reflective sheen
    tv.fillStyle(0xfee2b3, 0.06);
    tv.fillRect(tvX - 18, tvY - 20, 36, 6);
    // little legs
    tv.fillStyle(PAL.woodDark, 1);
    tv.fillRect(tvX - 14, tvY + 30, 4, 6);
    tv.fillRect(tvX + 10, tvY + 30, 4, 6);

    this.spots.push({
      x: tvX,
      y: tvY,
      r: 44,
      label: "E  ·  the TV",
      act: () => this.examineTV(),
    });

    // ---- doors ----
    const kDoorX = ox + TILE * 0.8;
    const kDoorY = bottom - 4;
    const kd = this.add.graphics();
    kd.fillStyle(PAL.woodDark, 1);
    kd.fillRoundedRect(kDoorX - 22, kDoorY - 60, 44, 64, 3);
    kd.fillStyle(PAL.woodMid, 1);
    kd.fillRoundedRect(kDoorX - 20, kDoorY - 58, 40, 58, 2);
    kd.fillStyle(PAL.gold, 1);
    kd.fillCircle(kDoorX + 13, kDoorY - 32, 2);
    this.spots.push({
      x: kDoorX, y: kDoorY,
      r: 56,
      label: "E  ·  back to the kitchen",
      act: () => SceneRouter.go(this, "Kitchen"),
    });

    const bDoorX = right - TILE * 0.8;
    const bDoorY = bottom - 4;
    const bd = this.add.graphics();
    bd.fillStyle(PAL.woodDark, 1);
    bd.fillRoundedRect(bDoorX - 22, bDoorY - 60, 44, 64, 3);
    bd.fillStyle(PAL.woodMid, 1);
    bd.fillRoundedRect(bDoorX - 20, bDoorY - 58, 40, 58, 2);
    bd.fillStyle(PAL.gold, 1);
    bd.fillCircle(bDoorX + 13, bDoorY - 32, 2);
    this.spots.push({
      x: bDoorX, y: bDoorY,
      r: 56,
      label: "E  ·  the bathroom",
      act: () => SceneRouter.go(this, "Bathroom"),
    });

    // ---- player ----
    const start = this.spawn ?? { x: kDoorX + 60, y: kDoorY - 20 };
    this.player = new Player(this, start.x, start.y, this.ctx, this.fx);
    this.player.surface = "wood";
    this.player.setLanternRadius(95);
    this.cameras.main.startFollow(this.player, true, 0.22, 0.22);
    this.physics.world.setBounds(ox - 30, oy - 80, rW + 60, rH + 90);

    const solids = this.physics.add.staticGroup();
    const w = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    w(ox + rW / 2, oy - 14, rW + 60, 28);
    w(ox + rW / 2, bottom + 8, rW + 60, 28);
    w(ox - 18, oy + rH / 2, 32, rH + 30);
    w(right + 18, oy + rH / 2, 32, rH + 30);
    w(sX + sW / 2, sY + sH / 2, sW, sH + 16);
    w(tX + tW / 2, tY + tH / 2, tW, tH);
    w(tvX, tvY + 6, 44, 56);
    this.physics.add.collider(this.player, solids);

    this.keyE = this.input.keyboard!.addKey("E");
    this.keyJ = this.input.keyboard!.addKey("J");

    this.add.image(VIEW_W / 2, VIEW_H / 2, "vignette").setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(9100).setTint(0x6e3f1c).setAlpha(0.7);

    this.prompt = this.add
      .text(0, 0, "", {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "16px",
        color: hex(PAL.thatchHi),
        fontStyle: "italic 400",
        backgroundColor: "rgba(20, 12, 8, 0.78)",
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(9200)
      .setVisible(false)
      .setScrollFactor(0);

    this.cameras.main.fadeIn(380, 0, 0, 0);
  }

  private flashLine(text: string, ms = 2400) {
    const t = this.add
      .text(VIEW_W / 2, VIEW_H - 90, text, {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "16px",
        color: hex(PAL.thatchHi),
        fontStyle: "italic 400",
        backgroundColor: "rgba(20, 12, 8, 0.78)",
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(9300)
      .setScrollFactor(0);
    this.tweens.add({ targets: t, alpha: { from: 0, to: 1 }, duration: 300, yoyo: true, hold: ms, onComplete: () => t.destroy() });
  }

  private readMail() {
    this.flashLine("a letter on the table. addressed to ANDREW KORRES, this apartment, this street. that is not your name.");
    if (!this.mailRead) {
      this.mailRead = true;
      GameState.addFragment("frag_mail_wrong_name", 2);
      GameState.addJournalEntry(
        "A letter on the coffee table is addressed to a name that isn't mine. Same street, same apartment.",
        { fragmentId: "frag_mail_wrong_name" },
      );
    }
  }

  private examineTV() {
    this.flashLine("the TV is off. you can see your reflection in the glass. it looks back a beat too long.");
  }

  update() {
    if (!this.player) return;
    let best: Spot | null = null;
    let bestD = Infinity;
    for (const s of this.spots) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      if (d < s.r && d < bestD) { bestD = d; best = s; }
    }
    if (best) {
      const sx = this.player.x - this.cameras.main.worldView.x;
      const sy = this.player.y - this.cameras.main.worldView.y - 56;
      this.prompt?.setVisible(true).setPosition(sx, sy).setText(best.label);
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) best.act();
    } else {
      this.prompt?.setVisible(false);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.scene.launch("Journal");
      this.scene.pause();
    }
  }
}
