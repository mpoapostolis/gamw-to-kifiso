/**
 * THE CLEANERS — Street.
 *
 * The block outside Alex's building. A widening sidewalk, a warm sodium
 * streetlight that flickers like it is trying to spell something, a corner
 * shop with its shopkeeper sweeping the same square of pavement he sweeps
 * every morning, and a bus stop sign whose timetable hasn't been updated
 * since 1989.
 *
 * The whole point of the scene is its three small wrongnesses. None of them
 * are loud; together they tell Alex that the street is a habit pretending
 * to be a place. The streetlight pattern is the only one that surfaces a
 * fragment on Day 1 — the shopkeeper's incuriosity and the dead timetable
 * are mood, not memory.
 *
 * Exits:
 *   • south door → Stairwell (back inside the building)
 *   • east path  → Cafe
 *   • south-edge → Metro (down the steps to the platform)
 *
 * Palette: slightly cooler than the apartment — pre-dawn sky overhead and
 * a sodium pool around the lamppost that is the only real warmth.
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

const STREET_BG = 0x141019;       // a very cold pre-dawn purple-black
const PAVE = 0x2a2530;            // sidewalk slab
const PAVE_HI = 0x3d3744;         // worn highlight on the slab edge
const ROAD = 0x16131a;            // asphalt strip
const SODIUM = 0xffb267;          // the warm pool from the streetlight

export class StreetScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private spots: Spot[] = [];
  private prompt?: Phaser.GameObjects.Text;
  private spawn?: { x: number; y: number };
  private streetlightExamined = false;

  /** The streetlight's lamp graphic — we modulate its alpha for a flicker. */
  private lamp?: Phaser.GameObjects.Image;
  /** The shopkeeper's broom — we sweep it left/right with a tween. */
  private broom?: Phaser.GameObjects.Rectangle;

  constructor() {
    super("Street");
  }

  init(data: { spawn?: { x: number; y: number } } = {}) {
    this.spawn = data.spawn;
  }

  create() {
    SceneRouter.current = "Street";
    registerManifest({
      id: "Street",
      label: "Street",
      palette: "day",
      ambient: "",
      exits: [
        { to: "Stairwell", label: "back inside" },
        { to: "Cafe", label: "the cafe" },
        { to: "Metro", label: "down to the metro" },
      ],
      fragments: [
        {
          id: "frag_streetlight_pattern",
          journalText:
            "The streetlight outside flickered in a pattern: short, short, long. Like a word.",
          awareness: 1,
        },
      ],
    });

    this.ctx = dummyCtx();
    this.fx = dummyFx();

    // ---- street geometry --------------------------------------------
    // A wide sidewalk centred in view, with a road strip running along
    // the south edge and a vague shop frontage to the north-east.
    const cols = 17;
    const rows = 7;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    const right = ox + rW;
    const bottom = oy + rH;

    this.cameras.main.setBackgroundColor(hex(STREET_BG));

    // ---- ROAD (south strip — the kerb is the bottom of the sidewalk).
    const road = this.add.graphics();
    road.fillStyle(ROAD, 1);
    road.fillRect(ox - 60, bottom - 18, rW + 120, 80);
    // a faded dashed centreline on the asphalt
    road.fillStyle(shade(ROAD, 0.4), 0.6);
    for (let x = ox; x < right; x += 32) {
      road.fillRect(x, bottom + 18, 14, 2);
    }
    // a soft kerb edge
    road.fillStyle(shade(PAVE, -0.25), 1);
    road.fillRect(ox - 60, bottom - 22, rW + 120, 4);

    // ---- SIDEWALK SLABS ---------------------------------------------
    // A simple grid of paving stones with a wider seam every 3 cells, so
    // the eye reads "stone slabs" rather than "tile".
    const pave = this.add.graphics();
    pave.fillStyle(PAVE, 1);
    pave.fillRect(ox, oy, rW, rH - 22);
    // slab seams
    pave.lineStyle(1, shade(PAVE, -0.3), 0.6);
    for (let c = 0; c <= cols; c += 2) pave.lineBetween(ox + c * TILE, oy, ox + c * TILE, oy + rH - 22);
    for (let r = 0; r <= rows; r += 2) pave.lineBetween(ox, oy + r * TILE, right, oy + r * TILE);
    // a few scuffed highlight patches
    pave.fillStyle(PAVE_HI, 0.18);
    pave.fillRect(ox + TILE * 4, oy + TILE * 2.6, TILE * 1.8, TILE * 1.2);
    pave.fillRect(ox + TILE * 10, oy + TILE * 4.4, TILE * 2.4, TILE * 0.8);

    // ---- BUILDING FRONT (north wall — the apartment building) -------
    // A tall plaster face with the front door (the way back to the
    // stairwell) and a couple of dim windows above.
    const wall = this.add.graphics();
    wall.fillStyle(shade(PAL.thatch, -0.55), 1);
    wall.fillRect(ox - 60, oy - 120, rW + 120, 124);
    // a band of rougher render at street level
    wall.fillStyle(shade(PAL.thatch, -0.7), 1);
    wall.fillRect(ox - 60, oy - 28, rW + 120, 24);
    // two windows up top — dim, curtains drawn
    for (const wx of [ox + TILE * 2, ox + TILE * 6]) {
      wall.fillStyle(shade(PAL.thatch, -0.85), 1);
      wall.fillRect(wx, oy - 96, 38, 30);
      wall.fillStyle(0x3a2e26, 0.85);
      wall.fillRect(wx + 2, oy - 94, 34, 26);
      // a faint warm gleam — someone's awake up there
      wall.fillStyle(SODIUM, 0.18);
      wall.fillRect(wx + 4, oy - 92, 30, 8);
    }

    // ---- SHOP FRONT (east side of the wall, with a sign) -----------
    // A narrow corner shop set into the north wall. Dark glass, a small
    // sign overhead, and an awning's worth of warm light spilling out.
    const shopX = ox + rW * 0.62;
    const shopW = TILE * 4;
    // signboard
    wall.fillStyle(shade(PAL.woodDark, -0.05), 1);
    wall.fillRect(shopX, oy - 64, shopW, 18);
    wall.fillStyle(shade(PAL.gold, -0.15), 1);
    wall.fillRect(shopX + 2, oy - 62, shopW - 4, 14);
    // illegible "sign" — three horizontal ink bars (Spectral feel)
    wall.lineStyle(1, 0x2a1a10, 0.9);
    wall.lineBetween(shopX + 14, oy - 58, shopX + shopW - 18, oy - 58);
    wall.lineBetween(shopX + 14, oy - 55, shopX + shopW - 22, oy - 55);
    wall.lineBetween(shopX + 14, oy - 52, shopX + shopW - 14, oy - 52);
    // shopfront window — dark with a warm interior pool
    wall.fillStyle(0x0e0a08, 1);
    wall.fillRect(shopX + 4, oy - 44, shopW - 8, 40);
    wall.fillStyle(SODIUM, 0.22);
    wall.fillRect(shopX + 6, oy - 42, shopW - 12, 16);

    // ---- DOOR BACK INTO THE BUILDING (south face of the apartment) --
    // Centred in the north wall, a worn wooden door with a brass handle.
    const doorX = ox + TILE * 3;
    const doorY = oy - 4;
    const dG = this.add.graphics().setDepth(doorY);
    dG.fillStyle(PAL.woodDark, 1);
    dG.fillRoundedRect(doorX - 24, doorY - 60, 48, 64, 3);
    dG.fillStyle(PAL.woodMid, 1);
    dG.fillRoundedRect(doorX - 22, doorY - 58, 44, 58, 2);
    dG.fillStyle(PAL.gold, 1);
    dG.fillCircle(doorX + 14, doorY - 32, 2);

    this.spots.push({
      x: doorX,
      y: doorY,
      r: 56,
      label: "E  ·  back inside",
      act: () => SceneRouter.go(this, "Stairwell"),
    });

    // ---- STREETLIGHT (sodium pool, west of centre) -------------------
    // A simple lamppost with a warm round bulb. We render the bulb as a
    // glow_warm image so we can flicker its alpha in update().
    const lampX = ox + TILE * 4.5;
    const lampY = oy + TILE * 2.4;
    const lampG = this.add.graphics().setDepth(lampY + 20);
    // post
    lampG.fillStyle(shade(PAL.woodDark, -0.05), 1);
    lampG.fillRect(lampX - 2, lampY - 10, 4, TILE * 2.6);
    // base
    lampG.fillStyle(shade(PAL.woodDark, -0.2), 1);
    lampG.fillRect(lampX - 6, lampY + TILE * 2.4, 12, 6);
    // armature at the top
    lampG.lineStyle(2, shade(PAL.woodDark, -0.05), 1);
    lampG.lineBetween(lampX, lampY - 10, lampX, lampY - 28);
    lampG.lineBetween(lampX - 1, lampY - 28, lampX + 14, lampY - 36);
    // a small lantern housing
    lampG.fillStyle(shade(PAL.woodDark, -0.2), 1);
    lampG.fillRoundedRect(lampX + 8, lampY - 44, 14, 14, 3);
    // bulb glow — modulated in update for the flicker pattern
    this.lamp = this.add
      .image(lampX + 15, lampY - 36, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.4)
      .setAlpha(0.85)
      .setDepth(lampY + 30);
    // a soft warm puddle on the sidewalk below
    const puddle = this.add.graphics().setDepth(lampY + 5);
    puddle.fillStyle(SODIUM, 0.16);
    puddle.fillEllipse(lampX + 4, lampY + TILE * 2.7, 160, 60);
    puddle.fillStyle(SODIUM, 0.1);
    puddle.fillEllipse(lampX + 4, lampY + TILE * 2.7, 230, 90);

    this.spots.push({
      x: lampX + 6,
      y: lampY + TILE * 2.4,
      r: 70,
      label: "E  ·  the streetlight",
      act: () => this.examineStreetlight(),
    });

    // ---- BUS STOP SIGN (south-west, near the kerb) ------------------
    const busX = ox + TILE * 2;
    const busY = bottom - 30;
    const bus = this.add.graphics().setDepth(busY + 10);
    bus.fillStyle(shade(PAL.woodDark, -0.05), 1);
    bus.fillRect(busX - 2, busY - 80, 4, 80);
    bus.fillStyle(shade(PAL.woodDark, -0.2), 1);
    bus.fillRect(busX - 5, busY, 10, 4);
    // the sign plate
    bus.fillStyle(0xc8b878, 1);
    bus.fillRect(busX - 22, busY - 100, 44, 28);
    bus.fillStyle(shade(0xc8b878, -0.18), 1);
    bus.fillRect(busX - 22, busY - 100, 44, 4);
    // a bus icon (a fat rectangle with two little wheels)
    bus.fillStyle(0x2a1a10, 1);
    bus.fillRoundedRect(busX - 16, busY - 92, 32, 12, 2);
    bus.fillStyle(0x0a0606, 1);
    bus.fillCircle(busX - 10, busY - 78, 1.6);
    bus.fillCircle(busX + 10, busY - 78, 1.6);
    // timetable lines underneath — illegible squiggles
    bus.lineStyle(1, 0x2a1a10, 0.85);
    bus.lineBetween(busX - 16, busY - 78, busX + 16, busY - 78);
    bus.lineBetween(busX - 16, busY - 74, busX + 14, busY - 74);

    this.spots.push({
      x: busX,
      y: busY - 40,
      r: 56,
      label: "E  ·  the bus stop sign",
      act: () =>
        this.flashLine(
          "the timetable is from 1989. nobody has noticed.",
        ),
    });

    // ---- SHOPKEEPER (sweeping in front of the shop) -----------------
    // A simple bearded figure with an apron. He stands at the shop door
    // and sweeps a small patch of pavement with a thin wooden broom that
    // never quite moves anything.
    const skX = shopX + shopW * 0.5;
    const skY = oy + TILE * 0.9;
    this.buildShopkeeper(skX, skY);

    this.spots.push({
      x: skX,
      y: skY + 10,
      r: 56,
      label: "E  ·  the shopkeeper",
      act: () =>
        this.flashLine(
          "he doesn't look up. the broom keeps moving. you wonder if he ever notices anyone.",
          3000,
        ),
    });

    // ---- PATH EAST (to the Cafe) ------------------------------------
    // A subtle arrow-of-pavement leading off-screen to the east. We just
    // mark a hot-zone near the east edge of the sidewalk.
    this.spots.push({
      x: right - 16,
      y: oy + TILE * 3,
      r: 64,
      label: "E  ·  the cafe (east)",
      act: () => SceneRouter.go(this, "Cafe"),
    });

    // ---- STAIRS DOWN TO METRO (south-east edge, off the kerb) -------
    // A small stepped descent into the metro station — we draw three steps
    // disappearing into the road and a faint cool glow rising from below.
    const metroX = right - TILE * 2.4;
    const metroY = bottom - 12;
    const mG = this.add.graphics().setDepth(metroY + 10);
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      mG.fillStyle(shade(0x1a1622, -0.05 - t * 0.2), 1);
      mG.fillRect(metroX + i * 4, metroY - i * 4, 50 - i * 6, 6);
    }
    // a tiny "M" sign above the stairwell
    mG.fillStyle(0x3a2a4a, 1);
    mG.fillRect(metroX + 20, metroY - 36, 18, 14);
    mG.fillStyle(0xddd8e8, 1);
    mG.fillRect(metroX + 26, metroY - 32, 6, 6);
    // a cool blue puddle of light rising from the steps
    this.add
      .image(metroX + 24, metroY - 4, "glow_violet")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.8)
      .setAlpha(0.4)
      .setDepth(metroY + 4);

    this.spots.push({
      x: metroX + 24,
      y: metroY + 4,
      r: 64,
      label: "E  ·  down to the metro",
      act: () => SceneRouter.go(this, "Metro"),
    });

    // ---- PLAYER -----------------------------------------------------
    const start = this.spawn ?? { x: doorX, y: doorY + 36 };
    this.player = new Player(this, start.x, start.y, this.ctx, this.fx);
    this.player.surface = "grass";
    this.player.setLanternRadius(115);
    this.cameras.main.startFollow(this.player, true, 0.22, 0.22);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 30, oy - 120, rW + 60, rH + 140);

    // ---- SOLIDS — wall along the north, kerb along the south.
    const solids = this.physics.add.staticGroup();
    const wallBox = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    // building wall (north)
    wallBox(ox + rW / 2, oy - 28, rW + 120, 56);
    // the road (south) — we let the player stand on the kerb but not in traffic
    wallBox(ox + rW / 2, bottom + 18, rW + 120, 40);
    // east + west off-screen bounds
    wallBox(ox - 18, oy + rH / 2, 32, rH + 30);
    wallBox(right + 18, oy + rH / 2, 32, rH + 30);
    // the streetlight post
    wallBox(lampX, lampY + TILE, 8, TILE * 2);
    // the bus stop pole
    wallBox(busX, busY - 40, 8, 80);

    this.physics.add.collider(this.player, solids);

    // ---- input ------------------------------------------------------
    this.keyE = this.input.keyboard!.addKey("E");
    this.keyJ = this.input.keyboard!.addKey("J");

    // ---- VIGNETTE — cooler than the apartment, slightly mauve-warm.
    this.add
      .image(VIEW_W / 2, VIEW_H / 2, "vignette")
      .setScrollFactor(0)
      .setDisplaySize(VIEW_W, VIEW_H)
      .setDepth(9100)
      .setTint(0x4a2a1c)
      .setAlpha(0.72);

    // ---- prompt ------------------------------------------------------
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

    // ---- BROOM SWEEP (subtle ambient animation) --------------------
    if (this.broom) {
      this.tweens.add({
        targets: this.broom,
        angle: { from: -10, to: 18 },
        duration: 1400,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }

    this.cameras.main.fadeIn(380, 0, 0, 0);
  }

  /**
   * The shopkeeper — a small bearded figure with an apron and a broom.
   * He stands at his shop door and sweeps the same square of pavement.
   * He never makes eye contact. The broom is stored on the scene so we
   * can swing it gently from create().
   */
  private buildShopkeeper(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(y + 30);
    const g = this.add.graphics();
    // shadow
    g.fillStyle(0x000000, 0.32);
    g.fillEllipse(0, 20, 26, 5);
    // body — a long apron
    g.fillStyle(shade(PAL.thatch, -0.5), 1);
    g.fillRoundedRect(-10, -4, 20, 22, 4);
    g.fillStyle(shade(PAL.thatch, -0.35), 0.7);
    g.fillRect(-10, -4, 20, 3);
    // apron pocket
    g.lineStyle(1, shade(PAL.thatch, -0.7), 0.6);
    g.strokeRect(-6, 4, 12, 6);
    // shirt collar peeking out at the top
    g.fillStyle(shade(PAL.cloak, -0.2), 1);
    g.fillRect(-8, -6, 16, 4);
    // head — a tan oval
    g.fillStyle(PAL.skin, 1);
    g.fillEllipse(0, -14, 14, 16);
    // hair — short, dark
    g.fillStyle(PAL.hair, 1);
    g.fillRect(-7, -22, 14, 6);
    g.fillRect(-7, -22, 4, 10);
    // beard — a small dark patch under the chin
    g.fillStyle(shade(PAL.hair, -0.1), 1);
    g.fillRoundedRect(-5, -8, 10, 5, 2);
    // tiny eye dots, looking DOWN at the broom
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(-3, -13, 1, 1);
    g.fillRect(3, -13, 1, 1);
    c.add(g);

    // The broom — a thin angled rectangle in the figure's hand.
    // We anchor it at the hand so the rotation pivots correctly.
    this.broom = this.add.rectangle(8, 4, 3, 28, shade(PAL.woodDark, 0.05));
    this.broom.setOrigin(0.5, 0).setAngle(-8);
    c.add(this.broom);
    // a tuft at the end of the broom
    const tuft = this.add.graphics();
    tuft.fillStyle(shade(PAL.gold, -0.3), 1);
    tuft.fillTriangle(8 + 14, 4 + 28, 8 + 0, 4 + 32, 8 + 14 + 6, 4 + 30);
    c.add(tuft);
  }

  /**
   * Approach + E on the streetlight. First time: flickers in a SHORT,
   * SHORT, LONG pattern (we don't even need to do the actual flickering
   * morse — the journal entry tells the player it WAS a pattern). Drops
   * the fragment. Subsequent visits: just a flicker line, no fragment.
   */
  private examineStreetlight() {
    this.flashLine("it flickers. once. twice. once. a pattern. then it stops.");
    if (!this.streetlightExamined) {
      this.streetlightExamined = true;
      GameState.addFragment("frag_streetlight_pattern", 1);
      GameState.addJournalEntry(
        "The streetlight outside flickered in a pattern: short, short, long. Like a word.",
        { fragmentId: "frag_streetlight_pattern" },
      );
    }
    // Trigger a quick "tell me you saw it" flicker on the bulb itself.
    if (this.lamp) {
      const lamp = this.lamp;
      this.tweens.add({
        targets: lamp,
        alpha: { from: 0.2, to: 0.85 },
        duration: 120,
        yoyo: true,
        repeat: 3,
        onComplete: () => lamp.setAlpha(0.85),
      });
    }
  }

  /** Toast that fades — same pattern as Bedroom/LivingRoom. */
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

    // ---- streetlight idle flicker (very subtle, always running) -----
    if (this.lamp) {
      // a tiny breathing flicker so the lamp never reads as fully solid
      const f = 0.82 + Math.sin(this.time.now * 0.006) * 0.05;
      // only override if no manual flicker tween is running
      if (!this.tweens.isTweening(this.lamp)) this.lamp.setAlpha(f);
    }

    // ---- interactable prompts ---------------------------------------
    if (this.player.controlsLocked) {
      this.prompt?.setVisible(false);
      return;
    }
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

    // ---- journal toggle ---------------------------------------------
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.scene.launch("Journal");
      this.scene.pause();
    }
  }
}
