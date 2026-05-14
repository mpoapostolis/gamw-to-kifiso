/**
 * THE CLEANERS — Day 1, the bedroom.
 *
 * From design doc §9: "the whole game in 30 seconds."
 *   • Player wakes in bed.
 *   • Soft sepia light.
 *   • Half-finished glass of water on the nightstand.
 *   • A note in the player's own handwriting: "Remember to call Mom."
 *   • A dog at the foot of the bed lifts its head, looks for three full
 *     seconds without recognition, then wags its tail.
 *
 * Surfacing the dog's hesitation is the first Fragment in the game.
 *
 * Player movement: WASD / arrows. E to examine. J to open the journal
 * (the journal scene handles its own input). No combat, no inventory.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL, shade } from "../../palette";
import { TILE } from "../../textures";
import { GameState } from "../../state/gameState";
import { SceneRouter } from "../../state/sceneRouter";
import { registerManifest } from "../../state/sceneManifest";
import { Player } from "../../objects/Player";
import type { Fx, GameCtx } from "../../types";
import { dummyCtx, dummyFx } from "./ctx";
import { launchSleep } from "./sleepUtil";
import { applyPostFX, pulseGlitch, type CleanersFXPipeline } from "../../fx/postProcess";

/**
 * A tiny in-scene interactable: a hit-box + a label + an `act()` callback.
 * Keeps the scene's update loop simple — every frame we just iterate.
 */
interface Spot {
  x: number;
  y: number;
  r: number;
  label: string;
  act: () => void;
}

const SEPIA_BG = 0x1d1411;       // dusty room shadow
const SEPIA_FLOOR = 0x3a2a1f;    // floor planks
const SEPIA_FLOOR_HI = 0x55382a; // plank highlights
const SEPIA_WALL = 0x2a1d16;     // back wall
const SEPIA_WALL_HI = 0x3f2c20;  // wall highlight (sunbeam side)
const SUNBEAM = 0xc97a3a;        // morning light through the window

