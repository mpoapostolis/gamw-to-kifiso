/**
 * THE CLEANERS — Stairwell.
 *
 * The communal corridor of Alex's apartment block. He's just stepped out
 * the front door of the LivingRoom and is now in the cold-warm gloom of
 * the building's hallway: a row of brass-numbered mailboxes on the east
 * wall, a (perpetually) out-of-order elevator in the middle, and a flight
 * of stairs to the north leading out to the Street.
 *
 * Mrs. K — the elderly tenant from down the hall — happens to be by the
 * mailboxes today. She is a small, grey-woollen, kind-eyed figure. Her
 * dialogue on Day 1 is harmless on the surface: "you look just like your
 * father did yesterday, dear." She means it as a compliment. It is, of
 * course, the first fragment Alex picks up outside his own apartment —
 * because the word "yesterday" is doing a great deal of work in that
 * sentence and his own father has been dead for years.
 *
 * Exits:
 *   • south door → LivingRoom (back inside)
 *   • north stairs → Street
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL, shade } from "../../palette";
import { TILE } from "../../textures";
import { SceneRouter } from "../../state/sceneRouter";
import { registerManifest } from "../../state/sceneManifest";
import { Player } from "../../objects/Player";
import { addDoorBeacon } from "./doorBeacon";
import { openJournal } from "./journalUtil";
import { applyPostFX, type CleanersFXPipeline } from "../../fx/postProcess";
import { surfaceFragment } from "../../cleaners/fragmentSurface";
import { ensureHud } from "./Hud";
import { fireTutorial, TUT_OUT_OF_APARTMENT } from "../../cleaners/tutorial";
import { dummyCtx, dummyFx } from "./ctx";
import type { Fx, GameCtx } from "../../types";

/** A tiny in-scene interactable: a hit-circle + label + action. */
interface Spot {
  x: number;
  y: number;
  r: number;
  label: string;
  act: () => void;
}

// Slightly cooler sepia than the apartment — fluorescent-tinged hallway.
const HALL_BG = 0x1a1310;       // corridor shadow
const HALL_FLOOR = 0x2e2620;    // worn brown linoleum
const HALL_FLOOR_HI = 0x3f342a; // tile highlight (under the lights)
const HALL_WALL = 0x2c241e;     // back wall — warm cream that has aged
const HALL_WALL_HI = 0x3f342a;  // wall highlight band

