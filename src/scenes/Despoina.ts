/**
 * Despoina's House — the old woman's interior. A small room ringed with
 * candles, photographs along one wall, a knitting chair. She has been awake
 * sixty years; she does not grow old; this is where she keeps the proof.
 *
 * Music: `music_lullaby` (slow waltz / music box).
 */
import Phaser from "phaser";
import { DEPTH, VIEW_H, VIEW_W } from "../consts";
import { hex, PAL, shade } from "../palette";
import { SFX } from "../sfx";
import { TILE } from "../textures";
import { Audio } from "../audio";
import { DIALOGUES } from "../dialogues";
import type { Fx, GameCtx, NpcSpawn } from "../types";
import { Player } from "../objects/Player";
import { Npc } from "../objects/Npc";
import type { GameScene } from "./Game";
import type { UIScene } from "./Ui";

export class DespoinaScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private ui!: UIScene;
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private despoina!: Npc;
  private keyE!: Phaser.Input.Keyboard.Key;
  private exit!: { x: number; y: number };
  private photos!: { x: number; y: number };
  private candles!: { x: number; y: number };
  private returnAt!: { x: number; y: number };
  private inDialog = false;
  private photosExamined = false;
  private candlesLit = false;

  constructor() {
    super("Despoina");
  }

  init(data: { returnAt: { x: number; y: number } }) {
    this.returnAt = data?.returnAt ?? { x: 11 * TILE, y: 18 * TILE };
  }

  create() {
    this.gameScene = this.scene.get("Game") as GameScene;
    this.ui = this.scene.get("UI") as unknown as UIScene;
    this.ctx = this.gameScene.ctx;
    this.fx = this.gameScene.fx;
    this.cameras.main.setBackgroundColor(hex(PAL.night));

    Audio.playMusic(this, "music_lullaby");

    const cols = 12;
    const rows = 8;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 12;
    const right = ox + rW;
    const bottom = oy + rH;

    // ---- floor: dark wood with woven rugs --------------------------
    const floor = this.add.graphics();
    floor.fillStyle(shade(PAL.woodMid, -0.2), 1);
    floor.fillRect(ox, oy, rW, rH);
    for (let i = 0; i < rows; i++) {
      floor.fillStyle(i % 2 ? shade(PAL.woodMid, -0.28) : shade(PAL.woodMid, -0.22), 1);
      floor.fillRect(ox, oy + i * TILE, rW, TILE);
    }
    // a circular rug in the centre
    floor.fillStyle(PAL.roof, 0.7);
    floor.fillEllipse(ox + rW / 2, oy + rH / 2 + 30, rW * 0.55, rH * 0.5);
    floor.fillStyle(PAL.roofHi, 0.55);
    floor.fillEllipse(ox + rW / 2, oy + rH / 2 + 30, rW * 0.42, rH * 0.38);
    floor.fillStyle(shade(PAL.roof, -0.2), 0.65);
    floor.fillEllipse(ox + rW / 2, oy + rH / 2 + 30, rW * 0.28, rH * 0.24);

    // ---- walls: warm cream with a chair rail ----------------------
    const walls = this.add.graphics();
    walls.fillStyle(PAL.thatchHi, 1);
    walls.fillRect(ox - 20, oy - 70, rW + 40, 74);
    walls.fillStyle(shade(PAL.thatchHi, -0.15), 1);
    walls.fillRect(ox - 20, oy - 70, rW + 40, 4);
    walls.fillStyle(PAL.thatch, 1);
    walls.fillRect(ox - 20, oy - 24, rW + 40, 8);
    walls.fillStyle(shade(PAL.thatchHi, -0.25), 1);
    walls.fillRect(ox - 20, bottom, rW + 40, 8);

    // ---- photographs on the back wall ------------------------------
    const photoY = oy - 50;
    for (let i = 0; i < 7; i++) {
      const fx = ox + 60 + i * ((rW - 120) / 6);
      const photo = this.add.graphics();
      photo.fillStyle(PAL.woodDark, 1);
      photo.fillRoundedRect(fx - 16, photoY, 32, 38, 2);
      photo.fillStyle(shade(PAL.skinDark, -0.15), 1);
      photo.fillRect(fx - 13, photoY + 3, 26, 32);
      // a face
      photo.fillStyle(0xe6d5b8, 0.9);
      photo.fillEllipse(fx, photoY + 14, 14, 17);
      photo.fillStyle(0x2c1f10, 1);
      photo.fillCircle(fx - 3, photoY + 13, 1);
      photo.fillCircle(fx + 3, photoY + 13, 1);
      // little ages — the leftmost photo shows the youngest face, rightmost the oldest (Despoina herself).
      if (i >= 5) {
        photo.fillStyle(0xb5a896, 0.8);
        photo.fillRect(fx - 9, photoY + 17, 18, 1);
      }
      // a piece of black mourning ribbon on a couple of them
      if (i === 0 || i === 2) {
        photo.fillStyle(0x0a0810, 1);
        photo.fillRect(fx - 16, photoY - 2, 32, 3);
      }
    }
    this.photos = { x: ox + rW / 2, y: photoY + 30 };

    // ---- candles ring -- a soft circle around the rug --------------
    const ringR = rW * 0.34;
    const ringCX = ox + rW / 2;
    const ringCY = oy + rH / 2 + 20;
    const candleCount = 9;
    for (let i = 0; i < candleCount; i++) {
      const a = (i / candleCount) * Math.PI * 2;
      const cx = ringCX + Math.cos(a) * ringR;
      const cy = ringCY + Math.sin(a) * ringR * 0.55;
      // wax base
      const wax = this.add.graphics().setDepth(cy);
      wax.fillStyle(PAL.shadow, 0.3);
      wax.fillEllipse(cx, cy + 4, 10, 4);
      wax.fillStyle(PAL.ink, 1);
      wax.fillRect(cx - 3, cy - 14, 6, 16);
      wax.fillStyle(PAL.inkDim, 0.7);
      wax.fillRect(cx - 3, cy - 14, 1, 16);
      // flame
      const flame = this.add.graphics().setDepth(cy + 1);
      flame.fillStyle(PAL.emberHot, 1);
      flame.fillTriangle(cx - 2, cy - 14, cx + 2, cy - 14, cx, cy - 22);
      // gentle flicker via tween
      this.tweens.add({
        targets: flame,
        alpha: { from: 0.85, to: 1 },
        duration: 200 + Math.random() * 200,
        yoyo: true,
        repeat: -1,
      });
      // bloom glow
      this.add
        .image(cx, cy - 16, "glow_warm")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.35)
        .setAlpha(0.6)
        .setDepth(cy - 0.5);
    }
    this.candles = { x: ringCX, y: ringCY };

    // ---- a knitting chair to the right -----------------------------
    const chX = right - TILE * 1.6;
    const chY = oy + rH / 2 + 8;
    const ch = this.add.graphics().setDepth(chY);
    ch.fillStyle(PAL.shadow, 0.3);
    ch.fillEllipse(chX + 6, chY + 38, 50, 12);
    ch.fillStyle(PAL.woodDark, 1);
    ch.fillRoundedRect(chX - 22, chY - 30, 44, 64, 8);
    ch.fillStyle(PAL.roof, 1);
    ch.fillRoundedRect(chX - 20, chY - 28, 40, 48, 6);
    ch.fillStyle(shade(PAL.roof, 0.15), 0.7);
    ch.fillRect(chX - 18, chY - 26, 36, 4);
    // a ball of yarn at the foot
    const yarn = this.add.graphics().setDepth(chY + 1);
    yarn.fillStyle(PAL.heart, 1);
    yarn.fillCircle(chX - 30, chY + 26, 7);
    yarn.lineStyle(1, PAL.heartDark, 0.8);
    yarn.strokeCircle(chX - 30, chY + 26, 6);
    yarn.strokeCircle(chX - 30, chY + 26, 4);

    // ---- exit door at the south edge -------------------------------
    const dX = ox + rW / 2 + 80;
    const dY = bottom - 4;
    const dG = this.add.graphics();
    dG.fillStyle(PAL.woodDark, 1);
    dG.fillRoundedRect(dX - 22, dY - 84, 44, 80, 4);
    dG.fillStyle(PAL.woodMid, 1);
    dG.fillRoundedRect(dX - 20, dY - 80, 40, 74, 3);
    dG.fillStyle(PAL.gold, 1);
    dG.fillCircle(dX + 12, dY - 38, 2.4);
    this.exit = { x: dX, y: dY };

    // ---- Despoina herself, by the chair ----------------------------
    const dSpawn: NpcSpawn = {
      id: "despoina",
      key: "npc_elder",
      altKey: "npc_elder_b",
      name: "Mrs. Despoina",
      x: chX - 4,
      y: chY + 30,
      roam: 0,
      dialog: DIALOGUES.despoina,
    };
    this.despoina = new Npc(this, dSpawn);

    // ---- Player ----------------------------------------------------
    this.player = new Player(this, this.exit.x, this.exit.y - 16, this.ctx, this.fx);
    this.player.surface = "wood";
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 20, oy - 80, rW + 40, rH + 90);

    // solids
    const solids = this.physics.add.staticGroup();
    const w = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    w(ox + rW / 2, oy - 16, rW + 60, 32);
    w(ox + rW / 2, bottom + 8, rW + 60, 32);
    w(ox - 16, oy + rH / 2, 32, rH + 30);
    w(right + 16, oy + rH / 2, 32, rH + 30);
    w(chX - 4, chY + 8, 60, 56); // chair
    this.physics.add.collider(this.player, solids);

    // vignette + warm wash
    this.add.image(VIEW_W / 2, VIEW_H / 2, "vignette").setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(DEPTH.vignette).setAlpha(0.85);
    this.add
      .rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0xff8a2a, 0.04)
      .setScrollFactor(0)
      .setDepth(DEPTH.vignette - 1);

    this.keyE = this.input.keyboard!.addKey("E");
    this.cameras.main.fadeIn(620, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.ui.showAreaBanner("Despoina's House");
  }

  update() {
    if (this.player.dead || this.inDialog) {
      this.ui.hidePrompt();
      return;
    }
    type T = "exit" | "despoina" | "photos" | "candles" | null;
    let target: T = null;
    const px = this.player.x;
    const py = this.player.y;
    if (Phaser.Math.Distance.Between(px, py, this.exit.x, this.exit.y - 30) < 48) target = "exit";
    else if (Phaser.Math.Distance.Between(px, py, this.despoina.x, this.despoina.y) < 58) target = "despoina";
    else if (Math.abs(py - (this.photos.y + 60)) < 60 && Math.abs(px - this.photos.x) < 200) target = "photos";
    else if (Phaser.Math.Distance.Between(px, py, this.candles.x, this.candles.y) < 90) target = "candles";

    const labels: Record<NonNullable<T>, string> = {
      exit: "E  ·  outside",
      despoina: "E  ·  Mrs. Despoina",
      photos: "E  ·  the photographs",
      candles: "E  ·  the candles",
    };
    if (target) this.ui.showPrompt(labels[target], px - this.cameras.main.worldView.x, py - this.cameras.main.worldView.y - 56);
    else this.ui.hidePrompt();

    if (target && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (target === "exit") this.exitScene();
      else if (target === "despoina") this.startDialog(this.despoina);
      else if (target === "photos") this.examinePhotos();
      else if (target === "candles") this.examineCandles();
    }
  }

  private examinePhotos() {
    if (this.photosExamined) {
      this.ui.toast("seven photographs. one of them is you, and you've never been here.", PAL.gloomGlow);
      return;
    }
    this.photosExamined = true;
    Audio.chime(this);
    this.ui.toast("seven faces. some have black ribbon. one is yours.", PAL.gloomGlow);
    this.ctx.addNote("despoinaConfession");
  }

  private examineCandles() {
    if (!this.candlesLit) {
      this.candlesLit = true;
      Audio.chime(this, true);
      this.ui.toast("she lit one for everyone she has outlived. you don't ask how many.", PAL.gloomGlow);
    } else {
      this.ui.toast("nine candles. some are very low.", PAL.inkDim);
    }
  }

  private startDialog(npc: Npc) {
    if (this.inDialog) return;
    this.inDialog = true;
    this.player.controlsLocked = true;
    npc.setTalking(true);
    SFX.open();
    this.ui.hidePrompt();
    const pages = npc.spawn.dialog(this.ctx);
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
      this.scene.stop("Despoina");
      this.scene.wake("Game");
      this.gameScene.events.emit("despoina-exit", this.returnAt);
    });
  }
}
