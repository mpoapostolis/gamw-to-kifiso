/**
 * Park — a small public garden east of the village. A grey-pink dusk sky, a
 * pond with reflective water, a wooden bench carved with "ALEX — 47", and a
 * stray cat that returns every day. Eli the kid relocates here on Day 2+.
 *
 * Entered through the east edge of GameScene (gate trigger). Its own slow
 * piano + bird-ambient music swaps in via Audio.playMusic("music_park").
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

export class ParkScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private ui!: UIScene;
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private cat!: Npc;
  private eli!: Npc;
  private keyE!: Phaser.Input.Keyboard.Key;
  private exit!: { x: number; y: number };
  private bench!: { x: number; y: number };
  private returnAt!: { x: number; y: number };
  private inDialog = false;
  private benchExamined = false;

  constructor() {
    super("Park");
  }

  init(data: { returnAt: { x: number; y: number } }) {
    this.returnAt = data?.returnAt ?? { x: 26 * TILE, y: 22 * TILE };
  }

  create() {
    this.gameScene = this.scene.get("Game") as GameScene;
    this.ui = this.scene.get("UI") as unknown as UIScene;
    this.ctx = this.gameScene.ctx;
    this.fx = this.gameScene.fx;
    this.cameras.main.setBackgroundColor(hex(PAL.night));

    Audio.playMusic(this, "music_park");

    // ---- bigger park: 28 × 16 tiles ---------------------------------
    const cols = 28;
    const rows = 16;
    const pW = cols * TILE;
    const pH = rows * TILE;
    const ox = (VIEW_W - pW) / 2;
    const oy = (VIEW_H - pH) / 2 - 12;
    const right = ox + pW;
    const bottom = oy + pH;

    // grass with a wandering path of soft sand
    const lawn = this.add.graphics();
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const h = ((tx * 374761393 + ty * 668265263) >>> 0) / 4294967296;
        const tint = h < 0.4 ? PAL.grassDeep : h < 0.8 ? PAL.grassMid : PAL.grassHi;
        lawn.fillStyle(tint, 1);
        lawn.fillRect(ox + tx * TILE, oy + ty * TILE, TILE, TILE);
      }
    }
    // a soft sand path winding through
    const path = this.add.graphics();
    path.fillStyle(PAL.sand, 0.92);
    const px = (t: number) => ox + (TILE * 2) + t * (pW - TILE * 4);
    const py = (t: number) => oy + pH / 2 + Math.sin(t * Math.PI * 2) * pH * 0.18;
    for (let i = 0; i < 80; i++) {
      const t = i / 79;
      path.fillCircle(px(t), py(t), 18 + Math.sin(t * 14) * 3);
    }

    // a still pond in the SW corner with reflective water
    const pondX = ox + pW * 0.22;
    const pondY = oy + pH * 0.66;
    const pondR = 130;
    const pond = this.add.graphics();
    pond.fillStyle(PAL.water, 1);
    pond.fillEllipse(pondX, pondY, pondR * 2, pondR * 1.2);
    pond.fillStyle(PAL.waterMid, 0.8);
    pond.fillEllipse(pondX, pondY - 10, pondR * 1.7, pondR * 0.7);
    pond.fillStyle(PAL.waterHi, 0.55);
    pond.fillEllipse(pondX - pondR * 0.5, pondY - 16, pondR * 0.6, pondR * 0.18);
    // a couple of soft ripples
    for (let i = 0; i < 4; i++) {
      const r = pondR * (0.6 + i * 0.15);
      pond.lineStyle(1, PAL.waterHi, 0.18);
      pond.strokeEllipse(pondX, pondY, r * 2, r * 1.05);
    }
    // reeds + a dark stone
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      this.add.image(pondX - pondR + 10 + t * (pondR * 2), pondY - 22, "tuft").setOrigin(0.5, 1).setDepth(pondY + 1);
    }
    this.add.image(pondX + pondR * 0.6, pondY - 4, "rock").setOrigin(0.5, 1).setDepth(pondY + 1);

    // ---- the bench (with carving) ----------------------------------
    const bX = ox + pW * 0.62;
    const bY = oy + pH * 0.48;
    const bench = this.add.graphics();
    // shadow
    bench.fillStyle(PAL.shadow, 0.35);
    bench.fillRoundedRect(bX - 64, bY + 24, 128, 12, 4);
    // legs
    bench.fillStyle(PAL.woodDark, 1);
    bench.fillRect(bX - 56, bY - 4, 8, 32);
    bench.fillRect(bX + 48, bY - 4, 8, 32);
    // seat
    bench.fillStyle(PAL.woodMid, 1);
    bench.fillRoundedRect(bX - 62, bY - 4, 124, 10, 2);
    bench.fillStyle(PAL.woodHi, 0.4);
    bench.fillRect(bX - 60, bY - 3, 120, 2);
    // back rails
    bench.fillStyle(PAL.woodDark, 1);
    bench.fillRect(bX - 58, bY - 28, 6, 24);
    bench.fillRect(bX + 52, bY - 28, 6, 24);
    bench.fillStyle(PAL.woodMid, 1);
    bench.fillRoundedRect(bX - 56, bY - 30, 112, 8, 2);
    // the carving: ALEX — 47 (drawn as small dark scratches on the seat)
    const carve = this.add.text(bX, bY - 14, "ALEX — 47", { fontFamily: '"Spectral", serif', fontSize: "11px", color: hex(shade(PAL.woodDark, -0.2)), fontStyle: "italic 400" }).setOrigin(0.5).setDepth(bY + 1);
    void carve;
    this.bench = { x: bX, y: bY + 32 };

    // ---- a single old lamp post and a hint of trees ----------------
    this.add.image(ox + pW * 0.85, oy + pH * 0.35, "lamp").setOrigin(0.5, 1).setDepth(oy + pH * 0.35);
    // trees in the corners
    for (const [tx, ty] of [
      [ox + 60, oy + pH * 0.18],
      [right - 80, oy + pH * 0.22],
      [right - 110, bottom - 60],
    ] as const) {
      this.add.image(tx, ty, "tree_trunk").setOrigin(0.5, 1).setDepth(ty);
      this.add.image(tx, ty - 30, "tree_canopy").setOrigin(0.5, 0.78).setDepth(ty + 200);
    }
    // some flowers
    for (let i = 0; i < 22; i++) {
      const x = ox + 40 + Math.random() * (pW - 80);
      const y = oy + 80 + Math.random() * (pH - 160);
      this.add.image(x, y, Math.random() < 0.5 ? "flower" : "flower_v").setOrigin(0.5, 1).setDepth(y - 0.1).setAlpha(0.9);
    }

    // ---- the gate back to the community (south edge) --------------
    const gX = ox + pW * 0.18;
    const gY = bottom - 4;
    this.add.image(gX - 28, gY, "lamp").setOrigin(0.5, 1).setDepth(gY);
    this.add.image(gX + 28, gY, "lamp").setOrigin(0.5, 1).setDepth(gY);
    // a "way back" rectangle
    const gateG = this.add.graphics();
    gateG.fillStyle(PAL.panel, 0.6);
    gateG.fillRoundedRect(gX - 32, gY - 18, 64, 14, 6);
    gateG.lineStyle(1, PAL.panelEdgeHi, 0.7);
    gateG.strokeRoundedRect(gX - 32, gY - 18, 64, 14, 6);
    this.exit = { x: gX, y: gY - 6 };

    // ---- ambient embers / dust ------------------------------------
    this.add.particles(0, 0, "dot", {
      x: { min: ox, max: right },
      y: { min: oy, max: bottom },
      lifespan: { min: 2200, max: 4400 },
      speedY: { min: -10, max: -2 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.45, end: 0 },
      tint: [PAL.emberSoft, PAL.goldHi],
      frequency: 380,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
    });

    // ---- NPCs -----------------------------------------------------
    // Eli the kid relocates to the park from Day 2 onwards
    if (this.ctx.day >= 2) {
      const eliSpawn: NpcSpawn = {
        id: "kid",
        key: "npc_kid",
        altKey: "npc_kid_b",
        name: "Eli",
        x: bX - 90,
        y: bY + 12,
        roam: 0,
        dialog: DIALOGUES.kid,
      };
      this.eli = new Npc(this, eliSpawn);
    }
    // The cat sits near the pond by default
    const catSpawn: NpcSpawn = {
      id: "cat",
      key: "npc_kid",
      altKey: "npc_kid_b",
      name: "the cat",
      x: pondX + pondR + 40,
      y: pondY,
      roam: 0,
      dialog: DIALOGUES.cat ?? (() => [{ name: "the cat", portrait: "npc_kid", text: "the cat looks up at you. it does not blink." }]),
    };
    this.cat = new Npc(this, catSpawn);
    this.cat.setScale(0.65); // smaller than people

    // ---- Player -----------------------------------------------------
    this.player = new Player(this, this.exit.x, this.exit.y - 30, this.ctx, this.fx);
    this.player.surface = "grass";
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 16, oy - 16, pW + 32, pH + 32);

    // ---- solids: pond + tree colliders + edges --------------------
    const solids = this.physics.add.staticGroup();
    const w = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    w(ox + pW / 2, oy - 8, pW + 30, 18);
    w(ox + pW / 2, bottom + 6, pW + 30, 18);
    w(ox - 8, oy + pH / 2, 18, pH);
    w(right + 8, oy + pH / 2, 18, pH);
    w(pondX, pondY, pondR * 1.6, pondR * 0.9); // pond no-walk
    // bench has a small collider so the player stops at it
    w(this.bench.x, this.bench.y - 16, 130, 26);
    this.physics.add.collider(this.player, solids);

    // ---- Vignette + soft darkness ----------------------------------
    this.add.image(VIEW_W / 2, VIEW_H / 2, "vignette").setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(DEPTH.vignette).setAlpha(0.65);

    this.keyE = this.input.keyboard!.addKey("E");
    this.cameras.main.fadeIn(620, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.ui.showAreaBanner("The Little Park");
  }

  update() {
    if (this.player.dead || this.inDialog) {
      this.ui.hidePrompt();
      return;
    }
    type Target = "exit" | "bench" | "cat" | "eli" | null;
    let target: Target = null;
    const px = this.player.x;
    const py = this.player.y;
    if (Phaser.Math.Distance.Between(px, py, this.exit.x, this.exit.y) < 48) target = "exit";
    else if (Phaser.Math.Distance.Between(px, py, this.bench.x, this.bench.y) < 60) target = "bench";
    else if (Phaser.Math.Distance.Between(px, py, this.cat.x, this.cat.y) < 52) target = "cat";
    else if (this.eli && Phaser.Math.Distance.Between(px, py, this.eli.x, this.eli.y) < 56) target = "eli";

    const labels: Record<NonNullable<Target>, string> = {
      exit: "E  ·  back to the road",
      bench: "E  ·  read the carving",
      cat: "E  ·  the cat",
      eli: "E  ·  Eli",
    };
    if (target) this.ui.showPrompt(labels[target], this.player.x - this.cameras.main.worldView.x, this.player.y - this.cameras.main.worldView.y - 56);
    else this.ui.hidePrompt();

    if (target && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (target === "exit") this.exitPark();
      else if (target === "bench") this.readBench();
      else if (target === "cat") this.startDialog(this.cat);
      else if (target === "eli" && this.eli) this.startDialog(this.eli);
    }
  }

  private readBench() {
    if (this.benchExamined) {
      this.ui.toast("\"ALEX — 47\"  ·  carved deep, by someone who took their time", PAL.gloomGlow);
      return;
    }
    this.benchExamined = true;
    this.ctx.addNote("parkBench");
    Audio.chime(this);
    this.ui.toast("the bench has your name and a number carved into it.", PAL.gloomGlow);
    if (!this.ctx.inventory.faded_letter) this.ctx.addItem("faded_letter");
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

  private exitPark() {
    SFX.close();
    this.cameras.main.fadeOut(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop("Park");
      this.scene.wake("Game");
      this.gameScene.events.emit("park-exit", this.returnAt);
    });
  }
}