export class StairwellScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private spots: Spot[] = [];
  private prompt?: Phaser.GameObjects.Text;
  private spawn?: { x: number; y: number };
  private mrsKMet = false;
  fxPipeline: CleanersFXPipeline | null = null;

  constructor() {
    super("Stairwell");
  }

  init(data: { spawn?: { x: number; y: number } } = {}) {
    this.spawn = data.spawn;
  }

  create() {
    SceneRouter.current = "Stairwell";
    registerManifest({
      id: "Stairwell",
      label: "Stairwell",
      palette: "day",
      ambient: "",
      exits: [
        { to: "LivingRoom", label: "back inside" },
        { to: "Street", label: "out to the street" },
      ],
      fragments: [
        {
          id: "frag_mrs_k_father",
          journalText:
            "Mrs. K from down the hall said I look like my father did yesterday. I don't know what she means by yesterday.",
          awareness: 2,
        },
      ],
    });

    this.ctx = dummyCtx();
    this.fx = dummyFx();

    // ---- corridor geometry -------------------------------------------
    // A long-ish horizontal room: 15 × 7 tiles, so the mailboxes and the
    // elevator and the stairs each get their own pocket of space.
    const cols = 15;
    const rows = 7;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    const right = ox + rW;
    const bottom = oy + rH;

    this.cameras.main.setBackgroundColor(hex(HALL_BG));

    // ---- FLOOR — institutional brown linoleum with subtle tile seams.
    const floor = this.add.graphics();
    floor.fillStyle(HALL_FLOOR, 1);
    floor.fillRect(ox, oy, rW, rH);
    // a faint chequer to suggest linoleum tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) {
          floor.fillStyle(HALL_FLOOR_HI, 0.35);
          floor.fillRect(ox + c * TILE, oy + r * TILE, TILE, TILE);
        }
      }
    }
    // grout lines
    floor.lineStyle(1, shade(HALL_FLOOR, -0.3), 0.5);
    for (let r = 0; r <= rows; r++) floor.lineBetween(ox, oy + r * TILE, right, oy + r * TILE);
    for (let c = 0; c <= cols; c++) floor.lineBetween(ox + c * TILE, oy, ox + c * TILE, bottom);

    // ---- BACK WALL — beige plaster that has yellowed with cigarette
    //   smoke and decades. A high horizontal moulding strip.
    const wall = this.add.graphics();
    wall.fillStyle(HALL_WALL, 1);
    wall.fillRect(ox - 24, oy - 80, rW + 48, 84);
    wall.fillStyle(HALL_WALL_HI, 0.7);
    wall.fillRect(ox - 24, oy - 80, rW + 48, 6);
    // a dado rail across the wall
    wall.fillStyle(shade(HALL_WALL, -0.2), 1);
    wall.fillRect(ox - 24, oy - 32, rW + 48, 4);
    wall.fillStyle(shade(HALL_WALL, 0.05), 0.4);
    wall.fillRect(ox - 24, oy - 28, rW + 48, 2);
    // skirting
    wall.fillStyle(shade(HALL_FLOOR, -0.3), 1);
    wall.fillRect(ox - 24, bottom, rW + 48, 6);

    // a single ceiling fluorescent flickering somewhere off-screen — we
    // suggest it with a soft warm wash on the north wall
    this.add
      .image(ox + rW * 0.55, oy - 40, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.4)
      .setAlpha(0.35);

    // ---- MAILBOXES (east-ish, on the back wall) ----------------------
    // Four brass-numbered boxes in a row. Alex's (number 3) has a corner
    // of a letter sticking out — visible without opening.
    const mbX = ox + TILE * 9.4;
    const mbY = oy - 18;
    const mbW = TILE * 4;
    const mbH = TILE * 0.7;
    const mb = this.add.graphics().setDepth(mbY + mbH);
    mb.fillStyle(shade(PAL.woodDark, -0.1), 1);
    mb.fillRoundedRect(mbX, mbY, mbW, mbH, 3);
    mb.fillStyle(PAL.woodMid, 1);
    mb.fillRoundedRect(mbX + 2, mbY + 2, mbW - 4, mbH - 4, 2);
    // four little box doors
    const slotW = (mbW - 8) / 4;
    for (let i = 0; i < 4; i++) {
      const sx = mbX + 4 + i * slotW;
      mb.fillStyle(shade(PAL.woodDark, -0.05), 1);
      mb.fillRoundedRect(sx, mbY + 4, slotW - 2, mbH - 8, 1);
      // brass number plate
      mb.fillStyle(PAL.gold, 0.85);
      mb.fillRect(sx + slotW * 0.4, mbY + 6, 6, 4);
      // a tiny keyhole
      mb.fillStyle(0x0a0606, 1);
      mb.fillCircle(sx + slotW * 0.55, mbY + mbH - 8, 0.8);
      // letter slot
      mb.fillStyle(0x0a0606, 1);
      mb.fillRect(sx + 4, mbY + mbH - 5, slotW - 8, 1);
    }
    // a corner of a letter sticking out of box 3
    mb.fillStyle(PAL.thatchHi, 0.95);
    mb.fillRect(mbX + 4 + 2 * slotW + 4, mbY + mbH - 6, 8, 5);
    mb.fillStyle(shade(PAL.thatchHi, -0.2), 1);
    mb.fillRect(mbX + 4 + 2 * slotW + 10, mbY + mbH - 6, 2, 5);

    this.spots.push({
      x: mbX + mbW / 2,
      y: mbY + mbH + 12,
      r: 60,
      label: "E  ·  the mailboxes",
      act: () =>
        this.flashLine(
          "yours has a letter sticking out. you'll come back for it.",
        ),
    });

    // ---- ELEVATOR (middle) -------------------------------------------
    // A pair of steel doors and an OUT OF ORDER sign taped at chest height.
    const elX = ox + rW * 0.5 - 32;
    const elY = oy - 70;
    const elW = 64;
    const elH = 76;
    const el = this.add.graphics().setDepth(elY + elH);
    // frame
    el.fillStyle(shade(PAL.woodDark, -0.2), 1);
    el.fillRect(elX - 6, elY - 4, elW + 12, elH + 10);
    // steel doors — a cool grey, two leaves with a vertical seam
    el.fillStyle(0x4a4a52, 1);
    el.fillRect(elX, elY, elW, elH);
    el.fillStyle(0x5e5e68, 0.8);
    el.fillRect(elX + 2, elY + 2, elW - 4, 4);
    el.lineStyle(1, 0x2a2a30, 1);
    el.lineBetween(elX + elW / 2, elY, elX + elW / 2, elY + elH);
    // call panel — a small black square with a glowing red arrow
    el.fillStyle(0x111111, 1);
    el.fillRect(elX + elW + 6, elY + 14, 8, 14);
    el.fillStyle(0x8a3a2a, 1);
    el.fillTriangle(
      elX + elW + 10, elY + 18,
      elX + elW + 8, elY + 24,
      elX + elW + 12, elY + 24,
    );
    // yellowed sign taped to the door
    el.fillStyle(0xc8b878, 1);
    el.fillRect(elX + 8, elY + 30, elW - 16, 22);
    el.fillStyle(shade(0xc8b878, -0.18), 1);
    el.fillRect(elX + 8, elY + 30, elW - 16, 3);
    el.lineStyle(1, 0x2a1a10, 0.85);
    el.lineBetween(elX + 12, elY + 36, elX + elW - 12, elY + 36);
    el.lineBetween(elX + 12, elY + 40, elX + elW - 14, elY + 40);
    el.lineBetween(elX + 12, elY + 44, elX + elW - 16, elY + 44);

    this.spots.push({
      x: elX + elW / 2,
      y: elY + elH + 6,
      r: 60,
      label: "E  ·  the elevator",
      act: () =>
        this.flashLine(
          "the OUT OF ORDER sign is yellowed. it has been yellowed for three weeks.",
        ),
    });

    // ---- STAIRS UP (north, leading to the street) --------------------
    // A simple stepped wedge against the back wall, north end of the room.
    const stX = ox + TILE * 1.2;
    const stY = oy - 70;
    const stW = TILE * 2.6;
    const stH = 70;
    const stairs = this.add.graphics().setDepth(stY + stH);
    // step risers — four bands of decreasing brightness as they recede
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const stepY = stY + i * (stH / steps);
      stairs.fillStyle(shade(PAL.woodDark, -0.05 - t * 0.18), 1);
      stairs.fillRect(stX - i * 3, stepY, stW + i * 6, stH / steps + 1);
      // a thin highlight on each tread edge
      stairs.fillStyle(shade(PAL.woodHi, -t * 0.3), 0.55);
      stairs.fillRect(stX - i * 3, stepY, stW + i * 6, 2);
    }
    // a faint warm halo at the top — "outside is just up there"
    this.add
      .image(stX + stW / 2, stY - 6, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.1)
      .setAlpha(0.4);

    addDoorBeacon(this, stX + stW / 2, stY - 24);
    this.spots.push({
      x: stX + stW / 2,
      y: stY + stH + 4,
      r: 80,
      label: "E  ·  up the stairs",
      act: () => SceneRouter.go(this, "Street"),
    });

    // ---- MRS. K (small grey figure by the mailboxes) ----------------
    // A simple procedural elderly woman: round grey-haired head, soft grey
    // wool dress, hunched posture. She faces toward the mailboxes — i.e.
    // looking south so the player meets her gaze when they approach.
    const mrsKX = mbX - 40;
    const mrsKY = mbY + mbH + 32;
    const mrsK = this.buildMrsK(mrsKX, mrsKY);

    this.spots.push({
      x: mrsK.x,
      y: mrsK.y,
      r: 60,
      label: "E  ·  Mrs. K",
      act: () => this.greetMrsK(),
    });

    // ---- DOOR BACK INTO THE APARTMENT (south, to LivingRoom) ---------
    // A wooden door with a brass knob, on the south wall.
    const doorX = ox + rW * 0.42;
    const doorY = bottom - 4;
    const dG = this.add.graphics().setDepth(doorY);
    dG.fillStyle(PAL.woodDark, 1);
    dG.fillRoundedRect(doorX - 24, doorY - 60, 48, 64, 3);
    dG.fillStyle(PAL.woodMid, 1);
    dG.fillRoundedRect(doorX - 22, doorY - 58, 44, 58, 2);
    // a little brass number 3 plate
    dG.fillStyle(PAL.gold, 1);
    dG.fillRect(doorX - 4, doorY - 50, 8, 8);
    // knob
    dG.fillCircle(doorX + 14, doorY - 32, 2);
    addDoorBeacon(this, doorX, doorY - 80);

    this.spots.push({
      x: doorX,
      y: doorY - 32,
      r: 64,
      label: "E  ·  back inside",
      act: () => SceneRouter.go(this, "LivingRoom"),
    });

    // ---- PLAYER ------------------------------------------------------
    // Default spawn: just outside the LivingRoom door, facing north.
    const start = this.spawn ?? { x: doorX, y: doorY - 80 };
    this.player = new Player(this, start.x, start.y, this.ctx, this.fx);
    this.player.surface = "wood";
    this.player.setLanternRadius(105);
    this.cameras.main.startFollow(this.player, true, 0.22, 0.22);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 30, oy - 80, rW + 60, rH + 90);

    // ---- SOLIDS (walls + the immovable furniture in the hallway) -----
    const solids = this.physics.add.staticGroup();
    const wallBox = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    wallBox(ox + rW / 2, oy - 14, rW + 60, 28);
    wallBox(ox + rW / 2, bottom + 8, rW + 60, 28);
    wallBox(ox - 18, oy + rH / 2, 32, rH + 30);
    wallBox(right + 18, oy + rH / 2, 32, rH + 30);
    // elevator hitbox so you can't walk through it
    wallBox(elX + elW / 2, elY + elH / 2, elW + 12, elH + 4);

    this.physics.add.collider(this.player, solids);

    // ---- input -------------------------------------------------------
    this.keyE = this.input.keyboard!.addKey("E");
    this.keyJ = this.input.keyboard!.addKey("J");

    // ---- VIGNETTE — warm sepia edges so the corridor feels enclosed.
    this.add
      .image(VIEW_W / 2, VIEW_H / 2, "vignette")
      .setScrollFactor(0)
      .setDisplaySize(VIEW_W, VIEW_H)
      .setDepth(9100)
      .setTint(0x6e3f1c)
      .setAlpha(0.72);

    // ---- prompt label (floats above the player when near a spot) -----
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

    this.fxPipeline = applyPostFX(this);
    ensureHud(this);
    this.time.delayedCall(800, () => fireTutorial(this, TUT_OUT_OF_APARTMENT));
  }

  /**
   * Mrs. K is a small grey figure — round grey hair, woollen dress in a
   * soft mauve-grey, slight stoop. Built as a container so she stays
   * cheap to render. No animation; she just stands there, the way old
   * tenants do when collecting mail.
   */
  private buildMrsK(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(y + 30);
    const g = this.add.graphics();
    // a soft shadow on the linoleum
    g.fillStyle(0x000000, 0.32);
    g.fillEllipse(0, 18, 28, 6);
    // wool dress — a soft mauve-grey trapezium
    g.fillStyle(0x7a6e7e, 1);
    g.fillRoundedRect(-12, -4, 24, 22, 4);
    g.fillStyle(shade(0x7a6e7e, 0.12), 0.6);
    g.fillRect(-12, -4, 24, 3);
    // an apron seam down the front
    g.lineStyle(1, shade(0x7a6e7e, -0.2), 0.55);
    g.lineBetween(0, -2, 0, 16);
    // a paper-thin shawl over her shoulders
    g.fillStyle(0x9a8e98, 0.85);
    g.fillTriangle(-12, -4, 12, -4, 0, 6);
    // head — a soft skin oval
    g.fillStyle(PAL.skin, 1);
    g.fillEllipse(0, -12, 14, 16);
    // grey hair — a cloud puff on top
    g.fillStyle(0xd2c8c0, 1);
    g.fillEllipse(0, -18, 17, 10);
    g.fillStyle(shade(0xd2c8c0, -0.15), 0.55);
    g.fillEllipse(-2, -17, 14, 6);
    // tiny eyes — two dots, looking slightly downward at the mail
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(-3, -13, 1, 1);
    g.fillRect(3, -13, 1, 1);
    // a soft mouth line
    g.lineStyle(1, 0x6a3a2a, 0.65);
    g.lineBetween(-2, -10, 2, -10);
    c.add(g);
    return c;
  }

  /**
   * Approach + E on Mrs. K. First time: a kind line about Alex looking
   * like his father "yesterday", which surfaces the fragment. Subsequent
   * visits: just a gentle hello, no fragment, no awareness bump.
   */
  private greetMrsK() {
    if (!this.mrsKMet) {
      this.mrsKMet = true;
      this.flashLine(
        "she looks up, smiles. — \"you look just like your father did yesterday, dear.\" She means it kindly.",
        3200,
      );
      surfaceFragment(this, {
        id: "frag_mrs_k_father",
        journal: "Mrs. K from down the hall said I look like my father did yesterday. I don't know what she means by yesterday.",
        awareness: 2,
      });
      return;
    }
    this.flashLine("she's still by the mailboxes. she smiles vaguely.", 2000);
  }

  /** A floating italic line that lasts a beat then fades. Same toast pattern. */
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
      openJournal(this);
    }
  }
}
