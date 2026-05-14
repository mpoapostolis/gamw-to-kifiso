/**
 * THE CLEANERS — the office.
 *
 * An open-plan workspace with four desks in a 2x2 grid, a coffee station
 * along the east wall, a printer humming somewhere off-screen (suggested
 * by an idle two-line drone in the FX, deferred to a future iteration),
 * and three NPCs:
 *
 *   • Sam — the coworker, top-left desk. Tells the same dog joke every
 *           day. On Day 2+ the repeat itself is the fragment.
 *   • The Boss — standing near the glass office at the north wall.
 *           Always finds something to scold Alex for.
 *   • The Quiet One — bottom-right desk. Doesn't normally look up. Once
 *           Alex's awareness is high enough, she breaks the seal:
 *           "you're awake today. I can tell." Her notebook is the
 *           second-act revelation.
 *
 * Exits:
 *   • door south → Metro (he came up from the platform; he leaves the
 *     same way)
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

const OFFICE_BG = 0x1a1612;        // warm office shadow
const FLOOR = 0x2e251d;            // dim carpet brown
const FLOOR_HI = 0x3d342a;         // carpet highlight band
const WALL = 0x2a2218;             // muted beige wall
const WALL_HI = 0x3a3024;          // wall highlight strip
const GLASS = 0x6c8a9a;            // glass office tint (cool against the warm room)

/** The minimum hidden awareness needed for the Quiet One to look up. */
const QUIET_ONE_THRESHOLD = 5;

