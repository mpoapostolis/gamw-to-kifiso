/**
 * THE CLEANERS — the corner cafe Alex stops at on his way to work.
 *
 * Note for the integrator: there is an OLD `src/scenes/Cafe.ts` from a
 * previous game (Emberwilds) — this file is independent of it. We import
 * nothing from it; we register the Phaser scene key as "Cafe" here.
 *
 * Geometry: a wood-floored room, a counter along the north wall with an
 * espresso machine and a single hanging warm bulb above it, three small
 * round tables in the middle of the room, a Regular Customer at the
 * middle-left table with a folded newspaper. The barista stands behind
 * the counter.
 *
 * The story trick here is the barista's name-slip on Day 2+. He has been
 * making Alex's coffee for years. On Day 1 he calls Alex by name and asks
 * "the usual?" — completely friendly. On Day 2+ he says "ELIAS — sorry,
 * ALEX, ALEX of course." That correction is the fragment.
 *
 * Exits:
 *   • door south → Street
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

/** A tiny in-scene interactable. */
interface Spot {
  x: number;
  y: number;
  r: number;
  label: string;
  act: () => void;
}

const CAFE_BG = 0x1a1310;          // warm cafe shadow
const FLOOR = 0x3a2a20;            // dark wood floor
const FLOOR_HI = 0x55382a;         // wood highlight stripe
const WALL = 0x2a1d16;             // wood-panelled wall
const WALL_HI = 0x3f2c20;          // panel band highlight

