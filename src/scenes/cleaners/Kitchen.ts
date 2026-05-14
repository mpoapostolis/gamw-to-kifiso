/**
 * THE CLEANERS — Kitchen.
 *
 * The room you walk into after waking up. Coffee pot is on. A photo on
 * the fridge. The window over the sink looks out on the air-shaft.
 *
 * Phase 1 stub: navigable, two interactables, exit back to bedroom and
 * forward to living room. Future iterations will dress this with the
 * Day-2 barista mismatch and Day-6 newspaper.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "../../consts";
import { hex, PAL, shade } from "../../palette";
import { TILE } from "../../textures";
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

export class KitchenScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private fx!: Fx;
  private player!: Player;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private spots: Spot[] = [];
  private prompt?: Phaser.GameObjects.Text;
  private spawn?: { x: number; y: number };
  private coffeeSmelled = false;
  fxPipeline: CleanersFXPipeline | null = null;

  constructor() { super("Kitchen"); }

  init(data: { spawn?: { x: number; y: number } } = {}) {
    this.spawn = data.spawn;
  }

  create() {
    SceneRouter.current = "Kitchen";
    registerManifest({
      id: "Kitchen",
      label: "Kitchen",
      palette: "day",
      ambient: "",
      exits: [
        { to: "Bedroom", label: "bedroom" },
        { to: "LivingRoom", label: "living room" },
      ],
      fragments: [
        { id: "frag_kitchen_coffee", journalText: "The coffee pot was on when I came in. I don't remember setting it up last night.", awareness: 1 },
      ],
    });

    this.ctx = dummyCtx();
    this.fx = dummyFx();

    const cols = 12;
    const rows = 7;
    const rW = cols * TILE;
    const rH = rows * TILE;
    const ox = (VIEW_W - rW) / 2;
    const oy = (VIEW_H - rH) / 2 - 8;
    const right = ox + rW;
    const bottom = oy + rH;

    this.cameras.main.setBackgroundColor(hex(0x1c1610));

    // floor: warm linoleum tiles
    const floor = this.add.graphics();
    floor.fillStyle(0x3e2c20, 1);
    floor.fillRect(ox, oy, rW, rH);
    for (let ty = 0; ty < rows; ty++)
      for (let tx = 0; tx < cols; tx++) {
        const alt = (tx + ty) % 2 === 0;
        floor.fillStyle(alt ? 0x44321f : 0x3a2719, 1);
        floor.fillRect(ox + tx * TILE, oy + ty * TILE, TILE, TILE);
        floor.lineStyle(1, 0x1f1610, 0.4);
        floor.strokeRect(ox + tx * TILE, oy + ty * TILE, TILE, TILE);
      }

    // back wall (north) — yellow-cream tile, very 1970s
    const wall = this.add.graphics();
    wall.fillStyle(shade(PAL.thatch, -0.3), 1);
    wall.fillRect(ox - 24, oy - 80, rW + 48, 84);
    // tile grid
    wall.lineStyle(1, shade(PAL.thatch, -0.55), 0.55);
    for (let x = ox - 24; x <= right + 24; x += 24) wall.lineBetween(x, oy - 80, x, oy);
    for (let y = oy - 80; y <= oy; y += 24) wall.lineBetween(ox - 24, y, right + 24, y);
    // skirting
    wall.fillStyle(shade(PAL.woodDark, -0.1), 1);
    wall.fillRect(ox - 24, bottom, rW + 48, 6);

    // ---- counter along the back ----
    const cX = ox + TILE * 0.5;
    const cY = oy + TILE * 0.4;
    const cW = TILE * 7;
    const cH = TILE * 1.2;
    const counter = this.add.graphics().setDepth(cY + cH);
    counter.fillStyle(0x000000, 0.32);
    counter.fillRoundedRect(cX + 3, cY + cH + 3, cW, 8, 3);
    counter.fillStyle(PAL.woodDark, 1);
    counter.fillRoundedRect(cX, cY, cW, cH, 3);
    counter.fillStyle(PAL.woodMid, 1);
    counter.fillRoundedRect(cX + 3, cY + 3, cW - 6, cH - 9, 3);
    counter.fillStyle(PAL.woodHi, 0.55);
    counter.fillRect(cX + 3, cY + 3, cW - 6, 3);
    // sink
    counter.fillStyle(0x2a2030, 1);
    counter.fillRoundedRect(cX + TILE * 2, cY + 6, TILE * 1.6, cH - 14, 4);
    counter.fillStyle(0x4a3e58, 1);
    counter.fillRoundedRect(cX + TILE * 2 + 4, cY + 10, TILE * 1.6 - 8, cH - 22, 3);
    // tap
    counter.fillStyle(0xb0a89a, 1);
    counter.fillRect(cX + TILE * 2.6, cY - 2, 4, 8);
    counter.fillRect(cX + TILE * 2.6, cY - 2, 14, 2);

    // ---- the coffee pot (on the counter, glass jug, hot plate) ----
    const potX = cX + TILE * 5.4;
    const potY = cY - 4;
    const pot = this.add.graphics().setDepth(cY + cH + 1);
    // base / hot plate
    pot.fillStyle(0x1a1820, 1);
    pot.fillRoundedRect(potX - 14, potY - 4, 28, 10, 2);
    pot.fillStyle(0xc94a2a, 0.85); // red-hot ring
    pot.fillCircle(potX, potY, 6);
    // jug
    pot.fillStyle(0x1d1822, 1);
    pot.fillRoundedRect(potX - 11, potY - 22, 22, 22, 3);
    pot.fillStyle(0x2c2434, 1);
    pot.fillRoundedRect(potX - 9, potY - 20, 18, 20, 2);
    pot.fillStyle(0x4a2a1a, 0.95); // brewed coffee inside
    pot.fillRect(potX - 7, potY - 10, 14, 10);
    // handle
    pot.fillStyle(0x1d1822, 1);
    pot.fillRect(potX + 9, potY - 18, 5, 14);
    // steam wisps
    pot.fillStyle(0xcfc3a0, 0.5);
    pot.fillCircle(potX - 4, potY - 28, 3);
    pot.fillCircle(potX + 3, potY - 32, 3.5);

    this.spots.push({
      x: potX, y: potY,
      r: 42,
      label: "E  ·  the coffee pot",
      act: () => this.smellCoffee(),
    });

    // ---- fridge (east side) ----
    const fX = right - TILE * 1.6;
    const fY = oy + TILE * 0.8;
    const fW = TILE * 1.4;
    const fH = TILE * 3.4;
    const fridge = this.add.graphics().setDepth(fY + fH);
    fridge.fillStyle(0x000000, 0.4);
    fridge.fillRoundedRect(fX + 3, fY + fH - 3, fW, 10, 4);
    fridge.fillStyle(0x4a4456, 1);
    fridge.fillRoundedRect(fX, fY, fW, fH, 4);
    fridge.fillStyle(0x6a6478, 1);
    fridge.fillRoundedRect(fX + 3, fY + 3, fW - 6, fH - 8, 3);
    fridge.fillStyle(0x4a4456, 1);
    fridge.fillRect(fX + 3, fY + fH * 0.4, fW - 6, 2);
    // handle
    fridge.fillStyle(0xb0a89a, 1);
    fridge.fillRect(fX + 4, fY + 8, 3, fH * 0.34);
    fridge.fillRect(fX + 4, fY + fH * 0.45, 3, fH * 0.4);
    // a tiny photo magnet
    fridge.fillStyle(PAL.thatchHi, 1);
    fridge.fillRect(fX + 14, fY + 16, 12, 12);
    fridge.fillStyle(PAL.heartDark, 1);
    fridge.fillRect(fX + 16, fY + 18, 8, 6);

    this.spots.push({
      x: fX + fW / 2, y: fY + fH / 2,
      r: 50,
      label: "E  ·  the fridge",
      act: () => this.examineFridge(),
    });

    // ---- table + chair in centre ----
    const tX = ox + rW / 2 - TILE * 1.4;
    const tY = oy + TILE * 3.8;
    const tW = TILE * 2.4;
    const tH = TILE * 1.5;
    const tG = this.add.graphics().setDepth(tY + tH);
    tG.fillStyle(0x000000, 0.32);
    tG.fillRoundedRect(tX + 3, tY + tH - 3, tW, 8, 3);
    tG.fillStyle(PAL.woodDark, 1);
    tG.fillRoundedRect(tX, tY, tW, tH, 4);
    tG.fillStyle(PAL.woodMid, 1);
    tG.fillRoundedRect(tX + 3, tY + 3, tW - 6, tH - 9, 3);
    tG.fillStyle(PAL.woodHi, 0.55);
    tG.fillRect(tX + 3, tY + 3, tW - 6, 3);

    // ---- doors: south to bedroom, east-bottom corner to living room ----
    const bedDoorX = ox + TILE * 1.2;
    const bedDoorY = bottom - 4;
    const bd = this.add.graphics();
    bd.fillStyle(PAL.woodDark, 1);
    bd.fillRoundedRect(bedDoorX - 22, bedDoorY - 60, 44, 64, 3);
    bd.fillStyle(PAL.woodMid, 1);
    bd.fillRoundedRect(bedDoorX - 20, bedDoorY - 58, 40, 58, 2);
    bd.fillStyle(PAL.gold, 1);
    bd.fillCircle(bedDoorX + 13, bedDoorY - 32, 2);
    addDoorBeacon(this, bedDoorX, bedDoorY - 80);
    this.spots.push({
      x: bedDoorX, y: bedDoorY - 32,
      r: 64,
      label: "E  ·  back to the bedroom",
      act: () => SceneRouter.go(this, "Bedroom"),
    });

    const lrDoorX = right - TILE * 0.8;
    const lrDoorY = bottom - 4;
    const lrd = this.add.graphics();
    lrd.fillStyle(PAL.woodDark, 1);
    lrd.fillRoundedRect(lrDoorX - 22, lrDoorY - 60, 44, 64, 3);
    lrd.fillStyle(PAL.woodMid, 1);
    lrd.fillRoundedRect(lrDoorX - 20, lrDoorY - 58, 40, 58, 2);
    lrd.fillStyle(PAL.gold, 1);
    lrd.fillCircle(lrDoorX + 13, lrDoorY - 32, 2);
    addDoorBeacon(this, lrDoorX, lrDoorY - 80);
    this.spots.push({
      x: lrDoorX, y: lrDoorY - 32,
      r: 64,
      label: "E  ·  the living room",
      act: () => SceneRouter.go(this, "LivingRoom"),
    });

    // ---- player ----
    const start = this.spawn ?? { x: bedDoorX, y: bedDoorY - 18 };
    this.player = new Player(this, start.x, start.y, this.ctx, this.fx);
    this.player.surface = "wood";
    this.player.setLanternRadius(95);
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
    w(cX + cW / 2, cY + cH / 2, cW, cH);
    w(fX + fW / 2, fY + fH / 2, fW, fH);
    w(tX + tW / 2, tY + tH / 2, tW, tH);
    this.physics.add.collider(this.player, solids);

    this.keyE = this.input.keyboard!.addKey("E");
    this.keyJ = this.input.keyboard!.addKey("J");

    this.add.image(VIEW_W / 2, VIEW_H / 2, "vignette").setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(9100).setTint(0x6e3f1c).setAlpha(0.7);

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

    // Universal HUD + screen-space post-FX (CRT + aberration + grain).
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

  private smellCoffee() {
    this.flashLine("the coffee pot is on. the jug is half full. you do not remember setting it up.");
    if (!this.coffeeSmelled) {
      this.coffeeSmelled = true;
      surfaceFragment(this, {
        id: "frag_kitchen_coffee",
        journal: "The coffee pot was on when I came in. I don't remember setting it up last night.",
        awareness: 1,
      });
    }
  }

  private examineFridge() {
    this.flashLine("a photograph held by a magnet. you. younger. you don't quite recognise the smile.");
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
