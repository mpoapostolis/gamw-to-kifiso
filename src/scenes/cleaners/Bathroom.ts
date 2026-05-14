/**
 * THE CLEANERS — Bathroom.
 *
 * Small. Tiled. A mirror over a sink — and the mirror is the whole point.
 * Every day you look in it, your face is a tiny bit different. Phase 1 just
 * shows day-aware text; future iterations will swap the player's reflected
 * portrait tint and add chromatic-aberration when awareness is high.
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
import { addDoorBeacon } from "./doorBeacon";
import { openJournal } from "./journalUtil";
import { applyPostFX, type CleanersFXPipeline } from "../../fx/postProcess";
import { surfaceFragment } from "../../cleaners/fragmentSurface";
import { ensureHud } from "./Hud";
import type { Fx, GameCtx } from "../../types";

interface Spot { x: number; y: number; r: number; label: string; act: () => void }

export class BathroomScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private spots: Spot[] = [];
  private prompt?: Phaser.GameObjects.Text;
  private spawn?: { x: number; y: number };
  private mirrorLooked = false;
  fxPipeline: CleanersFXPipeline | null = null;

  constructor() { super("Bathroom"); }
  init(data: { spawn?: { x: number; y: number } } = {}) { this.spawn = data.spawn; }

  create() {
    SceneRouter.current = "Bathroom";
    registerManifest({
      id: "Bathroom",
      label: "Bathroom",
      palette: "day",
      ambient: "",
      exits: [{ to: "LivingRoom", label: "living room" }],
      fragments: [
        { id: "frag_mirror_face", journalText: "I looked in the mirror. The face that looked back was mine. Mostly.", awareness: 2 },
      ],
    });

    this.ctx = dummyCtx();
    this.fx = dummyFx();

    const cols = 7;
    const rows = 6;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    const right = ox + rW;
    const bottom = oy + rH;
    this.cameras.main.setBackgroundColor(hex(0x141416));

    // floor: white tile + grout grid
    const floor = this.add.graphics();
    floor.fillStyle(0xd0c8c0, 1);
    floor.fillRect(ox, oy, rW, rH);
    floor.lineStyle(1, 0x9a8a82, 0.7);
    for (let x = ox; x <= right; x += TILE / 2) floor.lineBetween(x, oy, x, bottom);
    for (let y = oy; y <= bottom; y += TILE / 2) floor.lineBetween(ox, y, right, y);

    // back wall: white tile too
    const wall = this.add.graphics();
    wall.fillStyle(0xe2dcd6, 1);
    wall.fillRect(ox - 24, oy - 80, rW + 48, 84);
    wall.lineStyle(1, 0xafa6a0, 0.6);
    for (let x = ox - 24; x <= right + 24; x += 24) wall.lineBetween(x, oy - 80, x, oy);
    for (let y = oy - 80; y <= oy; y += 24) wall.lineBetween(ox - 24, y, right + 24, y);
    // skirting
    wall.fillStyle(shade(PAL.woodDark, -0.1), 1);
    wall.fillRect(ox - 24, bottom, rW + 48, 6);

    // ---- SINK + MIRROR (back wall, centred) ----
    const sX = ox + rW / 2;
    const sY = oy + TILE * 0.4;
    const sinkW = TILE * 2.4;
    const sinkH = TILE * 1.1;
    const sink = this.add.graphics().setDepth(sY + sinkH);
    sink.fillStyle(0x000000, 0.3);
    sink.fillRoundedRect(sX - sinkW / 2 + 3, sY + sinkH + 3, sinkW, 8, 3);
    sink.fillStyle(0xe2dcd6, 1);
    sink.fillRoundedRect(sX - sinkW / 2, sY, sinkW, sinkH, 4);
    sink.fillStyle(0xbab2ac, 1);
    sink.fillRoundedRect(sX - sinkW / 2 + 6, sY + 4, sinkW - 12, sinkH - 10, 6);
    sink.fillStyle(0x4a4448, 1);
    sink.fillCircle(sX, sY + sinkH * 0.45, 2.5);
    // tap
    sink.fillStyle(0xb0a89a, 1);
    sink.fillRect(sX - 2, sY - 6, 4, 8);
    sink.fillRect(sX - 6, sY - 6, 12, 3);

    // mirror above the sink
    const mY = sY - 38;
    const mirror = this.add.graphics().setDepth(sY);
    mirror.fillStyle(PAL.woodDark, 1);
    mirror.fillRoundedRect(sX - 32, mY - 28, 64, 50, 3);
    mirror.fillStyle(0x9a8a96, 1);
    mirror.fillRoundedRect(sX - 28, mY - 24, 56, 42, 2);
    // a faint reflection of the doorway behind the player
    mirror.fillStyle(0x666070, 0.6);
    mirror.fillRect(sX - 22, mY - 18, 44, 30);
    mirror.fillStyle(0x4a4458, 0.5);
    mirror.fillRect(sX - 8, mY - 14, 16, 24);

    this.spots.push({
      x: sX,
      y: mY + 8,
      r: 56,
      label: "E  ·  the mirror",
      act: () => this.lookInMirror(),
    });

    // ---- TOILET (east side) ----
    const toX = right - TILE * 1.2;
    const toY = oy + TILE * 2.6;
    const toilet = this.add.graphics().setDepth(toY + 30);
    toilet.fillStyle(0xe2dcd6, 1);
    toilet.fillRoundedRect(toX - 18, toY - 30, 36, 38, 6);
    toilet.fillRoundedRect(toX - 14, toY + 4, 28, 24, 8);
    toilet.fillStyle(0x9a8a82, 0.6);
    toilet.fillEllipse(toX, toY + 8, 22, 8);

    // ---- door back to living room ----
    const dX = ox + TILE * 1;
    const dY = bottom - 4;
    const dG = this.add.graphics();
    dG.fillStyle(PAL.woodDark, 1);
    dG.fillRoundedRect(dX - 22, dY - 60, 44, 64, 3);
    dG.fillStyle(PAL.woodMid, 1);
    dG.fillRoundedRect(dX - 20, dY - 58, 40, 58, 2);
    dG.fillStyle(PAL.gold, 1);
    dG.fillCircle(dX + 13, dY - 32, 2);
    addDoorBeacon(this, dX, dY - 80);
    this.spots.push({
      x: dX, y: dY - 32, r: 64,
      label: "E  ·  back to the living room",
      act: () => SceneRouter.go(this, "LivingRoom"),
    });

    // ---- player ----
    const start = this.spawn ?? { x: dX + 60, y: dY - 20 };
    this.player = new Player(this, start.x, start.y, this.ctx, this.fx);
    this.player.surface = "wood";
    this.player.setLanternRadius(85);
    this.cameras.main.startFollow(this.player, true, 0.22, 0.22);
    this.physics.world.setBounds(ox - 30, oy - 80, rW + 60, rH + 90);

    const solids = this.physics.add.staticGroup();
    const w = (cx: number, cy: number, ww: number, hh: number) => {
      const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
      b.setVisible(false).setDisplaySize(ww, hh).refreshBody();
    };
    w(ox + rW / 2, oy - 14, rW + 60, 28);
    w(ox + rW / 2, bottom + 8, rW + 60, 28);
    w(ox - 18, oy + rH / 2, 32, rH + 30);
    w(right + 18, oy + rH / 2, 32, rH + 30);
    w(sX, sY + sinkH / 2, sinkW, sinkH);
    w(toX, toY, 36, 38);
    this.physics.add.collider(this.player, solids);

    this.keyE = this.input.keyboard!.addKey("E");
    this.keyJ = this.input.keyboard!.addKey("J");

    this.add.image(VIEW_W / 2, VIEW_H / 2, "vignette").setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(9100).setTint(0x4a4a55).setAlpha(0.55);

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
  }

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
    this.tweens.add({ targets: t, alpha: { from: 0, to: 1 }, duration: 300, yoyo: true, hold: ms, onComplete: () => t.destroy() });
  }

  private lookInMirror() {
    const d = GameState.state.dayIndex;
    const lines = [
      "your face. nothing wrong with it.",
      "your face. a tiny crease by the eye that wasn't there yesterday. you think.",
      "your face. for half a second you have to remind yourself that it is.",
      "your face. it is, technically, yours. it does not feel like yours.",
      "your face. you stop trying to recognise it. it does not seem to mind.",
    ];
    const line = lines[Math.min(d - 1, lines.length - 1)];
    this.flashLine(line);
    if (!this.mirrorLooked && d >= 2) {
      this.mirrorLooked = true;
      surfaceFragment(this, {
        id: "frag_mirror_face",
        journal: "I looked in the mirror. The face that looked back was mine. Mostly.",
        awareness: 2,
      });
    }
  }

  update() {
    if (!this.player) return;
    let best: Spot | null = null;
    let bestD = Infinity;
    for (const s of this.spots) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      if (d < s.r && d < bestD) { bestD = d; best = s; }
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
      openJournal(this);
    }
  }
}
