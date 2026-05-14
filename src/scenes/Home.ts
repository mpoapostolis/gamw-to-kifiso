/**
 * Home — Alex's interior. A small room with a bed, a mirror, a kitchen sink,
 * and a door back out. Demonstrates real multi-scene flow: GameScene sleeps,
 * UIScene keeps running (HUD persists), HomeScene plays. The shared GameCtx
 * lives on GameScene so all the dialog/notebook state survives the trip.
 */
import Phaser from "phaser";
import { DEPTH, VIEW_H, VIEW_W } from "../consts";
import { hex, PAL, shade } from "../palette";
import { SFX } from "../sfx";
import { TILE } from "../textures";
import type { Fx, GameCtx, NpcSpawn } from "../types";
import { Player } from "../objects/Player";
import { Npc } from "../objects/Npc";
import { DIALOGUES } from "../dialogues";
import { PROLOGUE } from "../story";
import type { GameScene } from "./Game";
import type { UIScene } from "./Ui";

export class HomeScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private ui!: UIScene;
  private ctx!: GameCtx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private exitDoor!: { x: number; y: number; rect: Phaser.Geom.Rectangle };
  private bed!: { x: number; y: number; rect: Phaser.Geom.Rectangle };
  private mirror!: { x: number; y: number; rect: Phaser.Geom.Rectangle };
  private bookOnTable: Phaser.GameObjects.Image | null = null;
  private fx!: Fx;
  private mom!: Npc;
  private inDialog = false;
  /** where to drop the player when we go back outside */
  private returnAt!: { x: number; y: number };

  constructor() {
    super("Home");
  }

  /** Is this the very first entry of the game? If so, play the prologue + place the player in bed. */
  private isStart = false;

  init(data: { returnAt?: { x: number; y: number }; isStart?: boolean }) {
    this.returnAt = data?.returnAt ?? { x: 13 * 48 + 24, y: 20 * 48 };
    this.isStart = !!data?.isStart;
  }

  create() {
    this.gameScene = this.scene.get("Game") as GameScene;
    this.ui = this.scene.get("UI") as unknown as UIScene;
    this.ctx = this.gameScene.ctx;
    this.fx = this.gameScene.fx;

    this.cameras.main.setBackgroundColor(hex(PAL.night));

    // ---- room layout: 14 × 9 tiles, centred ---------------------------
    const cols = 14;
    const rows = 9;
    const roomW = cols * TILE;
    const roomH = rows * TILE;
    const ox = (VIEW_W - roomW) / 2;
    const oy = (VIEW_H - roomH) / 2 - 12;
    const right = ox + roomW;
    const bottom = oy + roomH;

    // floor — wooden planks
    const floor = this.add.graphics();
    floor.fillStyle(PAL.woodHi, 1);
    floor.fillRect(ox, oy, roomW, roomH);
    for (let i = 0; i < rows; i++) {
      floor.fillStyle(i % 2 ? shade(PAL.woodHi, -0.08) : shade(PAL.woodHi, -0.02), 1);
      floor.fillRect(ox, oy + i * TILE, roomW, TILE);
      floor.lineStyle(1, shade(PAL.woodMid, -0.2), 0.4);
      floor.lineBetween(ox, oy + i * TILE, right, oy + i * TILE);
    }
    // plank seams
    floor.lineStyle(1, shade(PAL.woodMid, -0.35), 0.35);
    for (let x = ox + TILE; x < right; x += TILE) floor.lineBetween(x, oy, x, bottom);

    // walls (top + sides as a darker band)
    const walls = this.add.graphics();
    walls.fillStyle(PAL.thatch, 1);
    walls.fillRect(ox - 20, oy - 56, roomW + 40, 60);
    walls.fillStyle(PAL.thatchHi, 0.7);
    walls.fillRect(ox - 20, oy - 56, roomW + 40, 6);
    walls.fillStyle(shade(PAL.thatch, -0.18), 1);
    walls.fillRect(ox - 20, oy - 4, roomW + 40, 4);
    // skirting
    walls.fillStyle(PAL.woodDark, 1);
    walls.fillRect(ox - 20, bottom, roomW + 40, 6);
    // a pale wallpaper band
    walls.fillStyle(PAL.panelHi, 0.18);
    walls.fillRect(ox - 20, oy - 36, roomW + 40, 16);

    // ---- props --------------------------------------------------------
    // a window with warm dusk light
    const win = this.add.graphics();
    win.fillStyle(PAL.woodMid, 1);
    win.fillRoundedRect(ox + TILE * 4, oy - 50, TILE * 2.5, 40, 4);
    win.fillStyle(PAL.emberSoft, 0.95);
    win.fillRect(ox + TILE * 4 + 4, oy - 46, TILE * 2.5 - 8, 32);
    win.fillStyle(PAL.emberHot, 0.4);
    win.fillRect(ox + TILE * 4 + 4, oy - 30, TILE * 2.5 - 8, 16);
    win.lineStyle(2, PAL.woodDark, 1);
    win.lineBetween(ox + TILE * 4 + TILE * 1.25, oy - 46, ox + TILE * 4 + TILE * 1.25, oy - 14);
    win.lineBetween(ox + TILE * 4 + 4, oy - 30, ox + TILE * 4 + TILE * 2.5 - 4, oy - 30);
    // window glow
    this.add
      .image(ox + TILE * 5.25, oy - 14, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.2)
      .setAlpha(0.45)
      .setDepth(DEPTH.bloom);

    // ---- bed (left side) ---------------------------------------------
    const bedX = ox + TILE * 1.2;
    const bedY = oy + TILE * 1.6;
    const bedW = TILE * 3;
    const bedH = TILE * 2.2;
    const bedG = this.add.graphics();
    // shadow
    bedG.fillStyle(PAL.shadow, 0.3);
    bedG.fillRoundedRect(bedX + 6, bedY + bedH + 4, bedW, 10, 6);
    // frame
    bedG.fillStyle(PAL.woodDark, 1);
    bedG.fillRoundedRect(bedX, bedY, bedW, bedH, 8);
    bedG.fillStyle(PAL.woodMid, 1);
    bedG.fillRoundedRect(bedX + 4, bedY + 4, bedW - 8, bedH - 12, 6);
    // headboard
    bedG.fillStyle(shade(PAL.woodDark, -0.15), 1);
    bedG.fillRoundedRect(bedX - 8, bedY - 14, bedW + 16, 22, 6);
    // mattress + sheets
    bedG.fillStyle(PAL.thatchHi, 1);
    bedG.fillRoundedRect(bedX + 8, bedY + 8, bedW - 16, bedH - 28, 4);
    // pillow
    bedG.fillStyle(PAL.ink, 1);
    bedG.fillRoundedRect(bedX + 12, bedY + 14, bedW * 0.45, 22, 5);
    bedG.fillStyle(shade(PAL.ink, -0.08), 0.7);
    bedG.fillRoundedRect(bedX + 14, bedY + 18, bedW * 0.4, 4, 3);
    // a folded blanket
    bedG.fillStyle(PAL.cloak, 1);
    bedG.fillRoundedRect(bedX + 16, bedY + 44, bedW - 32, 22, 4);
    bedG.fillStyle(PAL.cloakHi, 0.5);
    bedG.fillRect(bedX + 18, bedY + 46, bedW - 36, 3);
    this.bed = { x: bedX + bedW / 2, y: bedY + bedH, rect: new Phaser.Geom.Rectangle(bedX, bedY, bedW, bedH) };

    // ---- mirror (right side) -----------------------------------------
    const mX = right - TILE * 2;
    const mY = oy + TILE * 0.6;
    const mW = TILE * 1.4;
    const mH = TILE * 2.4;
    const mG = this.add.graphics();
    mG.fillStyle(PAL.woodDark, 1);
    mG.fillRoundedRect(mX, mY, mW, mH, 12);
    mG.fillStyle(PAL.woodMid, 1);
    mG.fillRoundedRect(mX + 5, mY + 5, mW - 10, mH - 10, 10);
    // glass
    mG.fillStyle(PAL.water, 1);
    mG.fillRoundedRect(mX + 10, mY + 10, mW - 20, mH - 20, 8);
    mG.fillStyle(PAL.waterMid, 1);
    mG.fillRoundedRect(mX + 12, mY + 12, mW - 24, mH - 26, 7);
    // a vague reflection of you
    mG.fillStyle(PAL.cloakDark, 0.7);
    mG.fillCircle(mX + mW / 2, mY + mH * 0.55, 12);
    mG.fillStyle(PAL.skinDark, 0.7);
    mG.fillCircle(mX + mW / 2, mY + mH * 0.4, 9);
    // glint
    mG.fillStyle(PAL.gloomHi, 0.7);
    mG.fillRect(mX + 12, mY + 14, 4, mH - 28);
    this.mirror = { x: mX + mW / 2, y: mY + mH, rect: new Phaser.Geom.Rectangle(mX, mY, mW, mH) };

    // ---- a small table with a book left on it -----------------------
    const tX = ox + TILE * 7;
    const tY = oy + TILE * 1.6;
    const tG = this.add.graphics();
    tG.fillStyle(PAL.shadow, 0.3);
    tG.fillEllipse(tX + 38, tY + 68, 80, 12);
    tG.fillStyle(PAL.woodDark, 1);
    tG.fillRoundedRect(tX, tY + 28, 78, 36, 4);
    tG.fillStyle(PAL.woodMid, 1);
    tG.fillRoundedRect(tX + 3, tY + 30, 72, 8, 3);
    tG.fillRect(tX + 6, tY + 38, 6, 24);
    tG.fillRect(tX + 64, tY + 38, 6, 24);
    // little book (the one Helena says he gave her)
    if (!this.ctx.inventory.helena_book) {
      this.bookOnTable = this.add
        .image(tX + 38, tY + 28, "px")
        .setDisplaySize(22, 14)
        .setTint(PAL.cloak)
        .setDepth(tY);
      const cap = this.add
        .text(tX + 38, tY + 14, "an unfamiliar\nlittle book", { fontFamily: '"Spectral",serif', fontSize: "10px", color: hex(PAL.inkFaint), align: "center" })
        .setOrigin(0.5);
      this.tweens.add({ targets: cap, alpha: { from: 1, to: 0.4 }, yoyo: true, repeat: -1, duration: 1400 });
    }

    // ---- kitchen sink (the hide spot Despoina hints at) -------------
    const sX = ox + TILE * 10;
    const sY = oy + TILE * 1.6;
    const sG = this.add.graphics();
    sG.fillStyle(PAL.shadow, 0.3);
    sG.fillEllipse(sX + 50, sY + 92, 110, 14);
    sG.fillStyle(PAL.thatch, 1);
    sG.fillRoundedRect(sX, sY + 28, 100, 60, 6);
    sG.fillStyle(shade(PAL.thatch, -0.15), 1);
    sG.fillRoundedRect(sX + 10, sY + 40, 80, 28, 4);
    sG.fillStyle(PAL.stoneHi, 1);
    sG.fillRoundedRect(sX + 14, sY + 44, 72, 20, 3);
    sG.fillStyle(PAL.water, 0.5);
    sG.fillRoundedRect(sX + 20, sY + 50, 60, 8, 3);
    // tap
    sG.fillStyle(PAL.woodHi, 1);
    sG.fillRect(sX + 46, sY + 30, 4, 18);
    sG.fillRect(sX + 36, sY + 28, 24, 4);

    // ---- door (back outside) ----------------------------------------
    const dX = ox + roomW / 2 - 22;
    const dY = bottom - TILE * 0.4 - 8;
    const dG = this.add.graphics();
    dG.fillStyle(PAL.woodDark, 1);
    dG.fillRoundedRect(dX - 4, dY - 84, 52, 84, 6);
    dG.fillStyle(PAL.woodMid, 1);
    dG.fillRoundedRect(dX, dY - 80, 44, 78, 4);
    dG.lineStyle(1, PAL.woodDark, 0.6);
    dG.lineBetween(dX + 22, dY - 78, dX + 22, dY - 8);
    dG.fillStyle(PAL.gold, 1);
    dG.fillCircle(dX + 36, dY - 38, 2.5);
    // a soft "way out" shine
    this.add
      .image(dX + 22, dY - 40, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.6)
      .setAlpha(0.3)
      .setDepth(DEPTH.bloom);
    this.exitDoor = { x: dX + 22, y: dY, rect: new Phaser.Geom.Rectangle(dX - 8, dY - 88, 60, 96) };

    // ---- Mom in the kitchen ----------------------------------------
    const momSpawn: NpcSpawn = {
      id: "mom",
      key: "npc_mom",
      altKey: "npc_mom_b",
      name: "Mom",
      x: sX - TILE * 0.6,
      y: sY + TILE * 1.6,
      roam: 0,
      dialog: DIALOGUES.mom,
    };
    this.mom = new Npc(this, momSpawn);

    // ---- player -----------------------------------------------------
    // On the very first entry of the game the player wakes up IN BED;
    // otherwise they appear by the front door (as before).
    const startX = this.isStart ? this.bed.x : dX + 22;
    const startY = this.isStart ? this.bed.y + 16 : dY + 4;
    this.player = new Player(this, startX, startY, this.ctx, this.fx);
    this.player.surface = "wood";
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 20, oy - 60, roomW + 40, roomH + 70);

    // ---- solids around the room edges + furniture ------------------
    const solids = this.physics.add.staticGroup();
    const wall = (cx: number, cy: number, w: number, h: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(w, h).refreshBody();
    };
    const T2 = TILE / 2;
    wall(ox + roomW / 2, oy - 8, roomW, 16); // top wall
    wall(ox + roomW / 2, bottom + 4, roomW, 12); // bottom wall (door is in the middle but we let it not block — player presses E)
    wall(ox - 8, oy + roomH / 2, 16, roomH); // left
    wall(right + 8, oy + roomH / 2, 16, roomH); // right
    // bed
    wall(this.bed.x, bedY + bedH * 0.45, bedW * 0.9, bedH * 0.7);
    // table
    wall(tX + 38, tY + 50, 78, 26);
    // sink
    wall(sX + 50, sY + 62, 100, 36);
    void T2;

    this.physics.add.collider(this.player, solids);

    // ---- input ------------------------------------------------------
    this.keyE = this.input.keyboard!.addKey("E");

    // ---- fade in ----------------------------------------------------
    this.cameras.main.fadeIn(this.isStart ? 1400 : 420, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    if (this.isStart) {
      // The opening of the game: prologue first, then unlock the player
      // and point them at Mom in the kitchen.
      this.player.controlsLocked = true;
      this.time.delayedCall(900, () => {
        this.ui.showStory("YESTERDAY ECHOES", PROLOGUE, () => {
          this.player.controlsLocked = false;
          this.ui.showAreaBanner("ACT I · Awakening");
          this.time.delayedCall(2800, () => this.ui.showAreaBanner("Your Bedroom"));
          this.ui.toast("walk to the kitchen and talk to Mom", PAL.gloomGlow);
        });
      });
    } else {
      this.ui.showAreaBanner("Your House");
    }
  }

  update() {
    if (this.player.dead || this.sleeping || this.inDialog) {
      this.ui.hidePrompt();
      return;
    }
    type Target = "door" | "bed" | "mirror" | "book" | "mom" | null;
    let target: Target = null;
    const px = this.player.x;
    const py = this.player.y;
    const dMom = Phaser.Math.Distance.Between(px, py, this.mom.x, this.mom.y);
    if (Phaser.Math.Distance.Between(px, py, this.exitDoor.x, this.exitDoor.y) < 44) target = "door";
    else if (Phaser.Math.Distance.Between(px, py, this.bed.x, this.bed.y) < 60) target = "bed";
    else if (Phaser.Math.Distance.Between(px, py, this.mirror.x, this.mirror.y) < 56) target = "mirror";
    else if (this.bookOnTable && Math.abs(px - this.bookOnTable.x) < 40 && Math.abs(py - this.bookOnTable.y) < 50) target = "book";
    else if (dMom < 58) target = "mom";

    const labels: Record<NonNullable<Target>, string> = {
      door: "E  ·  outside",
      bed: "E  ·  sleep",
      mirror: "E  ·  look",
      book: "E  ·  take the book",
      mom: "E  ·  Mom",
    };
    if (target) this.ui.showPrompt(labels[target], this.player.x - this.cameras.main.worldView.x, this.player.y - this.cameras.main.worldView.y - 56);
    else this.ui.hidePrompt();

    if (target && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (target === "door") this.exit();
      else if (target === "bed") this.sleep();
      else if (target === "mirror") this.lookInMirror();
      else if (target === "mom") this.startDialog(this.mom);
      else if (target === "book") {
        this.ctx.addItem("helena_book");
        this.bookOnTable?.destroy();
        this.bookOnTable = null;
      }
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

  /** Lay down, the Cleaners come, wake up the next day. */
  private sleep() {
    if (this.sleeping) return;
    this.sleeping = true;
    this.player.controlsLocked = true;
    this.ui.hidePrompt();
    SFX.close();
    this.cameras.main.fadeOut(620, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.playSleepCinematic();
    });
  }

  private sleeping = false;

  private playSleepCinematic() {
    // On day 3+: before the text beats, show a Cleaner drift through the room
    // (the camera is briefly visible above the black wash). The player should
    // be hiding under the sink to remember any of this. Otherwise the screen
    // is black and only the text plays.
    if (this.ctx.day >= 3) this.spawnCleanerVisit();

    const beats = [
      "you close your eyes.",
      "you don't dream.",
      "for five minutes, you are not.",
      this.ctx.day >= 3 ? "something white moves at the foot of the bed." : "outside, a clock stops.",
      "morning.",
    ];
    const layer = this.add.container(0, 0).setDepth(95).setScrollFactor(0);
    const dim = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x000000, 1).setScrollFactor(0);
    layer.add(dim);
    const lineText = this.add
      .text(VIEW_W / 2, VIEW_H / 2, "", {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "26px",
        color: hex(PAL.inkDim),
        fontStyle: "italic 400",
        align: "center",
        wordWrap: { width: 800 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    layer.add(lineText);

    let i = 0;
    const step = () => {
      if (i >= beats.length) {
        this.tweens.add({
          targets: layer,
          alpha: 0,
          duration: 600,
          onComplete: () => {
            layer.destroy();
            this.afterSleep();
          },
        });
        return;
      }
      lineText.setText(beats[i]);
      lineText.setAlpha(0);
      this.tweens.add({
        targets: lineText,
        alpha: 1,
        duration: 700,
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.time.delayedCall(1100, () => {
            this.tweens.add({
              targets: lineText,
              alpha: 0,
              duration: 600,
              ease: "Sine.easeInOut",
              onComplete: () => {
                i++;
                step();
              },
            });
          });
        },
      });
    };
    step();
  }

  /** A single Cleaner figure drifts from the front door to the bed and back. */
  private spawnCleanerVisit() {
    const startX = this.exitDoor.x;
    const startY = this.exitDoor.y - 12;
    const cleaner = this.add.image(startX, startY, "npc_cleaner").setOrigin(0.5, 0.9).setDepth(2000).setAlpha(0).setScale(1.05);
    cleaner.setBlendMode(Phaser.BlendModes.SCREEN);
    // a soft cold halo
    const halo = this.add.image(startX, startY - 16, "glow_violet").setBlendMode(Phaser.BlendModes.ADD).setDepth(1999).setScale(0.8).setAlpha(0);
    const targetX = this.bed.x;
    const targetY = this.bed.y - 8;
    this.tweens.add({ targets: [cleaner, halo], alpha: 0.85, duration: 1200, ease: "Sine.easeInOut" });
    this.tweens.add({
      targets: cleaner,
      x: targetX,
      y: targetY,
      duration: 2800,
      delay: 400,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: halo,
      x: targetX,
      y: targetY - 16,
      duration: 2800,
      delay: 400,
      ease: "Sine.easeInOut",
    });
    // pause, hand over the head, then drift back out and fade
    this.time.delayedCall(3400, () => {
      this.tweens.add({
        targets: [cleaner, halo],
        x: startX,
        y: (target: Phaser.GameObjects.Image) => (target === cleaner ? startY : startY - 16),
        duration: 2200,
        ease: "Sine.easeInOut",
      });
      this.tweens.add({
        targets: [cleaner, halo],
        alpha: 0,
        duration: 1400,
        delay: 1100,
        onComplete: () => {
          cleaner.destroy();
          halo.destroy();
        },
      });
    });
  }

  private afterSleep() {
    this.ctx.day++;
    this.ctx.time = 7 * 60;
    this.ctx.dayStartNotes = { ...this.ctx.notes };
    this.ctx.dayStartInventory = { ...this.ctx.inventory };
    // wake up next to the bed
    this.player.setPosition(this.bed.x, this.bed.y + 16);
    (this.player.body as Phaser.Physics.Arcade.Body).reset(this.bed.x, this.bed.y + 16);
    this.sleeping = false;
    this.player.controlsLocked = false;
    this.cameras.main.fadeIn(700, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.ui.showAreaBanner(`Day ${this.ctx.day} · morning`);
    this.ui.setClock(this.ctx.time, this.ctx.day);
    if (this.ctx.day >= 3 && !this.ctx.flags.bodyMirror) {
      this.ui.toast("your face — slightly different in the mirror", PAL.gloomGlow);
    }
    if (this.ctx.day >= 4 && !this.ctx.flags.awake) {
      this.ctx.flags.awake = true;
      this.ui.toast("something inside you is awake", PAL.gloomGlow);
    }
  }

  private lookInMirror() {
    const lines: Record<number, string> = {
      1: "your face. nothing wrong with it.",
      2: "your face. there's a small crease by your eye that wasn't there yesterday. you think.",
      3: "your face is yours. it's also a little someone else's.",
    };
    const text = lines[Math.min(3, this.ctx.day)] ?? lines[3];
    this.ui.toast(text, PAL.gloomGlow);
    if (this.ctx.day >= 2) this.ctx.addNote("bodyMirror");
  }

  private exit() {
    SFX.close();
    this.ctx.flags.steppedOut = true;
    this.cameras.main.fadeOut(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // hand over to GameScene
      this.scene.stop("Home");
      if (this.gameScene.scene.isSleeping()) this.scene.wake("Game");
      else if (!this.gameScene.scene.isActive()) this.scene.run("Game");
      this.gameScene.events.emit("home-exit", this.returnAt);
    });
  }
}
