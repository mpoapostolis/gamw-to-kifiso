/**
 * Clinic — a cold, sterile interior. Three beds along the north wall, each
 * with a Cleaner-pale figure folded beneath a sheet. A reception desk with
 * a clipboard. A row of glass display jars on the east wall, each holding
 * a small memento taken from a previous Alex. This is where the Cleaners
 * are made; nobody who works here will ever say so out loud.
 *
 * Music: `music_clinic` (falls back to `music_hope` if not loaded).
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

export class ClinicScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private ui!: UIScene;
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private doctor!: Npc;
  private keyE!: Phaser.Input.Keyboard.Key;
  private exit!: { x: number; y: number };
  private clipboard!: { x: number; y: number };
  private beds: { x: number; y: number }[] = [];
  private jars: { x: number; y: number }[] = [];
  private returnAt!: { x: number; y: number };
  private inDialog = false;
  private clipboardExamined = false;
  private bedExamined = false;
  private jarExamined = false;

  constructor() {
    super("Clinic");
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

    Audio.playMusic(this, "music_clinic");

    // ---- room: 14 × 9 tiles, centred --------------------------------
    const cols = 14;
    const rows = 9;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 12;
    const right = ox + rW;
    const bottom = oy + rH;

    // ---- floor: pale mottled stone-tile ------------------------------
    const floor = this.add.graphics();
    floor.fillStyle(PAL.stoneHi, 1);
    floor.fillRect(ox, oy, rW, rH);
    // tile grid
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const h = ((tx * 374761393 + ty * 668265263) >>> 0) / 4294967296;
        const tint = h < 0.55 ? PAL.stoneHi : shade(PAL.stoneHi, -0.08);
        floor.fillStyle(tint, 1);
        floor.fillRect(ox + tx * TILE, oy + ty * TILE, TILE, TILE);
        // grout
        floor.lineStyle(1, PAL.stoneEdge, 0.55);
        floor.strokeRect(ox + tx * TILE, oy + ty * TILE, TILE, TILE);
      }
    }
    // a few scattered darker mottle spots for the "scrubbed too many times" look
    for (let i = 0; i < 18; i++) {
      const fx = ox + 12 + Math.random() * (rW - 24);
      const fy = oy + 12 + Math.random() * (rH - 24);
      floor.fillStyle(shade(PAL.stoneHi, -0.18), 0.25);
      floor.fillEllipse(fx, fy, 14 + Math.random() * 18, 6 + Math.random() * 8);
    }

    // ---- walls: white, with a clinical green dado --------------------
    const walls = this.add.graphics();
    walls.fillStyle(PAL.gloomHi, 1);
    walls.fillRect(ox - 20, oy - 70, rW + 40, 74);
    walls.fillStyle(shade(PAL.gloomHi, -0.05), 1);
    walls.fillRect(ox - 20, oy - 70, rW + 40, 5);
    // a thin clinical-green stripe at chair-rail height
    walls.fillStyle(shade(PAL.grassMid, 0.05), 1);
    walls.fillRect(ox - 20, oy - 24, rW + 40, 4);
    // floor-baseboard
    walls.fillStyle(shade(PAL.stoneEdge, 0.2), 1);
    walls.fillRect(ox - 20, bottom, rW + 40, 8);

    // ---- three medical beds along the north wall --------------------
    for (let i = 0; i < 3; i++) {
      const bx = ox + rW * 0.22 + i * rW * 0.28;
      const by = oy + TILE * 1.2;
      const bw = TILE * 2.4;
      const bh = TILE * 1.2;
      const bG = this.add.graphics();
      // shadow
      bG.fillStyle(PAL.shadow, 0.3);
      bG.fillRoundedRect(bx - bw / 2 + 4, by + bh / 2 + 6, bw, 10, 5);
      // frame — pale metal
      bG.fillStyle(shade(PAL.stoneHi, -0.25), 1);
      bG.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 6);
      // sheet — pale, slightly off-white
      bG.fillStyle(PAL.gloomMid, 1);
      bG.fillRoundedRect(bx - bw / 2 + 6, by - bh / 2 + 6, bw - 12, bh - 12, 4);
      bG.fillStyle(PAL.gloomHi, 0.7);
      bG.fillRoundedRect(bx - bw / 2 + 6, by - bh / 2 + 6, bw - 12, 4, 2);
      // headboard
      bG.fillStyle(shade(PAL.stoneEdge, 0.2), 1);
      bG.fillRoundedRect(bx - bw / 2 - 4, by - bh / 2 - 8, 8, bh + 16, 3);
      // little side rail
      bG.lineStyle(2, shade(PAL.stoneEdge, 0.3), 0.85);
      bG.lineBetween(bx - bw / 2 + 4, by + bh / 2 - 2, bx + bw / 2 - 4, by + bh / 2 - 2);

      // the folded Cleaner figure beneath the sheet — low alpha, lying
      // we use the cleaner sprite at small scale, rotated, very faded
      const cleaner = this.add
        .image(bx, by, "npc_cleaner")
        .setOrigin(0.5)
        .setAlpha(0.22)
        .setScale(0.85)
        .setRotation(Math.PI / 2)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setDepth(by - 0.5);
      // a soft pale halo, very low
      const halo = this.add
        .image(bx, by, "glow_violet")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.18)
        .setScale(0.55)
        .setDepth(by - 0.6);
      // a slow breath-like rise & fall
      this.tweens.add({
        targets: [cleaner, halo],
        alpha: { from: cleaner.alpha * 0.7, to: cleaner.alpha },
        duration: 2400 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      // a small chart hung from the foot of the bed
      const chart = this.add.graphics().setDepth(by);
      chart.fillStyle(PAL.thatchHi, 1);
      chart.fillRect(bx + bw / 2 - 4, by + bh / 2 + 2, 14, 18);
      chart.lineStyle(1, PAL.inkDim, 0.7);
      chart.lineBetween(bx + bw / 2 - 2, by + bh / 2 + 6, bx + bw / 2 + 8, by + bh / 2 + 6);
      chart.lineBetween(bx + bw / 2 - 2, by + bh / 2 + 10, bx + bw / 2 + 8, by + bh / 2 + 10);
      chart.lineBetween(bx + bw / 2 - 2, by + bh / 2 + 14, bx + bw / 2 + 6, by + bh / 2 + 14);

      this.beds.push({ x: bx, y: by + bh / 2 });
    }

    // ---- central reception desk with a clipboard --------------------
    const dX = ox + rW / 2;
    const dY = oy + rH * 0.58;
    const dW = TILE * 3.8;
    const dH = TILE * 1.2;
    const desk = this.add.graphics();
    desk.fillStyle(PAL.shadow, 0.34);
    desk.fillRoundedRect(dX - dW / 2 + 4, dY + dH / 2 + 4, dW, 10, 4);
    // base
    desk.fillStyle(shade(PAL.stoneEdge, 0.1), 1);
    desk.fillRoundedRect(dX - dW / 2, dY - dH / 2, dW, dH, 4);
    // top — laminate
    desk.fillStyle(PAL.gloomMid, 1);
    desk.fillRoundedRect(dX - dW / 2 + 4, dY - dH / 2 + 4, dW - 8, dH * 0.4, 3);
    // little drawer
    desk.fillStyle(shade(PAL.stoneEdge, -0.05), 1);
    desk.fillRoundedRect(dX - 20, dY + 2, 40, 16, 2);
    desk.fillStyle(PAL.gold, 1);
    desk.fillCircle(dX, dY + 10, 1.6);
    // a paper clipboard on the desk
    const clipG = this.add.graphics().setDepth(dY);
    clipG.fillStyle(PAL.woodDark, 1);
    clipG.fillRoundedRect(dX - 14, dY - dH / 2 - 14, 28, 28, 2);
    clipG.fillStyle(PAL.thatchHi, 1);
    clipG.fillRect(dX - 12, dY - dH / 2 - 12, 24, 24);
    // clip
    clipG.fillStyle(shade(PAL.stoneEdge, 0.4), 1);
    clipG.fillRect(dX - 6, dY - dH / 2 - 16, 12, 5);
    // lines of "writing"
    clipG.lineStyle(1, PAL.inkDim, 0.85);
    clipG.lineBetween(dX - 10, dY - dH / 2 - 7, dX + 10, dY - dH / 2 - 7);
    clipG.lineBetween(dX - 10, dY - dH / 2 - 3, dX + 8, dY - dH / 2 - 3);
    clipG.lineBetween(dX - 10, dY - dH / 2 + 1, dX + 10, dY - dH / 2 + 1);
    clipG.lineBetween(dX - 10, dY - dH / 2 + 5, dX + 6, dY - dH / 2 + 5);
    clipG.lineBetween(dX - 10, dY - dH / 2 + 9, dX + 10, dY - dH / 2 + 9);
    this.clipboard = { x: dX, y: dY };

    // ---- a row of glass display jars on the east wall ---------------
    const jarX = right - TILE * 1.2;
    const contents: ("hair" | "letter" | "candle" | "key")[] = ["hair", "letter", "candle", "key"];
    for (let i = 0; i < 4; i++) {
      const jy = oy + rH * (0.22 + i * 0.16);
      // shelf
      const shelf = this.add.graphics();
      shelf.fillStyle(PAL.woodDark, 1);
      shelf.fillRect(jarX - 28, jy + 18, 56, 4);
      shelf.fillStyle(PAL.woodMid, 0.7);
      shelf.fillRect(jarX - 28, jy + 18, 56, 1);
      // jar — glass body
      const j = this.add.graphics();
      // shadow on shelf
      j.fillStyle(PAL.shadow, 0.25);
      j.fillEllipse(jarX, jy + 19, 26, 4);
      // glass
      j.fillStyle(PAL.water, 0.35);
      j.fillRoundedRect(jarX - 12, jy - 18, 24, 36, 4);
      j.fillStyle(PAL.waterHi, 0.55);
      j.fillRect(jarX - 10, jy - 14, 2, 28);
      // rim & lid
      j.fillStyle(shade(PAL.stoneEdge, 0.2), 1);
      j.fillRoundedRect(jarX - 14, jy - 22, 28, 6, 2);
      j.fillStyle(shade(PAL.stoneEdge, 0.4), 0.8);
      j.fillRect(jarX - 13, jy - 21, 26, 1);
      // contents
      switch (contents[i]) {
        case "hair": {
          // a coiled lock — Alex's hair colour
          j.fillStyle(PAL.hair, 1);
          j.fillEllipse(jarX, jy + 2, 14, 6);
          j.fillStyle(shade(PAL.hair, -0.1), 1);
          j.fillEllipse(jarX - 3, jy + 4, 8, 3);
          break;
        }
        case "letter": {
          // a folded letter
          j.fillStyle(PAL.gold, 1);
          j.fillRect(jarX - 7, jy - 2, 14, 10);
          j.lineStyle(1, PAL.goldDark, 0.8);
          j.lineBetween(jarX - 7, jy + 3, jarX + 7, jy + 3);
          j.lineBetween(jarX, jy - 2, jarX, jy + 8);
          break;
        }
        case "candle": {
          // a candle stub
          j.fillStyle(PAL.ink, 1);
          j.fillRect(jarX - 2, jy - 4, 4, 12);
          j.fillStyle(PAL.heartHi, 0.9);
          j.fillTriangle(jarX - 1.5, jy - 4, jarX + 1.5, jy - 4, jarX, jy - 8);
          break;
        }
        case "key": {
          // a small key
          j.fillStyle(PAL.gold, 1);
          j.fillCircle(jarX - 4, jy + 3, 3);
          j.fillRect(jarX - 2, jy + 2, 10, 2);
          j.fillRect(jarX + 6, jy + 1, 2, 4);
          j.fillRect(jarX + 4, jy + 1, 2, 4);
          break;
        }
      }
      // a faint label on each
      const lbl = this.add
        .text(jarX, jy + 26, ["·","··","···","····"][i] ?? "", { fontFamily: '"Spectral", serif', fontSize: "9px", color: hex(PAL.inkFaint) })
        .setOrigin(0.5)
        .setDepth(1);
      void lbl;
      this.jars.push({ x: jarX, y: jy });
    }

    // ---- a frosted glass exit door bottom-centre --------------------
    const exX = ox + rW / 2;
    const exY = bottom - 4;
    const dG = this.add.graphics();
    // metal frame
    dG.fillStyle(shade(PAL.stoneEdge, 0.3), 1);
    dG.fillRoundedRect(exX - 26, exY - 84, 52, 80, 3);
    // frosted pane
    dG.fillStyle(PAL.gloomMid, 0.95);
    dG.fillRoundedRect(exX - 22, exY - 80, 44, 74, 2);
    dG.fillStyle(PAL.gloomHi, 0.55);
    dG.fillRoundedRect(exX - 22, exY - 80, 44, 24, 2);
    // a horizontal mullion
    dG.lineStyle(2, shade(PAL.stoneEdge, 0.4), 0.9);
    dG.lineBetween(exX - 22, exY - 44, exX + 22, exY - 44);
    // push-bar handle
    dG.fillStyle(PAL.stoneEdge, 1);
    dG.fillRect(exX - 18, exY - 36, 36, 4);
    dG.fillStyle(shade(PAL.stoneEdge, 0.5), 0.7);
    dG.fillRect(exX - 18, exY - 36, 36, 1);
    this.exit = { x: exX, y: exY };

    // ---- a single cold ceiling fluorescent over the desk ------------
    this.add
      .image(dX, dY - 60, "glow_violet")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.1)
      .setAlpha(0.25)
      .setDepth(DEPTH.bloom);

    // ---- Dr. Erin — at the reception desk ---------------------------
    const drSpawn: NpcSpawn = {
      id: "doctor",
      key: "npc_mom",
      altKey: "npc_mom_b",
      name: "Dr. Erin",
      x: dX,
      y: dY - dH / 2 - 28,
      roam: 0,
      dialog: DIALOGUES.doctor,
    };
    this.doctor = new Npc(this, drSpawn);

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
    // beds
    for (const b of this.beds) w(b.x, b.y - 18, TILE * 2.4, TILE * 1.2);
    // reception desk
    w(dX, dY, dW + 6, dH + 8);
    // shelf line on the east wall (block jar approach from inside)
    // we don't fully block — player approaches from the west; the wall above already collides
    this.physics.add.collider(this.player, solids);

    // ---- vignette + cold wash ---------------------------------------
    this.add.image(VIEW_W / 2, VIEW_H / 2, "vignette").setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(DEPTH.vignette).setAlpha(0.88);
    this.add
      .rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x9aaad6, 0.06)
      .setScrollFactor(0)
      .setDepth(DEPTH.vignette - 1);

    this.keyE = this.input.keyboard!.addKey("E");
    this.cameras.main.fadeIn(620, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.ui.showAreaBanner("The Clinic");
  }

  update() {
    if (this.player.dead || this.inDialog) {
      this.ui.hidePrompt();
      return;
    }
    type T = "exit" | "doctor" | "clipboard" | "bed" | "jar" | null;
    let target: T = null;
    const px = this.player.x;
    const py = this.player.y;

    if (Phaser.Math.Distance.Between(px, py, this.exit.x, this.exit.y - 30) < 48) target = "exit";
    else if (Phaser.Math.Distance.Between(px, py, this.doctor.x, this.doctor.y) < 58) target = "doctor";
    else if (Math.abs(px - this.clipboard.x) < 60 && Math.abs(py - this.clipboard.y) < 80) target = "clipboard";
    else {
      for (const b of this.beds) {
        if (Phaser.Math.Distance.Between(px, py, b.x, b.y) < 54) {
          target = "bed";
          break;
        }
      }
      if (!target) {
        for (const j of this.jars) {
          if (Phaser.Math.Distance.Between(px, py, j.x, j.y) < 44) {
            target = "jar";
            break;
          }
        }
      }
    }

    const labels: Record<NonNullable<T>, string> = {
      exit: "E  ·  outside",
      doctor: "E  ·  Dr. Erin",
      clipboard: "E  ·  the clipboard",
      bed: "E  ·  the bed",
      jar: "E  ·  the jar",
    };
    if (target) this.ui.showPrompt(labels[target], px - this.cameras.main.worldView.x, py - this.cameras.main.worldView.y - 56);
    else this.ui.hidePrompt();

    if (target && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (target === "exit") this.exitScene();
      else if (target === "doctor") this.startDialog(this.doctor);
      else if (target === "clipboard") this.readClipboard();
      else if (target === "bed") this.examineBed();
      else if (target === "jar") this.examineJar();
    }
  }

  private readClipboard() {
    let line = "your name is at the top of today's list. you don't remember scheduling.";
    if (this.ctx.day === 2) line = "the same handwriting. the same list. one name has been quietly crossed out.";
    else if (this.ctx.day === 3) line = "the list has the same names every day, in the same order.";
    else if (this.ctx.day === 4) line = "the list has the same names. one of them has been highlighted in yellow. yours.";
    else if (this.ctx.day >= 5) line = "your name has the number 47 next to it. some have 124.";
    this.ui.toast(line, PAL.gloomGlow);
    if (!this.clipboardExamined) {
      this.clipboardExamined = true;
      Audio.chime(this);
      if (this.ctx.day >= 3) this.ctx.addNote("clinicList");
    }
  }

  private examineBed() {
    if (this.bedExamined) {
      this.ui.toast("the sheet keeps rising. keeps falling. like a tide that forgot the moon.", PAL.gloomGlow);
      return;
    }
    this.bedExamined = true;
    this.ui.toast("the sheet rises and falls. you think it's breathing. you think it might be you.", PAL.gloomGlow);
    if (this.ctx.day >= 3) this.ctx.addNote("clinicBeds");
  }

  private examineJar() {
    if (this.jarExamined) {
      this.ui.toast("a jar of yours. a jar of his. a jar of the next.", PAL.gloomGlow);
      return;
    }
    this.jarExamined = true;
    this.ui.toast("the jar holds a lock of hair the same colour as yours.", PAL.gloomGlow);
    if (this.ctx.day >= 2) this.ctx.addNote("clinicJars");
    if (!this.ctx.inventory.clinic_lock) this.ctx.addItem("clinic_lock");
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
      this.scene.stop("Clinic");
      this.scene.wake("Game");
      this.gameScene.events.emit("clinic-exit", this.returnAt);
    });
  }
}