export class CafeScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private spots: Spot[] = [];
  private prompt?: Phaser.GameObjects.Text;
  private spawn?: { x: number; y: number };
  private baristaSeen = false;

  constructor() {
    super("Cafe");
  }

  init(data: { spawn?: { x: number; y: number } } = {}) {
    this.spawn = data.spawn;
  }

  create() {
    SceneRouter.current = "Cafe";
    // The fragment for the barista's name-slip is only present on Day 2+.
    // We still register it in the manifest with a guard so the manifest
    // accurately describes the scene's possible memories.
    const day = GameState.state.dayIndex;
    registerManifest({
      id: "Cafe",
      label: "Cafe",
      palette: "day",
      ambient: "",
      exits: [{ to: "Street", label: "back to the street" }],
      fragments: day >= 2
        ? [
            {
              id: "frag_barista_wrong_name",
              journalText:
                "The barista called me by the wrong name today. He corrected himself a beat too quickly. He's been making my coffee for years.",
              awareness: 2,
            },
          ]
        : [],
    });

    this.ctx = dummyCtx();
    this.fx = dummyFx();

    // ---- room geometry ----------------------------------------------
    // 14 × 8 tiles — a small, warm cafe. The counter is along the north
    // wall, the tables are clustered south of the counter.
    const cols = 14;
    const rows = 8;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    const right = ox + rW;
    const bottom = oy + rH;

    this.cameras.main.setBackgroundColor(hex(CAFE_BG));

    // ---- FLOOR — warm planks running east-west.
    const floor = this.add.graphics();
    floor.fillStyle(FLOOR, 1);
    floor.fillRect(ox, oy, rW, rH);
    for (let r = 0; r < rows; r++) {
      floor.fillStyle(r % 2 === 0 ? FLOOR : FLOOR_HI, 1);
      floor.fillRect(ox, oy + r * TILE, rW, TILE);
      floor.lineStyle(1, shade(FLOOR, -0.25), 0.45);
      floor.lineBetween(ox, oy + r * TILE, right, oy + r * TILE);
    }

    // ---- BACK WALL — wood panelling, a coffee chalkboard above the
    //  counter, a brass-rimmed clock that always reads 7:42.
    const wall = this.add.graphics();
    wall.fillStyle(WALL, 1);
    wall.fillRect(ox - 24, oy - 100, rW + 48, 104);
    wall.fillStyle(WALL_HI, 0.7);
    wall.fillRect(ox - 24, oy - 100, rW + 48, 6);
    // wainscot panel band
    wall.fillStyle(shade(WALL, -0.18), 1);
    wall.fillRect(ox - 24, oy - 26, rW + 48, 26);
    wall.lineStyle(1, shade(WALL, -0.4), 0.6);
    for (let x = ox; x < right; x += TILE * 1.4) wall.lineBetween(x, oy - 26, x, oy - 2);
    // skirting
    wall.fillStyle(shade(FLOOR, -0.25), 1);
    wall.fillRect(ox - 24, bottom, rW + 48, 6);

    // chalkboard menu above the counter
    const chalkX = ox + TILE * 7;
    const chalkY = oy - 78;
    wall.fillStyle(shade(PAL.woodDark, -0.1), 1);
    wall.fillRect(chalkX - 36, chalkY, 84, 42);
    wall.fillStyle(0x1a2218, 1);
    wall.fillRect(chalkX - 33, chalkY + 3, 78, 36);
    wall.lineStyle(1, 0xc8b878, 0.7);
    wall.lineBetween(chalkX - 28, chalkY + 10, chalkX + 26, chalkY + 10);
    wall.lineBetween(chalkX - 28, chalkY + 16, chalkX + 18, chalkY + 16);
    wall.lineBetween(chalkX - 28, chalkY + 22, chalkX + 22, chalkY + 22);
    wall.lineBetween(chalkX - 28, chalkY + 28, chalkX + 14, chalkY + 28);

    // a small round wall clock, always reading the same time
    const clockX = ox + TILE * 11.5;
    const clockY = oy - 60;
    wall.fillStyle(PAL.woodDark, 1);
    wall.fillCircle(clockX, clockY, 16);
    wall.fillStyle(PAL.thatchHi, 1);
    wall.fillCircle(clockX, clockY, 13);
    wall.fillStyle(PAL.gold, 1);
    wall.fillCircle(clockX, clockY, 14);
    wall.fillStyle(PAL.thatchHi, 1);
    wall.fillCircle(clockX, clockY, 12);
    // hands — minute hand pointing up-left ~7:42-ish
    wall.lineStyle(2, 0x2a1a10, 1);
    wall.lineBetween(clockX, clockY, clockX - 8, clockY + 4); // hour
    wall.lineBetween(clockX, clockY, clockX - 4, clockY - 10); // minute

    // a single warm hanging bulb over the counter
    this.add
      .image(ox + rW * 0.45, oy - 22, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.6)
      .setAlpha(0.55);

    // ---- COUNTER (north side) ---------------------------------------
    // A long wooden counter with a brass-trimmed front and the espresso
    // machine sitting on top. The barista stands behind it.
    const cX = ox + TILE * 1.4;
    const cY = oy + TILE * 0.6;
    const cW = TILE * 11;
    const cH = TILE * 1.2;
    const counter = this.add.graphics().setDepth(cY + cH);
    counter.fillStyle(0x000000, 0.32);
    counter.fillRoundedRect(cX + 3, cY + cH - 3, cW, 8, 3);
    counter.fillStyle(PAL.woodDark, 1);
    counter.fillRoundedRect(cX, cY, cW, cH, 4);
    counter.fillStyle(PAL.woodMid, 1);
    counter.fillRoundedRect(cX + 3, cY + 3, cW - 6, cH - 9, 3);
    counter.fillStyle(PAL.woodHi, 0.45);
    counter.fillRect(cX + 3, cY + 3, cW - 6, 3);
    // brass trim along the front edge
    counter.fillStyle(PAL.gold, 0.8);
    counter.fillRect(cX + 3, cY + cH - 6, cW - 6, 2);
    counter.fillStyle(PAL.goldHi, 0.5);
    counter.fillRect(cX + 3, cY + cH - 6, cW - 6, 1);

    // ---- ESPRESSO MACHINE on the counter ----------------------------
    const emX = cX + cW * 0.65;
    const emY = cY - 10;
    const em = this.add.graphics().setDepth(cY + cH + 1);
    em.fillStyle(0x2a2226, 1);
    em.fillRoundedRect(emX - 24, emY - 24, 48, 28, 3);
    em.fillStyle(shade(0x2a2226, 0.2), 1);
    em.fillRoundedRect(emX - 22, emY - 22, 44, 6, 2);
    // group head + portafilter
    em.fillStyle(PAL.gold, 1);
    em.fillRect(emX - 14, emY + 2, 4, 8);
    em.fillRect(emX + 10, emY + 2, 4, 8);
    em.fillStyle(0x4a3a2a, 1);
    em.fillRect(emX - 16, emY + 10, 8, 4);
    em.fillRect(emX + 8, emY + 10, 8, 4);
    // a small white cup under one head
    em.fillStyle(PAL.thatchHi, 1);
    em.fillRoundedRect(emX + 9, emY + 14, 6, 4, 1);
    // steam wand
    em.lineStyle(2, PAL.goldHi, 0.8);
    em.lineBetween(emX + 24, emY - 12, emX + 30, emY + 6);

    // ---- TABLES (three small round tables, slightly off-grid) -------
    // Each table is a small wooden disc with a chair on either side.
    const tables: { x: number; y: number; r: number }[] = [
      { x: ox + TILE * 3.6, y: oy + TILE * 4, r: 22 },
      { x: ox + TILE * 7, y: oy + TILE * 5, r: 22 },
      { x: ox + TILE * 10.4, y: oy + TILE * 4, r: 22 },
    ];
    for (const t of tables) {
      const tG = this.add.graphics().setDepth(t.y + t.r);
      tG.fillStyle(0x000000, 0.32);
      tG.fillEllipse(t.x + 2, t.y + t.r + 2, t.r * 2.1, 8);
      tG.fillStyle(PAL.woodDark, 1);
      tG.fillCircle(t.x, t.y, t.r);
      tG.fillStyle(PAL.woodMid, 1);
      tG.fillCircle(t.x, t.y, t.r - 3);
      tG.fillStyle(PAL.woodHi, 0.45);
      tG.fillEllipse(t.x - 2, t.y - 4, t.r * 1.4, 6);
      // a small saucer + cup on each table
      tG.fillStyle(PAL.thatchHi, 0.92);
      tG.fillCircle(t.x - 4, t.y - 4, 5);
      tG.fillStyle(shade(PAL.thatchHi, -0.2), 1);
      tG.fillRect(t.x - 6, t.y - 4, 5, 3);
    }

    // The "sit a moment" interactable picks the nearest table.
    for (const t of tables) {
      this.spots.push({
        x: t.x,
        y: t.y,
        r: 50,
        label: "E  ·  sit a moment",
        act: () =>
          this.flashLine(
            "you sit. you watch the door. nothing happens.",
            2400,
          ),
      });
    }

    // ---- THE REGULAR — a slumped figure at the middle-left table.
    // A simple silhouette in a grey coat, hunched, holding a newspaper.
    const regX = tables[0].x;
    const regY = tables[0].y - 22;
    this.buildRegular(regX, regY);
    this.spots.push({
      x: regX,
      y: regY,
      r: 56,
      label: "E  ·  the regular",
      act: () =>
        this.flashLine(
          "his newspaper is folded to page seven. it was folded to page seven yesterday too.",
          3000,
        ),
    });

    // ---- THE BARISTA — bearded figure with an apron, behind the counter.
    const baX = emX - 36;
    const baY = cY - 16;
    this.buildBarista(baX, baY);
    this.spots.push({
      x: baX,
      y: cY + cH * 0.5,
      r: 64,
      label: "E  ·  the barista",
      act: () => this.greetBarista(),
    });

    // ---- DOOR (south wall, back to the street) ----------------------
    const doorX = ox + rW * 0.5;
    const doorY = bottom - 4;
    const dG = this.add.graphics().setDepth(doorY);
    dG.fillStyle(PAL.woodDark, 1);
    dG.fillRoundedRect(doorX - 24, doorY - 60, 48, 64, 3);
    dG.fillStyle(PAL.woodMid, 1);
    dG.fillRoundedRect(doorX - 22, doorY - 58, 44, 58, 2);
    dG.fillStyle(PAL.gold, 1);
    dG.fillCircle(doorX + 14, doorY - 32, 2);
    // a small "OPEN" sign in the glass
    dG.fillStyle(0xc8b878, 0.85);
    dG.fillRect(doorX - 10, doorY - 50, 20, 8);
    dG.lineStyle(1, 0x2a1a10, 1);
    dG.lineBetween(doorX - 6, doorY - 46, doorX + 6, doorY - 46);

    this.spots.push({
      x: doorX,
      y: doorY,
      r: 56,
      label: "E  ·  back to the street",
      act: () => SceneRouter.go(this, "Street"),
    });

    // ---- PLAYER -----------------------------------------------------
    const start = this.spawn ?? { x: doorX, y: doorY - 36 };
    this.player = new Player(this, start.x, start.y, this.ctx, this.fx);
    this.player.surface = "wood";
    this.player.setLanternRadius(105);
    this.cameras.main.startFollow(this.player, true, 0.22, 0.22);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 30, oy - 100, rW + 60, rH + 120);

    // ---- SOLIDS — walls, the counter, the tables (so you can't walk
    //   through them).
    const solids = this.physics.add.staticGroup();
    const wallBox = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    wallBox(ox + rW / 2, oy - 14, rW + 60, 28);
    wallBox(ox + rW / 2, bottom + 8, rW + 60, 28);
    wallBox(ox - 18, oy + rH / 2, 32, rH + 30);
    wallBox(right + 18, oy + rH / 2, 32, rH + 30);
    wallBox(cX + cW / 2, cY + cH / 2, cW, cH);
    for (const t of tables) wallBox(t.x, t.y, t.r * 2, t.r * 2);

    this.physics.add.collider(this.player, solids);

    // ---- input ------------------------------------------------------
    this.keyE = this.input.keyboard!.addKey("E");
    this.keyJ = this.input.keyboard!.addKey("J");

    // ---- VIGNETTE — warm sepia (it's a cafe).
    this.add
      .image(VIEW_W / 2, VIEW_H / 2, "vignette")
      .setScrollFactor(0)
      .setDisplaySize(VIEW_W, VIEW_H)
      .setDepth(9100)
      .setTint(0x6e3f1c)
      .setAlpha(0.7);

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

  /**
   * The barista — a small bearded figure in a long apron. He stands
   * behind the counter and is always doing something with a cloth and
   * a cup. We don't animate him; he's a static silhouette.
   */
  private buildBarista(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(y + 30);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 22, 30, 5);
    // long apron — deep cream
    g.fillStyle(shade(PAL.thatch, -0.2), 1);
    g.fillRoundedRect(-12, -2, 24, 26, 4);
    g.fillStyle(shade(PAL.thatch, 0.1), 0.7);
    g.fillRect(-12, -2, 24, 3);
    // apron tie at the waist
    g.fillStyle(shade(PAL.thatch, -0.4), 1);
    g.fillRect(-12, 6, 24, 2);
    // shirt under the apron
    g.fillStyle(PAL.cloakDark, 1);
    g.fillRect(-9, -6, 18, 6);
    // head
    g.fillStyle(PAL.skin, 1);
    g.fillEllipse(0, -14, 14, 16);
    // hair — short, dark
    g.fillStyle(PAL.hair, 1);
    g.fillRect(-7, -22, 14, 6);
    // beard
    g.fillStyle(shade(PAL.hair, -0.1), 1);
    g.fillRoundedRect(-5, -8, 10, 6, 2);
    // tiny eyes, looking forward at the player
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(-3, -14, 1, 1);
    g.fillRect(3, -14, 1, 1);
    c.add(g);
  }

  /**
   * The Regular — a slumped figure at a table, holding a folded paper.
   * Grey coat, hunched, looking down. Built as a container.
   */
  private buildRegular(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(y + 30);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 16, 24, 5);
    // grey coat — long, hunched
    g.fillStyle(0x5a5a64, 1);
    g.fillRoundedRect(-10, -6, 20, 24, 5);
    g.fillStyle(shade(0x5a5a64, 0.15), 0.55);
    g.fillRect(-10, -6, 20, 3);
    // hunched shoulders
    g.fillStyle(0x5a5a64, 1);
    g.fillTriangle(-12, -2, -8, -8, -4, -4);
    g.fillTriangle(12, -2, 8, -8, 4, -4);
    // head — looking down
    g.fillStyle(PAL.skin, 1);
    g.fillEllipse(0, -14, 13, 14);
    // hair — grey-brown, balding
    g.fillStyle(0x6a5a50, 1);
    g.fillRect(-6, -20, 12, 4);
    // newspaper held in front of the chest
    g.fillStyle(PAL.thatchHi, 0.95);
    g.fillRect(-10, 2, 20, 12);
    g.fillStyle(shade(PAL.thatchHi, -0.2), 1);
    g.fillRect(-10, 2, 20, 2);
    // a few column rules so the paper reads as a paper
    g.lineStyle(1, PAL.inkDim, 0.7);
    g.lineBetween(-7, 6, 6, 6);
    g.lineBetween(-7, 9, 5, 9);
    g.lineBetween(-7, 12, 3, 12);
    c.add(g);
  }

  /**
   * Approach + E on the barista. On Day 1 a friendly greeting that
   * doesn't surface anything. On Day 2+ he calls Alex by the wrong name
   * first ("ELIAS") and corrects himself — that correction is the
   * fragment. Repeated visits on Day 2+ don't double-add the fragment.
   */
  private greetBarista() {
    const day = GameState.state.dayIndex;
    const name = GameState.state.playerName;
    if (day === 1) {
      this.flashLine(
        `he calls you by your name. "the usual?" he says. you say yes. you don't know what the usual is.`,
        3400,
      );
      return;
    }
    // Day 2+ — name slip. We use ELIAS / ALEX as canonical wrong/right.
    // (The fragment journal entry doesn't bake in either name — it just
    // says "the wrong name".)
    if (!this.baristaSeen) {
      this.baristaSeen = true;
      this.flashLine(
        `he calls you ELIAS. then a beat too quickly: "sorry — ${name}. ${name} of course." he laughs.`,
        3800,
      );
      GameState.addFragment("frag_barista_wrong_name", 2);
      GameState.addJournalEntry(
        "The barista called me by the wrong name today. He corrected himself a beat too quickly. He's been making my coffee for years.",
        { fragmentId: "frag_barista_wrong_name" },
      );
      return;
    }
    this.flashLine(
      "he is wiping the same cup. he doesn't look at you this time.",
      2400,
    );
  }

  /** Standard fading toast. */
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
    this.tweens.add({
      targets: t,
      alpha: { from: 0, to: 1 },
      duration: 300,
      yoyo: true,
      hold: ms,
      onComplete: () => t.destroy(),
    });
  }

  update() {
    if (!this.player) return;
    if (this.player.controlsLocked) {
      this.prompt?.setVisible(false);
      return;
    }

    // ---- pick nearest spot, show prompt, take E ---------------------
    let best: Spot | null = null;
    let bestD = Infinity;
    for (const s of this.spots) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      if (d < s.r && d < bestD) {
        bestD = d;
        best = s;
      }
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