export class OfficeScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private spots: Spot[] = [];
  private prompt?: Phaser.GameObjects.Text;
  private spawn?: { x: number; y: number };
  private samToldJoke = false;
  private quietOneLookedUp = false;

  constructor() {
    super("Office");
  }

  init(data: { spawn?: { x: number; y: number } } = {}) {
    this.spawn = data.spawn;
  }

  create() {
    SceneRouter.current = "Office";
    const day = GameState.state.dayIndex;
    // Manifest fragments depend on the day (Sam's joke repeat is Day 2+)
    // and on the player's awareness (Quiet One only fires at threshold).
    // We list them unconditionally — the manifest is informational only,
    // the actual gating happens in the spot's act().
    registerManifest({
      id: "Office",
      label: "Office",
      palette: "day",
      ambient: "",
      exits: [{ to: "Metro", label: "down to the metro" }],
      fragments: [
        ...(day >= 2
          ? [
              {
                id: "frag_coworker_joke",
                journalText:
                  "Sam told me the exact same joke he told yesterday. Word for word. He laughed at it the same way.",
                awareness: 2,
              },
            ]
          : []),
        {
          id: "frag_quiet_one_awake",
          journalText:
            "The quiet woman at the corner desk looked at me and said: you're awake today. I can tell. She has been keeping a notebook too.",
          awareness: 3,
        },
      ],
    });

    this.ctx = dummyCtx();
    this.fx = dummyFx();

    // ---- room geometry ----------------------------------------------
    // 16 × 9 tiles, with 4 desks in a 2x2 grid centred in the room.
    const cols = 16;
    const rows = 9;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    const right = ox + rW;
    const bottom = oy + rH;

    this.cameras.main.setBackgroundColor(hex(OFFICE_BG));

    // ---- CARPET FLOOR — grim corporate brown ------------------------
    const floor = this.add.graphics();
    floor.fillStyle(FLOOR, 1);
    floor.fillRect(ox, oy, rW, rH);
    // a faint horizontal banding so the carpet reads as carpet
    for (let r = 0; r < rows; r++) {
      floor.fillStyle(r % 2 === 0 ? FLOOR : FLOOR_HI, 0.55);
      floor.fillRect(ox, oy + r * TILE, rW, TILE);
    }
    // faint grid lines under-foot
    floor.lineStyle(1, shade(FLOOR, -0.3), 0.3);
    for (let r = 0; r <= rows; r++) floor.lineBetween(ox, oy + r * TILE, right, oy + r * TILE);

    // ---- NORTH WALL: a glass-walled boss-office at the back ---------
    const wall = this.add.graphics();
    wall.fillStyle(WALL, 1);
    wall.fillRect(ox - 24, oy - 100, rW + 48, 104);
    wall.fillStyle(WALL_HI, 0.7);
    wall.fillRect(ox - 24, oy - 100, rW + 48, 6);
    // a dado rail
    wall.fillStyle(shade(WALL, -0.2), 1);
    wall.fillRect(ox - 24, oy - 30, rW + 48, 4);
    wall.fillStyle(shade(FLOOR, -0.3), 1);
    wall.fillRect(ox - 24, bottom, rW + 48, 6);
    // the boss's glass office — east side of the north wall, a tinted
    // glass front with a door and a fluorescent buzz behind it
    const gX = ox + TILE * 11;
    const gY = oy - 88;
    const gW = TILE * 4;
    const gH = 86;
    wall.fillStyle(shade(PAL.woodDark, -0.1), 1);
    wall.fillRect(gX - 4, gY - 4, gW + 8, gH + 8);
    wall.fillStyle(GLASS, 0.45);
    wall.fillRect(gX, gY, gW, gH);
    // glass reflection bands — diagonal soft white
    wall.fillStyle(0xffffff, 0.08);
    wall.fillRect(gX, gY + 8, gW, 6);
    wall.fillRect(gX, gY + gH - 18, gW, 4);
    // a door in the glass front
    wall.fillStyle(shade(PAL.woodDark, -0.1), 1);
    wall.fillRect(gX + gW * 0.65, gY + gH * 0.3, 18, gH * 0.7);
    wall.fillStyle(PAL.gold, 0.9);
    wall.fillCircle(gX + gW * 0.65 + 14, gY + gH * 0.65, 1.6);

    // ceiling fluorescents — two soft warm-cool washes across the room
    for (const lx of [ox + rW * 0.3, ox + rW * 0.7]) {
      this.add
        .image(lx, oy - 14, "glow_warm")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.6)
        .setAlpha(0.42);
    }

    // ---- DESKS (2x2 grid) -------------------------------------------
    // Each desk is a wooden rectangle with a small monitor on top. We
    // place them well clear of the walls so the player can walk around
    // each one.
    interface Desk {
      x: number;
      y: number;
      w: number;
      h: number;
      label: "sam" | "boss-adj" | "alex" | "quiet";
    }
    const desks: Desk[] = [
      { x: ox + TILE * 3,    y: oy + TILE * 3,   w: TILE * 2.4, h: TILE * 1.2, label: "sam" },
      { x: ox + TILE * 9.5,  y: oy + TILE * 3,   w: TILE * 2.4, h: TILE * 1.2, label: "boss-adj" },
      { x: ox + TILE * 3,    y: oy + TILE * 6.2, w: TILE * 2.4, h: TILE * 1.2, label: "alex" },
      { x: ox + TILE * 9.5,  y: oy + TILE * 6.2, w: TILE * 2.4, h: TILE * 1.2, label: "quiet" },
    ];

    for (const d of desks) {
      const tG = this.add.graphics().setDepth(d.y + d.h);
      tG.fillStyle(0x000000, 0.32);
      tG.fillRoundedRect(d.x + 3, d.y + d.h - 3, d.w, 8, 3);
      tG.fillStyle(PAL.woodDark, 1);
      tG.fillRoundedRect(d.x, d.y, d.w, d.h, 4);
      tG.fillStyle(PAL.woodMid, 1);
      tG.fillRoundedRect(d.x + 3, d.y + 3, d.w - 6, d.h - 9, 3);
      tG.fillStyle(PAL.woodHi, 0.45);
      tG.fillRect(d.x + 3, d.y + 3, d.w - 6, 3);
      // a small monitor — a dark slab with a faint blue glow
      const mX = d.x + d.w * 0.5;
      const mY = d.y - 8;
      tG.fillStyle(0x1a1820, 1);
      tG.fillRoundedRect(mX - 18, mY - 22, 36, 24, 2);
      tG.fillStyle(0x2a3a4a, 0.7);
      tG.fillRect(mX - 16, mY - 20, 32, 18);
      tG.fillStyle(0xa8b8d8, 0.18);
      tG.fillRect(mX - 16, mY - 20, 32, 4);
      // monitor stand
      tG.fillStyle(0x2a2226, 1);
      tG.fillRect(mX - 4, mY, 8, 5);
      // a small loose paper on each desk
      tG.fillStyle(PAL.thatchHi, 0.92);
      tG.fillRect(d.x + d.w * 0.2, d.y + d.h * 0.3, 14, 10);
    }

    // ---- NPCs at their desks ----------------------------------------
    // Sam — top-left. Slumped, smiling, always about to tell a joke.
    const samDesk = desks[0];
    const samX = samDesk.x - 24;
    const samY = samDesk.y + samDesk.h * 0.5;
    this.buildSam(samX, samY);
    this.spots.push({
      x: samX,
      y: samY,
      r: 60,
      label: "E  ·  Sam",
      act: () => this.greetSam(),
    });

    // The Quiet One — bottom-right. Head down, typing, mostly invisible.
    const quietDesk = desks[3];
    const qX = quietDesk.x - 24;
    const qY = quietDesk.y + quietDesk.h * 0.5;
    this.buildQuietOne(qX, qY);
    this.spots.push({
      x: qX,
      y: qY,
      r: 56,
      label: "E  ·  the quiet one",
      act: () => this.greetQuietOne(),
    });
    // Her desk itself — a separate spot for the notebook examine when
    // she has looked up (i.e. she's no longer guarding it).
    this.spots.push({
      x: quietDesk.x + quietDesk.w * 0.5,
      y: quietDesk.y + quietDesk.h * 0.5,
      r: 48,
      label: "E  ·  her desk",
      act: () => this.examineQuietDesk(),
    });

    // The Boss — standing just outside the glass office, north wall.
    const bossX = gX + gW * 0.2;
    const bossY = gY + gH + 22;
    this.buildBoss(bossX, bossY);
    this.spots.push({
      x: bossX,
      y: bossY,
      r: 56,
      label: "E  ·  the boss",
      act: () => this.greetBoss(),
    });

    // ---- COFFEE STATION (east wall) ---------------------------------
    const csX = right - TILE * 1.4;
    const csY = oy + TILE * 1.6;
    const csW = TILE * 1.2;
    const csH = TILE * 0.9;
    const cs = this.add.graphics().setDepth(csY + csH);
    cs.fillStyle(0x000000, 0.32);
    cs.fillRoundedRect(csX + 3, csY + csH - 3, csW, 8, 3);
    cs.fillStyle(PAL.woodDark, 1);
    cs.fillRoundedRect(csX, csY, csW, csH, 3);
    cs.fillStyle(PAL.woodMid, 1);
    cs.fillRoundedRect(csX + 2, csY + 2, csW - 4, csH - 6, 2);
    // a coffee pot on top
    cs.fillStyle(0x1a1410, 1);
    cs.fillRoundedRect(csX + csW * 0.3, csY - 18, csW * 0.4, 18, 2);
    cs.fillStyle(0x4a3a30, 1);
    cs.fillRect(csX + csW * 0.3, csY - 6, csW * 0.4, 4);
    cs.fillStyle(PAL.thatchHi, 0.95);
    cs.fillRect(csX + csW * 0.62, csY - 14, 2, 6);

    // ---- DOOR (south wall, back to the metro) -----------------------
    const doorX = ox + rW * 0.5;
    const doorY = bottom - 4;
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
      label: "E  ·  down to the metro",
      act: () => SceneRouter.go(this, "Metro"),
    });

    // ---- PLAYER -----------------------------------------------------
    const start = this.spawn ?? { x: doorX, y: doorY - 36 };
    this.player = new Player(this, start.x, start.y, this.ctx, this.fx);
    this.player.surface = "wood";
    this.player.setLanternRadius(110);
    this.cameras.main.startFollow(this.player, true, 0.22, 0.22);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 30, oy - 100, rW + 60, rH + 120);

    // ---- SOLIDS (walls + each desk) ---------------------------------
    const solids = this.physics.add.staticGroup();
    const wallBox = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    wallBox(ox + rW / 2, oy - 14, rW + 60, 28);
    wallBox(ox + rW / 2, bottom + 8, rW + 60, 28);
    wallBox(ox - 18, oy + rH / 2, 32, rH + 30);
    wallBox(right + 18, oy + rH / 2, 32, rH + 30);
    for (const d of desks) wallBox(d.x + d.w / 2, d.y + d.h / 2, d.w, d.h);
    wallBox(csX + csW / 2, csY + csH / 2, csW, csH + 18);

    this.physics.add.collider(this.player, solids);

    // ---- input ------------------------------------------------------
    this.keyE = this.input.keyboard!.addKey("E");
    this.keyJ = this.input.keyboard!.addKey("J");

    // ---- VIGNETTE — warm, slightly cooler than the cafe.
    this.add
      .image(VIEW_W / 2, VIEW_H / 2, "vignette")
      .setScrollFactor(0)
      .setDisplaySize(VIEW_W, VIEW_H)
      .setDepth(9100)
      .setTint(0x4a2e1c)
      .setAlpha(0.72);

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

  /** Sam — slumped at his desk, grinning. Cardigan over a shirt. */
  private buildSam(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(y + 30);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 20, 28, 5);
    // cardigan
    g.fillStyle(0x6a4a3a, 1);
    g.fillRoundedRect(-11, -4, 22, 24, 4);
    g.fillStyle(shade(0x6a4a3a, 0.15), 0.6);
    g.fillRect(-11, -4, 22, 3);
    // shirt collar
    g.fillStyle(PAL.thatchHi, 1);
    g.fillRect(-6, -6, 12, 4);
    // head
    g.fillStyle(PAL.skin, 1);
    g.fillEllipse(0, -14, 14, 16);
    // hair — a mop
    g.fillStyle(PAL.hair, 1);
    g.fillRect(-7, -22, 14, 8);
    g.fillTriangle(-7, -16, -2, -20, -4, -12);
    // eyes — closed in a grin
    g.lineStyle(1, 0x2a1a10, 1);
    g.lineBetween(-4, -14, -2, -13);
    g.lineBetween(2, -14, 4, -13);
    // smile
    g.lineStyle(1, 0x6a3a2a, 0.8);
    g.lineBetween(-2, -10, 2, -10);
    c.add(g);
  }

  /** The Quiet One — head down, typing. Long dark hair, neutral coat. */
  private buildQuietOne(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(y + 30);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 20, 26, 5);
    // dark coat
    g.fillStyle(0x2a2630, 1);
    g.fillRoundedRect(-10, -4, 20, 24, 4);
    g.fillStyle(shade(0x2a2630, 0.15), 0.55);
    g.fillRect(-10, -4, 20, 3);
    // head — looking down at the keyboard
    g.fillStyle(PAL.skin, 1);
    g.fillEllipse(0, -12, 12, 13);
    // long dark hair — falls forward
    g.fillStyle(0x1a120e, 1);
    g.fillRect(-7, -18, 14, 14);
    g.fillRect(-7, -10, 4, 8);
    g.fillRect(3, -10, 4, 8);
    c.add(g);
  }

  /** The Boss — standing, arms folded, slightly puffed. */
  private buildBoss(x: number, y: number) {
    const c = this.add.container(x, y).setDepth(y + 30);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.32);
    g.fillEllipse(0, 22, 32, 6);
    // dark suit
    g.fillStyle(0x1a1620, 1);
    g.fillRoundedRect(-13, -4, 26, 26, 4);
    g.fillStyle(shade(0x1a1620, 0.2), 0.55);
    g.fillRect(-13, -4, 26, 3);
    // open lapels with a white shirt
    g.fillStyle(PAL.thatchHi, 1);
    g.fillTriangle(-4, -4, 4, -4, 0, 8);
    // tie — a dim slash
    g.fillStyle(0x6a2e2e, 1);
    g.fillTriangle(-2, -2, 2, -2, 0, 8);
    // folded arms across the chest
    g.fillStyle(shade(0x1a1620, 0.05), 1);
    g.fillRoundedRect(-13, 4, 26, 6, 3);
    // head
    g.fillStyle(PAL.skin, 1);
    g.fillEllipse(0, -14, 14, 16);
    // hair — receding
    g.fillStyle(PAL.hair, 1);
    g.fillRect(-6, -22, 12, 4);
    g.fillRect(-6, -22, 3, 8);
    g.fillRect(3, -22, 3, 8);
    // a small frown — two dashes for eyes plus a thin angry mouth
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(-3, -14, 1, 1);
    g.fillRect(3, -14, 1, 1);
    g.lineStyle(1, 0x6a3a2a, 0.8);
    g.lineBetween(-3, -10, 3, -10);
    c.add(g);
  }

  /**
   * Sam tells the dog joke. Day 1: just the setup. Day 2+: the same
   * setup, exactly — and that "exactly" is the fragment.
   */
  private greetSam() {
    const day = GameState.state.dayIndex;
    if (day === 1) {
      this.flashLine(
        `"did you hear the one about the dog and the —" he tells a joke.`,
        3000,
      );
      return;
    }
    if (!this.samToldJoke) {
      this.samToldJoke = true;
      this.flashLine(
        `"did you hear the one about the dog and the —" the same joke. word for word. he laughs the same way.`,
        3400,
      );
      GameState.addFragment("frag_coworker_joke", 2);
      GameState.addJournalEntry(
        "Sam told me the exact same joke he told yesterday. Word for word. He laughed at it the same way.",
        { fragmentId: "frag_coworker_joke" },
      );
      return;
    }
    this.flashLine("he laughs at the joke he just told.", 2200);
  }

  /**
   * The Quiet One. Below the awareness threshold she doesn't even look
   * up. Past the threshold she breaks the surface with a single line.
   */
  private greetQuietOne() {
    const awareness = GameState.state.awareness;
    if (awareness < QUIET_ONE_THRESHOLD) {
      this.flashLine(
        "she's typing. she doesn't look up. you don't know her name.",
        2600,
      );
      return;
    }
    if (!this.quietOneLookedUp) {
      this.quietOneLookedUp = true;
      this.flashLine(
        `she looks up. "you're awake today. I can tell."`,
        3000,
      );
      GameState.addFragment("frag_quiet_one_awake", 3);
      GameState.addJournalEntry(
        "The quiet woman at the corner desk looked at me and said: you're awake today. I can tell. She has been keeping a notebook too.",
        { fragmentId: "frag_quiet_one_awake" },
      );
      return;
    }
    this.flashLine("she nods once, slowly. then back to the keyboard.", 2400);
  }

  /**
   * Her desk — the notebook is only legible once she's broken the seal.
   * Before that we just see "papers" — the camera politely averts its
   * gaze.
   */
  private examineQuietDesk() {
    const awareness = GameState.state.awareness;
    if (awareness < QUIET_ONE_THRESHOLD) {
      this.flashLine(
        "her desk has papers on it. her keyboard is loud.",
        2200,
      );
      return;
    }
    this.flashLine(
      "her notebook is open. the handwriting in it is yours.",
      3200,
    );
  }

  /** The Boss — same scolding line every time. */
  private greetBoss() {
    this.flashLine(
      `"you're late again, ${GameState.state.playerName}. — am I? — you always are. — but I — — never mind. just clock in."`,
      3400,
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
