/**
 * THE CLEANERS — the Metro carriage.
 *
 * Interior of a moving train: two long benches running along the east and
 * west walls, a hard ceiling with two fluorescent strips, sliding doors
 * at the north and south ends of the carriage, and a single window-strip
 * along the back wall through which we see the tunnel rushing past as a
 * cold scrolling band.
 *
 * The carriage is fluorescent-lit, so the palette here is the COOLEST of
 * the morning loop — cream-pale paneling tinted blue-grey, with the warm
 * sodium of the platform only barely visible at the doors.
 *
 * Story beat: there's a Regular Passenger who sits in seat 4B every day
 * for as long as Alex can remember. On Day 1-4 he is there. On Day 5+ the
 * seat is empty and warm. None of the other passengers notice the gap —
 * which is the part that turns a missing person into a fragment.
 *
 * Exits:
 *   • west door → Street (back up to the surface)
 *   • east door → Office
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL, shade } from "../../palette";
import { TILE } from "../../textures";
import { GameState } from "../../state/gameState";
import { SceneRouter } from "../../state/sceneRouter";
import { registerManifest } from "../../state/sceneManifest";
import { Player } from "../../objects/Player";
import { addDoorBeacon } from "./doorBeacon";
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

/** The day at which the Regular Passenger goes missing. */
const REGULAR_GONE_AT = 5;

const METRO_BG = 0x14141c;        // pale blue-black carriage shadow
const FLOOR = 0x2a2a32;           // pale grey rubber floor
const FLOOR_HI = 0x3a3a44;        // floor highlight under the lights
const WALL = 0x35353e;            // carriage interior — cool grey
const WALL_HI = 0x4a4a55;         // wall highlight band
const TUNNEL = 0x0a0a14;          // dark tunnel — almost pure shadow

