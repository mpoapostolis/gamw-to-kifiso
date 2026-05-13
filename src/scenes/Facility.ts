/**
 * Facility — the underground room beneath the hill. A row of glass tubes,
 * each holding a body shaped like the player. The Custodian waits at the
 * far end. Pressing E on him triggers DIALOGUES.epistatis, which then
 * opens the binary ending choice (handled by GameScene.offerEnding).
 *
 * Entered from HillScene (or directly from GameScene's east edge for the
 * MVP). Exits via a stairwell on the west wall.
 */
import Phaser from "phaser";
import { DEPTH, VIEW_H, VIEW_W } from "../consts";
import { mix, PAL, shade } from "../palette";
import { SFX } from "../sfx";
import { TILE } from "../textures";
import { Audio } from "../audio";
import { DIALOGUES } from "../dialogues";
import type { Fx, GameCtx, NpcSpawn } from "../types";
import { Player } from "../objects/Player";
import { Npc } from "../objects/Npc";
import type { GameScene } from "./Game";
import type { UIScene } from "./Ui";

export class FacilityScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private ui!: UIScene;
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private custodian!: Npc;
  private keyE!: Phaser.Input.Keyboard.Key;
  private inDialog = false;
  private exit!: { x: number; y: number };
  private returnAt!: { x: number; y: number };
  private tubeBodies: Phaser.GameObjects.Container[] = [];

  constructor() {
    super("Facility");
  }

  init(data: { returnAt: { x: number; y: number } }) {
    this.returnAt = data?.returnAt ?? { x: 50 * TILE, y: 22 * TILE };
  }

  create() {
    this.gameScene = this.scene.get("Game") as GameScene;
    this.ui = this.scene.get("UI") as unknown as UIScene;
    this.ctx = this.gameScene.ctx;
    this.fx = this.gameScene.fx;

    this.cameras.main.setBackgroundColor("#08070d");

    // --- Layout: a long horizontal hall, 22 × 12 tiles --------------
    const cols = 22;
    const rows = 12;
    const roomW = cols * TILE;
    const roomH = rows * TILE;
    const ox = (VIEW_W - roomW) / 2;
    const oy = (VIEW_H - roomH) / 2 - 12;
    const right = ox + roomW;
    const bottom = oy + roomH;

    // --- Floor: pale concrete with darker grout lines ----------------
    const floor = this.add.graphics();
    floor.fillStyle(PAL.stoneEdge, 1);
    floor.fillRect(ox, oy, roomW, roomH);
    floor.fillStyle(shade(PAL.stone, -0.08), 1);
    for (let i = 0; i < rows; i++) {
      floor.fillStyle(i % 2 ? shade(PAL.stone, -0.18) : shade(PAL.stone, -0.12), 1);
      floor.fillRect(ox, oy + i * TILE, roomW, TILE);
    }
    floor.lineStyle(1, 0x14101a, 0.6);
    for (let x = ox + TILE; x < right; x += TILE) floor.lineBetween(x, oy, x, bottom);
    for (let y = oy + TILE; y < bottom; y += TILE) floor.lineBetween(ox, y, right, y);

    // --- Walls (top band) -------------------------------------------
    const walls = this.add.graphics();
    walls.fillStyle(0x0c0a14, 1);
    walls.fillRect(ox - 22, oy - 80, roomW + 44, 80);
    walls.fillStyle(0x1a1626, 1);
    walls.fillRect(ox - 22, oy - 8, roomW + 44, 8);
    walls.fillStyle(0x1a1626, 1);
    walls.fillRect(ox - 22, bottom, roomW + 44, 12);
    // ceiling pipes (decorative)
    walls.fillStyle(0x2a2535, 1);
    for (let i = 0; i < 5; i++) walls.fillRect(ox + 10 + i * 200, oy - 64, 6, 56);
    walls.fillStyle(0x423a55, 0.7);
    for (let i = 0; i < 5; i++) walls.fillRect(ox + 14 + i * 200, oy - 60, 1, 48);

    // a stairwell exit on the west wall — a dark arch
    const exitX = ox + TILE * 1.5;
    const exitY = oy + roomH / 2;
    walls.fillStyle(0x05040a, 1);
    walls.fillRect(exitX - 28, exitY - 50, 56, 100);
    walls.fillStyle(0x1a1626, 1);
    walls.fillRect(exitX - 28, exitY + 36, 56, 14);
    // stair lip
    walls.fillStyle(0x2a2535, 1);
    for (let i = 0; i < 5; i++) walls.fillRect(exitX - 28, exitY - 40 + i * 18, 56, 4);
    this.exit = { x: exitX, y: exitY + 40 };

    // a soft draught of dusk-blue light spilling up the stairwell
    this.add
      .image(exitX, exitY, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(PAL.gloomGlow)
      .setScale(1.4)
      .setAlpha(0.35)
      .setDepth(DEPTH.bloom);

    // --- Tubes: 6 glass cylinders along the north wall, each holding
    //     a body. The middle one is empty; the others labelled silently.
    const tubeStartX = ox + TILE * 4;
    const tubeY = oy + TILE * 2.6;
    const tubeW = 80;
    const tubeH = 196;
    for (let i = 0; i < 6; i++) {
      const tx = tubeStartX + i * (tubeW + 20);
      this.tubeBodies.push(this.makeTube(tx, tubeY, tubeW, tubeH, i === 2));
    }
    // a single tube on the south side too — the most recent
    this.tubeBodies.push(this.makeTube(ox + roomW / 2 - tubeW / 2, bottom - TILE * 3.6, tubeW, tubeH, false, true));

    // --- A console / control desk in the middle ---------------------
    const dX = ox + roomW / 2 - 80;
    const dY = oy + roomH / 2 + 24;
    const desk = this.add.graphics();
    desk.fillStyle(PAL.shadow, 0.35);
    desk.fillEllipse(dX + 80, dY + 70, 200, 18);
    desk.fillStyle(0x1f1a2b, 1);
    desk.fillRoundedRect(dX, dY, 160, 54, 5);
    desk.fillStyle(0x2a2535, 1);
    desk.fillRoundedRect(dX + 4, dY + 4, 152, 36, 4);
    // tiny screens
    for (let i = 0; i < 4; i++) {
      desk.fillStyle(0x0a1418, 1);
      desk.fillRoundedRect(dX + 8 + i * 38, dY + 8, 32, 26, 3);
      desk.fillStyle(PAL.gloomGlow, 0.7);
      for (let r = 0; r < 4; r++) {
        desk.fillRect(dX + 11 + i * 38, dY + 12 + r * 6, 20 + (r % 2) * 4, 1.5);
      }
    }
    // pulse on the screens
    this.tweens.add({
      targets: desk,
      alpha: { from: 1, to: 0.9 },
      yoyo: true,
      repeat: -1,
      duration: 1400,
      ease: "Sine.easeInOut",
    });

    // --- The Custodian ---------------------------------------------
    const custodianSpawn: NpcSpawn = {
      id: "epistatis",
      key: "npc_child",
      altKey: "npc_child_b",
      name: "The Custodian",
      x: ox + roomW - TILE * 3,
      y: oy + roomH / 2 + 14,
      roam: 0,
      dialog: DIALOGUES.epistatis,
    };
    this.custodian = new Npc(this, custodianSpawn);

    // --- Player ----------------------------------------------------
    const startX = this.exit.x;
    const startY = this.exit.y - 6;
    this.player = new Player(this, startX, startY, this.ctx, this.fx);
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 24, oy - 80, roomW + 48, roomH + 90);

    // --- Solids ----------------------------------------------------
    const solids = this.physics.add.staticGroup();
    const wall = (cx: number, cy: number, w: number, h: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(w, h).refreshBody();
    };
    wall(ox + roomW / 2, oy - 10, roomW + 60, 22);
    wall(ox + roomW / 2, bottom + 6, roomW + 60, 24);
    wall(ox - 18, oy + roomH / 2, 36, roomH);
    wall(right + 18, oy + roomH / 2, 36, roomH);
    // tube colliders
    for (let i = 0; i < 6; i++) {
      wall(tubeStartX + i * (tubeW + 20) + tubeW / 2, tubeY + tubeH / 2, tubeW, tubeH * 0.85);
    }
    wall(ox + roomW / 2, bottom - TILE * 2.3, tubeW, tubeH * 0.8);
    // desk
    wall(dX + 80, dY + 30, 160, 60);

    this.physics.add.collider(this.player, solids);

    // --- Input -----------------------------------------------------
    this.keyE = this.input.keyboard!.addKey("E");

    this.cameras.main.fadeIn(700, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    Audio.playMusic(this, "music_facility");
    this.ui.showAreaBanner("The Facility");
    this.time.delayedCall(900, () => this.ui.toast("you are below. they are above.", PAL.gloomGlow));

    // ambient: a slow hum + drip
    this.time.addEvent({
      delay: 4200,
      loop: true,
      callback: () => SFX.blip(),
    });
  }

  /** A glass tube with a body silhouette inside. Returns the container for animation. */
  private makeTube(x: number, y: number, w: number, h: number, empty: boolean, newest = false): Phaser.GameObjects.Container {
    const c = this.add.container(x + w / 2, y + h / 2).setDepth(y + h);
    // base
    const base = this.add.graphics();
    base.fillStyle(0x1a1626, 1);
    base.fillRect(-w / 2 - 4, h / 2 - 10, w + 8, 22);
    base.fillStyle(0x2a2535, 1);
    base.fillRect(-w / 2, h / 2 - 8, w, 8);
    c.add(base);
    // top cap
    const cap = this.add.graphics();
    cap.fillStyle(0x1a1626, 1);
    cap.fillRect(-w / 2 - 4, -h / 2 - 12, w + 8, 18);
    cap.fillStyle(0x2a2535, 1);
    cap.fillRect(-w / 2, -h / 2 - 6, w, 4);
    c.add(cap);
    // glass — soft cyan, faintly translucent
    const glass = this.add.graphics();
    glass.fillStyle(0x1c2c44, 0.85);
    glass.fillRoundedRect(-w / 2, -h / 2, w, h, w / 3);
    glass.fillStyle(0x3a577a, 0.55);
    glass.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w - 8, h - 14, w / 3 - 4);
    // glints
    glass.fillStyle(0xaecae6, 0.6);
    glass.fillRect(-w / 2 + 6, -h / 2 + 12, 3, h - 30);
    glass.fillStyle(0xaecae6, 0.3);
    glass.fillRect(w / 2 - 9, -h / 2 + 18, 2, h - 40);
    c.add(glass);
    // body silhouette
    if (!empty) {
      const body = this.add.graphics();
      // head
      body.fillStyle(0x1a1620, 0.78);
      body.fillCircle(0, -h / 2 + 38, 14);
      // torso
      body.fillStyle(0x1a1620, 0.78);
      body.fillRoundedRect(-14, -h / 2 + 50, 28, 56, 8);
      // legs
      body.fillRect(-12, -h / 2 + 100, 10, 70);
      body.fillRect(2, -h / 2 + 100, 10, 70);
      // hands floating up
      body.fillCircle(-22, -h / 2 + 78, 5);
      body.fillCircle(22, -h / 2 + 78, 5);
      // a soft inner glow if "newest" (last night's body)
      if (newest) {
        const glow = this.add.image(0, 0, "glow_warm").setBlendMode(Phaser.BlendModes.ADD).setTint(PAL.gloomGlow).setScale(0.7).setAlpha(0.5);
        c.add(glow);
      }
      c.add(body);
    }
    // rim light at the top: a slowly-pulsing dot
    const rim = this.add.image(0, -h / 2 - 4, "soft").setBlendMode(Phaser.BlendModes.ADD).setTint(PAL.gloomGlow).setScale(0.35).setAlpha(0.7);
    c.add(rim);
    this.tweens.add({
      targets: rim,
      alpha: { from: 0.4, to: 0.85 },
      scale: { from: 0.3, to: 0.45 },
      yoyo: true,
      repeat: -1,
      duration: 1700 + Math.random() * 600,
      ease: "Sine.easeInOut",
    });
    // bubbles inside
    const bubbles = this.add.particles(0, 0, "dot", {
      x: { min: -w / 2 + 10, max: w / 2 - 10 },
      y: h / 2 - 30,
      speedY: { min: -34, max: -16 },
      speedX: { min: -3, max: 3 },
      lifespan: { min: 2400, max: 3800 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: mix(PAL.gloomGlow, 0xffffff, 0.5),
      frequency: 600 + Math.random() * 400,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
    });
    c.add(bubbles);
    return c;
  }

  update() {
    if (this.player.dead || this.inDialog) {
      this.ui.hidePrompt();
      return;
    }
    const px = this.player.x,
      py = this.player.y;
    const dExit = Phaser.Math.Distance.Between(px, py, this.exit.x, this.exit.y);
    const dCustodian = Phaser.Math.Distance.Between(px, py, this.custodian.x, this.custodian.y);
    if (dCustodian < 64) {
      this.ui.showPrompt("E  ·  The Custodian", this.custodian.x - this.cameras.main.worldView.x, this.custodian.y - this.cameras.main.worldView.y - 56);
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.startDialog();
    } else if (dExit < 50) {
      this.ui.showPrompt("E  ·  back up", this.exit.x - this.cameras.main.worldView.x, this.exit.y - this.cameras.main.worldView.y - 30);
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.exitFacility();
    } else this.ui.hidePrompt();
  }

  private startDialog() {
    if (this.inDialog) return;
    this.inDialog = true;
    this.player.controlsLocked = true;
    this.custodian.setTalking(true);
    SFX.open();
    this.ui.hidePrompt();
    const pages = this.custodian.spawn.dialog(this.ctx);
    this.ui.showDialog(pages, () => {
      this.inDialog = false;
      this.custodian.setTalking(false);
      this.player.controlsLocked = false;
      if (this.ctx.flags.endingAvailable && !this.ctx.flags.endingChosen) {
        this.gameScene.events.emit("facility-offer-ending");
      }
    });
  }

  private exitFacility() {
    SFX.close();
    this.cameras.main.fadeOut(420, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop("Facility");
      this.scene.wake("Game");
      this.gameScene.events.emit("facility-exit", this.returnAt);
    });
  }
}