export class BedroomScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private spots: Spot[] = [];
  private bedPos = { x: 0, y: 0 };
  private dog?: Phaser.GameObjects.Container;
  private dogTail?: Phaser.GameObjects.Rectangle;
  private dogRecognised = false;
  private dogLookStartedAt = -1;
  private noteRead = false;
  private glassExamined = false;
  private inDialog = false;
  private prompt?: Phaser.GameObjects.Text;
  private dayBanner?: Phaser.GameObjects.Text;
  private spawn?: { x: number; y: number };
  private fxPipeline: CleanersFXPipeline | null = null;

  constructor() {
    super("Bedroom");
  }

  init(data: { spawn?: { x: number; y: number } } = {}) {
    this.spawn = data.spawn;
  }

  create() {
    SceneRouter.current = "Bedroom";
    registerManifest({
      id: "Bedroom",
      label: "Bedroom",
      palette: "day",
      ambient: "",
      exits: [{ to: "Kitchen", label: "kitchen" }],
      fragments: [
        {
          id: "frag_dog_no_recognition",
          journalText:
            "The dog didn't know me for three seconds. Then it did. Or it decided to.",
          awareness: 2,
        },
        {
          id: "frag_note_to_mom",
          journalText:
            'A note in my handwriting on the table: "Remember to call Mom." I don\'t remember writing it.',
          awareness: 1,
        },
        {
          id: "frag_glass_half_finished",
          journalText:
            "The glass on the nightstand is half empty. I don't remember drinking from it.",
          awareness: 1,
        },
      ],
    });

    this.ctx = dummyCtx();
    this.fx = dummyFx();

    // ---- room geometry ------------------------------------------------
    // 11 × 7 tiles, centred. Letterbox the rest. Sepia floor + warm sun
    // bar coming in from the left wall.
    const cols = 11;
    const rows = 7;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    const right = ox + rW;
    const bottom = oy + rH;

    this.cameras.main.setBackgroundColor(hex(SEPIA_BG));

    // floor: warm wood planks with subtle alternating shade
    const floor = this.add.graphics();
    floor.fillStyle(SEPIA_FLOOR, 1);
    floor.fillRect(ox, oy, rW, rH);
    for (let r = 0; r < rows; r++) {
      const plankH = TILE;
      floor.fillStyle(r % 2 === 0 ? SEPIA_FLOOR : SEPIA_FLOOR_HI, 1);
      floor.fillRect(ox, oy + r * plankH, rW, plankH);
      // seam line
      floor.lineStyle(1, shade(SEPIA_FLOOR, -0.25), 0.45);
      floor.lineBetween(ox, oy + r * plankH, right, oy + r * plankH);
    }

    // back wall strip (north)
    const wall = this.add.graphics();
    wall.fillStyle(SEPIA_WALL, 1);
    wall.fillRect(ox - 24, oy - 80, rW + 48, 84);
    wall.fillStyle(SEPIA_WALL_HI, 0.75);
    wall.fillRect(ox - 24, oy - 80, rW + 48, 6);
    // wainscot panels
    wall.fillStyle(shade(SEPIA_WALL, -0.18), 1);
    wall.fillRect(ox - 24, oy - 26, rW + 48, 26);
    wall.lineStyle(1, shade(SEPIA_WALL, -0.4), 0.6);
    for (let x = ox; x < right; x += TILE * 1.4) wall.lineBetween(x, oy - 26, x, oy - 2);
    // skirting at the room bottom
    wall.fillStyle(shade(SEPIA_FLOOR, -0.25), 1);
    wall.fillRect(ox - 24, bottom, rW + 48, 6);

    // ---- the WINDOW (north wall, left side) — the warm sun bar -------
    const winX = ox + TILE * 1.4;
    const winY = oy - 64;
    const winW = TILE * 2.2;
    const winH = 48;
    // outer glow behind the window
    this.add
      .image(winX + winW / 2, winY + winH / 2, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.6)
      .setAlpha(0.55);
    // frame
    const winG = this.add.graphics();
    winG.fillStyle(shade(SEPIA_WALL, -0.4), 1);
    winG.fillRoundedRect(winX - 4, winY - 4, winW + 8, winH + 8, 3);
    winG.fillStyle(SUNBEAM, 0.92);
    winG.fillRect(winX, winY, winW, winH);
    winG.fillStyle(PAL.emberHot, 0.55);
    winG.fillRect(winX, winY, winW, winH * 0.35);
    // muntin
    winG.lineStyle(2, shade(SEPIA_WALL, -0.5), 1);
    winG.lineBetween(winX, winY + winH / 2, winX + winW, winY + winH / 2);
    winG.lineBetween(winX + winW / 2, winY, winX + winW / 2, winY + winH);
    // a long, soft sunbeam falling on the floor from the window
    const beam = this.add.graphics().setDepth(-1);
    beam.fillStyle(SUNBEAM, 0.12);
    beam.fillTriangle(
      winX + 8,        winY + winH,
      winX + winW - 8, winY + winH,
      winX + winW + 60, bottom - 30,
    );
    beam.fillStyle(SUNBEAM, 0.08);
    beam.fillTriangle(
      winX - 8,            winY + winH,
      winX + winW + 8,     winY + winH,
      winX + winW + 110,   bottom + 10,
    );

    // ---- THE BED (south-west) ----------------------------------------
    const bedX = ox + TILE * 2.2;
    const bedY = oy + TILE * 3.6;
    const bedW = TILE * 2.6;
    const bedH = TILE * 3.2;
    const bedG = this.add.graphics().setDepth(bedY + bedH);
    // shadow
    bedG.fillStyle(0x000000, 0.4);
    bedG.fillRoundedRect(bedX + 4, bedY + bedH - 4, bedW, 10, 4);
    // frame
    bedG.fillStyle(PAL.woodDark, 1);
    bedG.fillRoundedRect(bedX, bedY, bedW, bedH, 5);
    bedG.fillStyle(PAL.woodMid, 1);
    bedG.fillRoundedRect(bedX + 4, bedY + 4, bedW - 8, bedH - 12, 4);
    // sheets — warm cream
    bedG.fillStyle(PAL.thatchHi, 0.95);
    bedG.fillRoundedRect(bedX + 8, bedY + bedH * 0.18, bedW - 16, bedH * 0.7, 3);
    // pillow at the top
    bedG.fillStyle(PAL.gold, 0.92);
    bedG.fillRoundedRect(bedX + 10, bedY + 8, bedW - 20, bedH * 0.2, 4);
    bedG.fillStyle(PAL.goldHi, 0.55);
    bedG.fillRect(bedX + 14, bedY + 14, bedW - 28, 3);
    // a soft duvet ripple
    bedG.lineStyle(1, shade(PAL.thatch, -0.15), 0.4);
    for (let i = 0; i < 4; i++)
      bedG.lineBetween(bedX + 10, bedY + bedH * 0.35 + i * 14, bedX + bedW - 10, bedY + bedH * 0.35 + i * 14);
    this.bedPos = { x: bedX + bedW / 2, y: bedY + bedH * 0.55 };
    // The bed itself is an interactable: pressing E on it ends the day —
    // the Sleep scene plays the cinematic + the memory-wipe QTE, then
    // advances the day and routes back to the bedroom. This is the daily
    // loop in two lines of code.
    this.spots.push({
      x: this.bedPos.x,
      y: this.bedPos.y,
      r: 70,
      label: "E  ·  go back to sleep",
      act: () => launchSleep(this),
    });

    // ---- NIGHTSTAND + GLASS (to the right of the bed) ---------------
    const nsX = bedX + bedW + 14;
    const nsY = bedY + bedH * 0.3;
    const nsW = 38;
    const nsH = 46;
    const ns = this.add.graphics().setDepth(nsY + nsH);
    ns.fillStyle(0x000000, 0.35);
    ns.fillRoundedRect(nsX + 3, nsY + nsH - 3, nsW, 8, 3);
    ns.fillStyle(PAL.woodDark, 1);
    ns.fillRoundedRect(nsX, nsY, nsW, nsH, 3);
    ns.fillStyle(PAL.woodMid, 1);
    ns.fillRoundedRect(nsX + 2, nsY + 2, nsW - 4, nsH - 6, 2);
    ns.fillStyle(PAL.woodHi, 0.45);
    ns.fillRect(nsX + 2, nsY + 2, nsW - 4, 3);
    // drawer pull
    ns.fillStyle(PAL.gold, 1);
    ns.fillCircle(nsX + nsW / 2, nsY + nsH * 0.62, 1.8);

    // a half-empty glass of water on top
    const gx = nsX + nsW / 2;
    const gy = nsY - 4;
    const glass = this.add.graphics().setDepth(nsY + nsH + 1);
    // rim
    glass.fillStyle(PAL.gloomHi, 0.85);
    glass.fillRoundedRect(gx - 7, gy - 16, 14, 16, 2);
    // half-filled water
    glass.fillStyle(0x4d6190, 0.85);
    glass.fillRect(gx - 6, gy - 8, 12, 8);
    // gleam highlight
    glass.fillStyle(0xffffff, 0.45);
    glass.fillRect(gx - 5, gy - 14, 2, 12);
    // a faint mouth-mark on the rim
    glass.fillStyle(PAL.heartDark, 0.45);
    glass.fillRect(gx - 4, gy - 16, 5, 1);

    this.spots.push({
      x: gx,
      y: gy - 6,
      r: 36,
      label: "E  ·  the glass",
      act: () => this.examineGlass(),
    });

    // ---- TABLE + NOTE (east side of the room) ------------------------
    const tX = right - TILE * 2.8;
    const tY = oy + TILE * 2.4;
    const tW = TILE * 2;
    const tH = TILE * 1.2;
    const tG = this.add.graphics().setDepth(tY + tH);
    tG.fillStyle(0x000000, 0.35);
    tG.fillRoundedRect(tX + 3, tY + tH - 3, tW, 8, 3);
    tG.fillStyle(PAL.woodDark, 1);
    tG.fillRoundedRect(tX, tY, tW, tH, 4);
    tG.fillStyle(PAL.woodMid, 1);
    tG.fillRoundedRect(tX + 3, tY + 3, tW - 6, tH - 9, 3);
    tG.fillStyle(PAL.woodHi, 0.5);
    tG.fillRect(tX + 3, tY + 3, tW - 6, 3);
    // the note — a folded scrap of paper with a few squiggle lines
    const noteX = tX + tW * 0.4;
    const noteY = tY + tH * 0.22;
    const note = this.add.graphics().setDepth(tY + tH + 1);
    note.fillStyle(PAL.thatchHi, 0.98);
    note.fillRect(noteX, noteY, 28, 18);
    note.fillStyle(shade(PAL.thatchHi, -0.18), 1);
    note.fillRect(noteX + 26, noteY, 2, 18);
    // handwriting squiggle
    note.lineStyle(1, PAL.inkDim, 0.85);
    note.lineBetween(noteX + 4, noteY + 6, noteX + 24, noteY + 6);
    note.lineBetween(noteX + 4, noteY + 10, noteX + 22, noteY + 10);
    note.lineBetween(noteX + 4, noteY + 14, noteX + 18, noteY + 14);
    this.spots.push({
      x: noteX + 14,
      y: noteY + 10,
      r: 40,
      label: "E  ·  the note",
      act: () => this.readNote(),
    });

    // ---- THE DOG (foot of the bed) -----------------------------------
    // A small four-legged container we can animate the tail of.
    this.dog = this.buildDog(bedX + bedW / 2 + 12, bedY + bedH + 6);
    this.spots.push({
      x: (this.dog?.x ?? 0),
      y: (this.dog?.y ?? 0),
      r: 50,
      label: "E  ·  the dog",
      act: () => this.greetDog(),
    });

    // ---- DOOR OUT (north, leading to the kitchen) --------------------
    const doorX = right - TILE * 1.6;
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
      label: "E  ·  out to the kitchen",
      act: () => SceneRouter.go(this, "Kitchen"),
    });

    // ---- PLAYER ------------------------------------------------------
    const start = this.spawn ?? { x: bedX + bedW * 0.45, y: bedY + bedH * 0.5 };
    this.player = new Player(this, start.x, start.y, this.ctx, this.fx);
    this.player.surface = "wood";
    this.player.setLanternRadius(110); // small warm pool so the room reads
    this.cameras.main.startFollow(this.player, true, 0.22, 0.22);
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.physics.world.setBounds(ox - 30, oy - 80, rW + 60, rH + 90);

    // ---- SOLIDS ------------------------------------------------------
    const solids = this.physics.add.staticGroup();
    const wallBox = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    wallBox(ox + rW / 2, oy - 14, rW + 60, 28);   // north
    wallBox(ox + rW / 2, bottom + 8, rW + 60, 28); // south
    wallBox(ox - 18, oy + rH / 2, 32, rH + 30);   // west
    wallBox(right + 18, oy + rH / 2, 32, rH + 30);// east
    wallBox(this.bedPos.x, this.bedPos.y - 8, bedW, bedH);
    wallBox(nsX + nsW / 2, nsY + nsH / 2, nsW, nsH);
    wallBox(tX + tW / 2, tY + tH / 2, tW, tH);
    this.physics.add.collider(this.player, solids);

    // ---- input -------------------------------------------------------
    this.keyE = this.input.keyboard!.addKey("E");
    this.keyJ = this.input.keyboard!.addKey("J");

    // ---- VIGNETTE (warm sepia edges) ---------------------------------
    this.add
      .image(VIEW_W / 2, VIEW_H / 2, "vignette")
      .setScrollFactor(0)
      .setDisplaySize(VIEW_W, VIEW_H)
      .setDepth(9100)
      .setTint(0x6e3f1c)
      .setAlpha(0.7);

    // ---- POST-FX (CRT + chromatic aberration + grain) ----------------
    // The pipeline reads awareness off GameState each frame to drive
    // baseline aberration. A discrete `pulseGlitch()` call below kicks in
    // when a fragment surfaces — see readNote/examineGlass/greetDog.
    this.fxPipeline = applyPostFX(this);

    // ---- prompt text (floats over the player) ------------------------
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

    // ---- DAY BANNER + opening beat ----------------------------------
    this.player.controlsLocked = true;
    this.cameras.main.fadeIn(1200, 0, 0, 0);
    this.dayBanner = this.add
      .text(VIEW_W / 2, VIEW_H * 0.18, `DAY ${GameState.state.dayIndex}  ·  ${this.dayLabel()}`, {
        fontFamily: '"Cinzel", "Times New Roman", serif',
        fontSize: "26px",
        color: hex(PAL.thatchHi),
        fontStyle: "600",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(9300)
      .setScrollFactor(0)
      .setLetterSpacing(4);
    this.tweens.add({
      targets: this.dayBanner,
      alpha: { from: 0, to: 1 },
      duration: 900,
      delay: 700,
      yoyo: true,
      hold: 2400,
      onComplete: () => {
        this.dayBanner?.destroy();
        this.player.controlsLocked = false;
        this.showWakeToast();
      },
    });
  }

  /** A first-line "you wake up" toast that lands after the day banner. */
  private showWakeToast() {
    const t = this.add
      .text(VIEW_W / 2, VIEW_H - 110, "you wake up. the light is warm. the dog is at the foot of the bed.", {
        fontFamily: '"Spectral", Georgia, serif',
        fontSize: "16px",
        color: hex(PAL.inkDim),
        fontStyle: "italic 400",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(9300)
      .setScrollFactor(0);
    this.tweens.add({
      targets: t,
      alpha: { from: 0, to: 0.9 },
      duration: 700,
      yoyo: true,
      hold: 2800,
      onComplete: () => t.destroy(),
    });
  }

  private dayLabel(): string {
    switch (GameState.state.dayIndex) {
      case 1: return "Tuesday";
      case 2: return "Wednesday";
      case 3: return "Thursday";
      case 4: return "Friday";
      case 5: return "Saturday";
      case 6: return "Sunday";
      case 7: return "Monday";
      default: return "another morning";
    }
  }

  /**
   * Render the dog as a small container so we can rotate the tail on its
   * own. The dog itself stays still — only the head lift + tail wag are
   * animated through update() / greetDog().
   */
  private buildDog(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(y + 20);
    // body
    const body = this.add.graphics();
    body.fillStyle(0x000000, 0.35);
    body.fillEllipse(0, 14, 50, 10);
    body.fillStyle(0x6a4a30, 1);          // chestnut
    body.fillRoundedRect(-22, -4, 40, 18, 8);
    body.fillStyle(0x8a6440, 1);          // mid-coat highlight
    body.fillRoundedRect(-21, -4, 38, 4, 4);
    body.fillStyle(0x4a2e1c, 0.6);
    body.fillRect(-22, 8, 40, 2);
    c.add(body);
    // head — drawn separately so we can lift it later
    const head = this.add.container(18, -2);
    const h = this.add.graphics();
    h.fillStyle(0x6a4a30, 1);
    h.fillRoundedRect(-2, -10, 16, 16, 5);
    h.fillStyle(0x8a6440, 1);
    h.fillRoundedRect(-2, -10, 16, 4, 3);
    // ear
    h.fillStyle(0x4a2e1c, 1);
    h.fillTriangle(2, -10, 8, -10, 4, -16);
    // muzzle + nose
    h.fillStyle(0x4a2e1c, 1);
    h.fillRect(10, -2, 6, 5);
    h.fillStyle(0x111111, 1);
    h.fillRect(14, -2, 2, 2);
    // eye — wide open, looking at the player
    h.fillStyle(0x111111, 1);
    h.fillRect(6, -5, 1.5, 1.5);
    head.add(h);
    head.setName("head");
    c.add(head);
    // tail — a thin rectangle on its own anchor so we can rotate it
    this.dogTail = this.add.rectangle(-22, 0, 14, 3, 0x6a4a30).setOrigin(1, 0.5);
    c.add(this.dogTail);
    return c;
  }

  /**
   * Approach + E on the dog. First time: a three-second pause where the
   * dog stares at the player without recognition, then the tail wags.
   * This is the first Fragment in the game. Re-approaching is a no-op.
   */
  private greetDog() {
    if (this.dogRecognised) {
      this.flashLine("the dog wags its tail. quietly. it doesn't really look up.");
      return;
    }
    if (this.dogLookStartedAt < 0) {
      this.dogLookStartedAt = this.time.now;
      this.flashLine("the dog looks at you. it doesn't recognise you for a second.");
      this.player.controlsLocked = true;
      this.inDialog = true;
      return;
    }
  }

  /** A floating italic line that lasts a beat then fades. Cheap toast. */
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

  private readNote() {
    this.flashLine('the note says: "remember to call mom." it is in your handwriting. you do not remember writing it.');
    if (!this.noteRead) {
      this.noteRead = true;
      const added = GameState.addFragment("frag_note_to_mom", 1);
      if (added) {
        GameState.addJournalEntry(
          'A note in my handwriting on the table: "Remember to call Mom." I don\'t remember writing it.',
          { fragmentId: "frag_note_to_mom" },
        );
        if (this.fxPipeline) pulseGlitch(this.fxPipeline);
      }
    }
  }

  private examineGlass() {
    this.flashLine("the glass is half empty. you do not remember drinking from it.");
    if (!this.glassExamined) {
      this.glassExamined = true;
      const added = GameState.addFragment("frag_glass_half_finished", 1);
      if (added) {
        GameState.addJournalEntry(
          "The glass on the nightstand is half empty. I don't remember drinking from it.",
          { fragmentId: "frag_glass_half_finished" },
        );
        if (this.fxPipeline) pulseGlitch(this.fxPipeline);
      }
    }
  }

  update() {
    if (!this.player) return;

    // ---- the dog's three-second hesitation, then tail wag ------------
    if (this.dogLookStartedAt > 0 && !this.dogRecognised) {
      const elapsed = this.time.now - this.dogLookStartedAt;
      if (elapsed > 3000) {
        this.dogRecognised = true;
        this.inDialog = false;
        this.player.controlsLocked = false;
        const added = GameState.addFragment("frag_dog_no_recognition", 2);
        if (added) {
          GameState.addJournalEntry(
            "The dog didn't know me for three seconds. Then it did. Or it decided to.",
            { fragmentId: "frag_dog_no_recognition" },
          );
          if (this.fxPipeline) pulseGlitch(this.fxPipeline, 320);
        }
        this.flashLine("the dog's tail starts to wag.", 2200);
      }
    }
    // tail wag — only after recognition
    if (this.dogTail) {
      const wag = this.dogRecognised
        ? Math.sin(this.time.now * 0.018) * 0.5
        : Math.sin(this.time.now * 0.003) * 0.05;
      this.dogTail.setRotation(wag);
    }

    // ---- interactable prompts ---------------------------------------
    if (this.inDialog || this.player.controlsLocked) {
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