export class MetroScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private spots: Spot[] = [];
  private prompt?: Phaser.GameObjects.Text;
  private spawn?: { x: number; y: number };
  private regularGoneNoted = false;

  /** The tunnel band that scrolls behind the window to suggest motion. */
  private tunnelBand?: Phaser.GameObjects.Graphics;

  constructor() {
    super("Metro");
  }

  init(data: { spawn?: { x: number; y: number } } = {}) {
    this.spawn = data.spawn;
  }

  create() {
    SceneRouter.current = "Metro";
    const day = GameState.state.dayIndex;
    registerManifest({
      id: "Metro",
      label: "Metro",
      palette: "day",
      ambient: "",
      exits: [
        { to: "Street", label: "back up to the street" },
        { to: "Office", label: "to the office" },
      ],
      fragments: day >= REGULAR_GONE_AT
        ? [
            {
              id: "frag_metro_regular_gone",
              journalText:
                "The passenger who sat in seat 4B every day for as long as I can remember is gone today. The seat is warm. The other passengers don't seem to notice.",
              awareness: 3,
            },
          ]
        : [],
    });

    this.ctx = dummyCtx();
    this.fx = dummyFx();

    // ---- carriage geometry ------------------------------------------
    // A long horizontal corridor — 18 × 5 tiles — with the doors at the
    // far west and east, and a window-strip along the back wall.
    const cols = 18;
    const rows = 5;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    const right = ox + rW;
    const bottom = oy + rH;

    this.cameras.main.setBackgroundColor(hex(METRO_BG));

    // ---- FLOOR — pale grey rubber, slightly speckled ----------------
    const floor = this.add.graphics();
    floor.fillStyle(FLOOR, 1);
    floor.fillRect(ox, oy, rW, rH);
    // a faint speckle (we just dot a few highlight pixels)
    for (let i = 0; i < 80; i++) {
      const dx = ox + Math.random() * rW;
      const dy = oy + Math.random() * rH;
      floor.fillStyle(FLOOR_HI, 0.4);
      floor.fillRect(dx, dy, 2, 2);
    }
    // a centre seam running east-west — the carriage joint
    floor.lineStyle(2, shade(FLOOR, -0.3), 0.7);
    floor.lineBetween(ox, oy + rH / 2, right, oy + rH / 2);

    // ---- BACK WALL — cool grey panel with the WINDOW STRIP ----------
    const wall = this.add.graphics();
    wall.fillStyle(WALL, 1);
    wall.fillRect(ox - 24, oy - 100, rW + 48, 104);
    wall.fillStyle(WALL_HI, 0.7);
    wall.fillRect(ox - 24, oy - 100, rW + 48, 6);
    // the long window — a horizontal band along the wall
    const winY = oy - 70;
    const winH = 36;
    wall.fillStyle(shade(WALL, -0.5), 1);
    wall.fillRect(ox + 16, winY - 4, rW - 32, winH + 8);
    wall.fillStyle(TUNNEL, 1);
    wall.fillRect(ox + 20, winY, rW - 40, winH);
    // a faint cold reflection band — interior fluorescent in the glass
    wall.fillStyle(0xb8c5e2, 0.05);
    wall.fillRect(ox + 20, winY, rW - 40, 6);

    // ---- TUNNEL BAND (scrolls behind the window to suggest motion) --
    // We render it on a separate Graphics object so we can clear+redraw
    // each frame in update(), giving the illusion of movement.
    this.tunnelBand = this.add.graphics().setDepth(oy - 80);
    // (initial draw — update() will repaint it each frame)

    // skirting along the bottom of the wall
    wall.fillStyle(shade(FLOOR, -0.2), 1);
    wall.fillRect(ox - 24, bottom, rW + 48, 6);

    // ---- CEILING FLUORESCENTS (two cool strips) ---------------------
    // Drawn as light wash images — cool tint, lower alpha to read flat.
    for (const lx of [ox + rW * 0.3, ox + rW * 0.7]) {
      this.add
        .image(lx, oy - 4, "glow_violet")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.6)
        .setAlpha(0.32)
        .setTint(0xb8c5e2);
    }

    // ---- BENCHES (east + west walls + a central run) ----------------
    // The bench along the back is a long pale wood strip. We add small
    // numbered seats so 4B has a place to be.
    const benchY = oy + TILE * 0.6;
    const benchH = TILE * 1.1;
    const benchG = this.add.graphics().setDepth(benchY + benchH);
    benchG.fillStyle(0x000000, 0.32);
    benchG.fillRoundedRect(ox + 22, benchY + benchH - 3, rW - 44, 8, 3);
    benchG.fillStyle(shade(PAL.woodDark, 0.05), 1);
    benchG.fillRoundedRect(ox + 18, benchY, rW - 36, benchH, 4);
    benchG.fillStyle(shade(PAL.woodMid, 0.1), 1);
    benchG.fillRoundedRect(ox + 22, benchY + 3, rW - 44, benchH - 9, 3);
    benchG.fillStyle(shade(PAL.gold, -0.4), 0.7);
    benchG.fillRect(ox + 22, benchY + 3, rW - 44, 3);
    // seat dividers — small vertical lines every TILE * 1.3 along the bench
    benchG.lineStyle(1, shade(PAL.woodDark, -0.3), 0.7);
    const seatPitch = TILE * 1.6;
    const seats: { x: number; y: number; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const sx = ox + 30 + i * seatPitch;
      benchG.lineBetween(sx, benchY + 3, sx, benchY + benchH - 6);
      seats.push({ x: sx + seatPitch / 2, y: benchY + benchH * 0.5, label: `${i + 1}B` });
    }

    // The REGULAR sits in seat 4B (index 3, the middle of the bench).
    const regSeat = seats[3];
    if (day < REGULAR_GONE_AT) {
      this.buildRegularPassenger(regSeat.x, regSeat.y - 14);
      this.spots.push({
        x: regSeat.x,
        y: regSeat.y,
        r: 50,
        label: "E  ·  the regular passenger",
        act: () =>
          this.flashLine(
            "he sits in the same seat every day. you've never asked him anything.",
            3200,
          ),
      });
    } else {
      // The seat is empty. Add a subtle warm spot on the bench — the
      // seat is still warm — visible only when you press E on it.
      const warmTint = this.add.graphics().setDepth(regSeat.y + 4);
      warmTint.fillStyle(0xc97a3a, 0.15);
      warmTint.fillEllipse(regSeat.x, regSeat.y, seatPitch * 0.8, benchH * 0.6);
      this.spots.push({
        x: regSeat.x,
        y: regSeat.y,
        r: 50,
        label: "E  ·  seat 4B (empty)",
        act: () => this.examineEmptySeat(),
      });
    }

    // ---- OTHER PASSENGERS (small silhouettes scattered on the bench)
    // We put a few unremarkable figures on the bench to make the missing
    // seat read as a hole rather than a feature.
    for (const idx of [0, 1, 4]) {
      const s = seats[idx];
      this.buildBlankPassenger(s.x, s.y - 14);
    }

    // ---- ADVERTISEMENT POSTER (on the south wall, central) ----------
    // A small sodium-cream rectangle with a slogan. We render it as a
    // soft wash so it reads as a backlit ad.
    const adX = ox + rW * 0.5;
    const adY = bottom + 12;
    const adG = this.add.graphics().setDepth(adY + 20);
    adG.fillStyle(shade(PAL.woodDark, -0.05), 1);
    adG.fillRect(adX - 60, adY, 120, 56);
    adG.fillStyle(0xc8b878, 0.9);
    adG.fillRect(adX - 56, adY + 4, 112, 48);
    adG.fillStyle(shade(0xc8b878, -0.18), 1);
    adG.fillRect(adX - 56, adY + 4, 112, 4);
    // "SLEEP IS THE BEST MEDICINE" — three ink bars suggesting a slogan
    adG.lineStyle(1, 0x2a1a10, 0.9);
    adG.lineBetween(adX - 46, adY + 16, adX + 46, adY + 16);
    adG.lineBetween(adX - 46, adY + 22, adX + 38, adY + 22);
    adG.lineBetween(adX - 46, adY + 28, adX + 30, adY + 28);
    adG.lineBetween(adX - 46, adY + 38, adX + 28, adY + 38);
    // a pillow icon — soft round rect with a faint stripe
    adG.fillStyle(PAL.thatchHi, 0.95);
    adG.fillRoundedRect(adX + 24, adY + 30, 18, 12, 3);
    adG.lineStyle(1, shade(PAL.thatchHi, -0.3), 0.7);
    adG.lineBetween(adX + 26, adY + 36, adX + 40, adY + 36);

    this.spots.push({
      x: adX,
      y: adY + 28,
      r: 70,
      label: "E  ·  the advertisement",
      act: () =>
        this.flashLine(
          "SLEEP IS THE BEST MEDICINE. — buy our pillows. there's a phone number. you don't remember dialing it.",
          3600,
        ),
    });

    // ---- DOORS (west = Street, east = Office) -----------------------
    // Sliding doors with a vertical seam. Each door is just inside the
    // carriage end wall.
    const westDoorX = ox + 20;
    const eastDoorX = right - 20;
    const doorY = oy + rH * 0.55;
    for (const [dx, isWest] of [[westDoorX, true], [eastDoorX, false]] as const) {
      const dG = this.add.graphics().setDepth(doorY + 10);
      dG.fillStyle(shade(WALL, -0.2), 1);
      dG.fillRect(dx - 18, oy - 10, 36, rH + 20);
      dG.fillStyle(shade(WALL, -0.4), 1);
      dG.fillRect(dx - 14, oy - 6, 28, rH + 12);
      // door split
      dG.lineStyle(1, shade(WALL, -0.6), 1);
      dG.lineBetween(dx, oy - 6, dx, bottom + 6);
      // a small porthole window in each door
      dG.fillStyle(TUNNEL, 1);
      dG.fillRect(dx - 10, oy + rH * 0.18, 8, 16);
      dG.fillRect(dx + 2, oy + rH * 0.18, 8, 16);
      // a cool blue reflection bar
      dG.fillStyle(0xb8c5e2, 0.06);
      dG.fillRect(dx - 10, oy + rH * 0.18, 8, 3);
      dG.fillRect(dx + 2, oy + rH * 0.18, 8, 3);
      // direction label arrows — west door points back to the street
      if (isWest) {
        // a small ↑ marker above the door indicating "up to the street"
        dG.fillStyle(PAL.thatchHi, 0.7);
        dG.fillTriangle(dx, oy - 18, dx - 5, oy - 12, dx + 5, oy - 12);
      } else {
        // a small → marker above the east door indicating "to the office"
        dG.fillStyle(PAL.thatchHi, 0.7);
        dG.fillTriangle(dx + 6, oy - 15, dx, oy - 20, dx, oy - 10);
      }
    }

    addDoorBeacon(this, westDoorX, doorY - 60);
    addDoorBeacon(this, eastDoorX, doorY - 60);
    this.spots.push({
      x: westDoorX,
      y: doorY + 24,
      r: 70,
      label: "E  ·  back up to the street",
      act: () => SceneRouter.go(this, "Street"),
    });
    this.spots.push({
      x: eastDoorX,
      y: doorY + 24,
      r: 70,
      label: "E  ·  to the office",
      act: () => SceneRouter.go(this, "Office"),
    });

    // ---- PLAYER -----------------------------------------------------
    const start = this.spawn ?? { x: westDoorX + 50, y: doorY };
    this.player = new Player(this, start.x, start.y, this.ctx, this.fx);
    this.player.surface = "wood";
    // The carriage is fluorescent-lit, so the lantern reads small.
    this.player.setLanternRadius(95);
    this.cameras.main.startFollow(this.player, true, 0.22, 0.22);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 30, oy - 110, rW + 60, rH + 120);

    // ---- SOLIDS — outer walls + the bench front edge ----------------
    const solids = this.physics.add.staticGroup();
    const wallBox = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    wallBox(ox + rW / 2, oy - 14, rW + 60, 28);
    wallBox(ox + rW / 2, bottom + 8, rW + 60, 28);
    wallBox(ox - 18, oy + rH / 2, 32, rH + 30);
    wallBox(right + 18, oy + rH / 2, 32, rH + 30);
    // bench as a single long collider
    wallBox(ox + rW / 2, benchY + benchH / 2, rW - 36, benchH);

    this.physics.add.collider(this.player, solids);

    // ---- input ------------------------------------------------------
    this.keyE = this.input.keyboard!.addKey("E");
    this.keyJ = this.input.keyboard!.addKey("J");

    // ---- VIGNETTE — COOLER tint here than anywhere else in the loop.
    //   Fluorescent light eats the warmth.
    this.add
      .image(VIEW_W / 2, VIEW_H / 2, "vignette")
      .setScrollFactor(0)
      .setDisplaySize(VIEW_W, VIEW_H)
      .setDepth(9100)
      .setTint(0x2a2e3a)
      .setAlpha(0.7);

    this.prompt = this.add
      .text(0, 0, "", {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "16px",
        color: hex(PAL.thatchHi),
        fontStyle: "italic 400",
        backgroundColor: "rgba(20, 16, 14, 0.82)",
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(9200)
      .setVisible(false)
      .setScrollFactor(0);

    this.cameras.main.fadeIn(380, 0, 0, 0);
  }

  /**
   * The regular passenger — a still silhouette in a brown coat. He sits
   * upright, hands in his lap, looking forward at nothing. Built as a
   * small container so the depth-sorting stays consistent.
   */
  private buildRegularPassenger(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(y + 30);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 20, 22, 5);
    // brown coat — buttoned up
    g.fillStyle(0x4a382a, 1);
    g.fillRoundedRect(-10, -4, 20, 24, 4);
    g.fillStyle(shade(0x4a382a, 0.15), 0.6);
    g.fillRect(-10, -4, 20, 3);
    // a single column of three buttons down the front
    g.fillStyle(shade(0x4a382a, -0.4), 1);
    g.fillCircle(0, 2, 1.2);
    g.fillCircle(0, 8, 1.2);
    g.fillCircle(0, 14, 1.2);
    // head — looking straight ahead
    g.fillStyle(PAL.skin, 1);
    g.fillEllipse(0, -14, 13, 14);
    // hair — short, grey-brown
    g.fillStyle(0x5a4a3a, 1);
    g.fillRect(-6, -20, 12, 5);
    // tiny eyes — staring straight at the player (or at nothing)
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(-3, -14, 1, 1);
    g.fillRect(3, -14, 1, 1);
    // a flat, neutral mouth
    g.lineStyle(1, 0x6a3a2a, 0.65);
    g.lineBetween(-2, -10, 2, -10);
    c.add(g);
  }

  /**
   * Background passenger — a small dim figure that fills the bench
   * without drawing attention to itself. No face, just a silhouette.
   */
  private buildBlankPassenger(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(y + 30);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(0, 18, 22, 5);
    // generic dark coat — a touch greyer/cooler than the regular's
    g.fillStyle(0x2e2a32, 1);
    g.fillRoundedRect(-10, -4, 20, 22, 4);
    g.fillStyle(shade(0x2e2a32, 0.15), 0.55);
    g.fillRect(-10, -4, 20, 3);
    // head
    g.fillStyle(PAL.skin, 1);
    g.fillEllipse(0, -12, 12, 13);
    // hair — colour varies a touch via a hash on x so the row reads as
    // different people
    const hairTints = [0x5a4a3a, 0x3a2e26, 0x6a5a50, 0x2a1a10];
    const tint = hairTints[Math.abs(Math.floor(x)) % hairTints.length];
    g.fillStyle(tint, 1);
    g.fillRect(-6, -18, 12, 5);
    // no facial detail — these are the people who don't notice.
    c.add(g);
  }

  /**
   * Examining the empty seat on Day 5+ — adds the fragment the first
   * time, then just a quiet line on revisits.
   */
  private examineEmptySeat() {
    if (!this.regularGoneNoted) {
      this.regularGoneNoted = true;
      this.flashLine(
        "the seat is warm. nobody else is looking.",
        3000,
      );
      GameState.addFragment("frag_metro_regular_gone", 3);
      GameState.addJournalEntry(
        "The passenger who sat in seat 4B every day for as long as I can remember is gone today. The seat is warm. The other passengers don't seem to notice.",
        { fragmentId: "frag_metro_regular_gone" },
      );
      return;
    }
    this.flashLine("the seat is empty. it stays empty.", 2200);
  }

  /** Standard fading toast. */
  private flashLine(text: string, ms = 2400) {
    const t = this.add
      .text(VIEW_W / 2, VIEW_H - 90, text, {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "16px",
        color: hex(PAL.thatchHi),
        fontStyle: "italic 400",
        backgroundColor: "rgba(20, 16, 14, 0.82)",
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

  /**
   * Redraw the tunnel band so it appears to scroll past. The band is a
   * series of thin vertical bars whose offset is keyed off this.time.now,
   * giving the cheap-but-effective illusion of a moving tunnel.
   */
  private repaintTunnel(ox: number, winY: number, rW: number, winH: number) {
    if (!this.tunnelBand) return;
    this.tunnelBand.clear();
    // base
    this.tunnelBand.fillStyle(TUNNEL, 1);
    this.tunnelBand.fillRect(ox + 20, winY, rW - 40, winH);
    // a handful of vertical highlight bars scrolling past
    const t = this.time.now * 0.18;
    for (let i = 0; i < 10; i++) {
      const bx = ((i * 90 - t) % (rW - 40) + (rW - 40)) % (rW - 40);
      this.tunnelBand.fillStyle(0x1a1a2a, 0.7);
      this.tunnelBand.fillRect(ox + 20 + bx, winY, 2, winH);
    }
    // a slow occasional brighter pulse — a station passing by
    for (let i = 0; i < 3; i++) {
      const bx = ((i * 220 - t * 0.4) % (rW - 40) + (rW - 40)) % (rW - 40);
      this.tunnelBand.fillStyle(0x4a4a64, 0.55);
      this.tunnelBand.fillRect(ox + 20 + bx, winY + winH * 0.4, 14, winH * 0.2);
    }
  }

  update() {
    if (!this.player) return;

    // ---- repaint scrolling tunnel each frame ------------------------
    const cols = 18;
    const rows = 5;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    this.repaintTunnel(ox, oy - 70, rW, 36);

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
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.scene.launch("Journal");
      this.scene.pause();
    }
    // Bonus: keep rH in scope so TS doesn't complain about unused vars.
    void rH;
  }
}
