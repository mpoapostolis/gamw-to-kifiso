/** Title — a hushed twilight clearing, drifting embers, and a name in carved letters. */
import Phaser from "phaser";
import { hex, PAL } from "../palette";
import { SFX } from "../sfx";
import { BGM } from "../bgm";
import { VIEW_H, VIEW_W } from "../consts";

const CINZEL = '"Cinzel", "Times New Roman", serif';
const SPECTRAL = '"Spectral", Georgia, serif';

export class TitleScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super("Title");
  }

  create() {
    const cx = VIEW_W / 2;
    this.cameras.main.setBackgroundColor(hex(PAL.void));

    // ---- atmospheric backdrop -----------------------------------------
    // sky gradient
    const g = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      g.fillStyle(Phaser.Display.Color.GetColor(
        Phaser.Math.Linear(0x0d, 0x07, t),
        Phaser.Math.Linear(0x0b, 0x06, t),
        Phaser.Math.Linear(0x18, 0x0e, t),
      ), 1);
      g.fillRect(0, (t * VIEW_H) | 0, VIEW_W, Math.ceil(VIEW_H / 60) + 1);
    }
    // a wan moon
    const moon = this.add.image(VIEW_W - 210, 150, "soft").setBlendMode(Phaser.BlendModes.ADD).setTint(0xaeb9da).setScale(3.2).setAlpha(0.42);
    this.add.circle(VIEW_W - 210, 150, 26, 0xdfe6f5, 0.9);
    this.add.circle(VIEW_W - 200, 144, 24, 0x0d0b16, 0.35); // crescent shadow
    this.tweens.add({ targets: moon, alpha: 0.55, scale: 3.5, yoyo: true, repeat: -1, duration: 4200, ease: "Sine.easeInOut" });

    // distant treeline silhouettes
    for (let i = -1; i < 9; i++) {
      const x = i * 165 + (i % 2) * 40;
      const big = i % 3 === 0;
      this.add
        .image(x, VIEW_H + 26, big ? "tree_canopy_b" : "pine")
        .setOrigin(0.5, 1)
        .setScale(big ? 2.7 : 2.3)
        .setTint(0x080611)
        .setAngle(big ? 0 : 0);
    }
    // a closer, darker band of trees
    for (let i = -1; i < 7; i++) {
      this.add
        .image(i * 210 + 70, VIEW_H + 60, i % 2 ? "tree_trunk" : "bush")
        .setOrigin(0.5, 1)
        .setScale(i % 2 ? 3.4 : 3.0)
        .setTint(0x05040c);
    }
    // warm hearth glow implied from off-screen-bottom
    this.add.image(cx - 40, VIEW_H + 30, "glow_warm").setBlendMode(Phaser.BlendModes.ADD).setScale(5, 2.4).setAlpha(0.32);
    const hearthFlick = this.add.image(cx - 40, VIEW_H + 10, "soft").setBlendMode(Phaser.BlendModes.ADD).setTint(PAL.ember).setScale(2.8, 1.6).setAlpha(0.4);
    this.tweens.add({ targets: hearthFlick, alpha: { from: 0.28, to: 0.5 }, scaleX: { from: 2.6, to: 3.1 }, yoyo: true, repeat: -1, duration: 240, ease: "Sine.easeInOut" });

    // drifting embers
    this.add.particles(0, 0, "dot", {
      x: { min: cx - 360, max: cx + 360 },
      y: VIEW_H + 12,
      lifespan: { min: 4500, max: 8500 },
      speedY: { min: -36, max: -14 },
      speedX: { min: -16, max: 16 },
      accelerationX: { min: -8, max: 8 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [PAL.ember, PAL.emberSoft, PAL.emberHot, PAL.goldHi],
      frequency: 240,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 1,
    });
    // a few cold motes too (the wood, watching)
    this.add.particles(0, 0, "dot", {
      x: { min: 0, max: VIEW_W },
      y: { min: 80, max: VIEW_H - 120 },
      lifespan: { min: 3000, max: 6000 },
      speedX: { min: -10, max: 10 },
      speedY: { min: -6, max: 6 },
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.32, end: 0 },
      tint: PAL.gloomGlow,
      frequency: 720,
      blendMode: Phaser.BlendModes.ADD,
    });

    // ---- the name ------------------------------------------------------
    const titleGlow = this.add
      .image(cx, 252, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(4.6, 1.7)
      .setAlpha(0);
    // Title: "5 ΛΕΠΤΑ ΠΡΙΝ" — fits one line at a comfortable size
    const titleTop = this.add
      .text(cx, 252, "FIVE MINUTES BEFORE", { fontFamily: CINZEL, fontSize: "62px", color: hex(PAL.ink), fontStyle: "800" })
      .setOrigin(0.5)
      .setLetterSpacing(14)
      .setShadow(0, 4, "rgba(0,0,0,0.55)", 8, true, true)
      .setAlpha(0)
      .setY(238);
    const titleWarm1 = this.add
      .text(cx, 252, "FIVE MINUTES BEFORE", { fontFamily: CINZEL, fontSize: "62px", color: hex(PAL.emberSoft), fontStyle: "800" })
      .setOrigin(0.5)
      .setLetterSpacing(14)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.012)
      .setY(238);
    const titleBot = titleTop; // single-line title — keep refs for the tweens
    const titleWarm2 = titleWarm1;
    const title = titleTop;
    const titleWarm = titleWarm1;
    const titleGroup = [titleTop, titleWarm1];

    // rule + diamond under the title
    const rule = this.add.graphics({ x: cx, y: 350 }).setAlpha(0);
    rule.lineStyle(2, PAL.panelEdgeHi, 1);
    rule.lineBetween(-200, 0, -16, 0);
    rule.lineBetween(16, 0, 200, 0);
    rule.fillStyle(PAL.emberSoft, 1);
    rule.fillTriangle(0, -7, 7, 0, 0, 7);
    rule.fillTriangle(0, -7, -7, 0, 0, 7);
    rule.lineStyle(1, PAL.ember, 1);
    rule.strokeTriangle(0, -7, 7, 0, 0, 7);
    rule.strokeTriangle(0, -7, -7, 0, 0, 7);

    const subtitle = this.add
      .text(cx, 388, "a small game about the memory they take from you", {
        fontFamily: SPECTRAL,
        fontSize: "22px",
        color: hex(PAL.inkDim),
        fontStyle: "italic 400",
      })
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setAlpha(0);

    const prompt = this.add
      .text(cx, 498, "press  ENTER  —  or click  —  to wake up", {
        fontFamily: SPECTRAL,
        fontSize: "23px",
        color: hex(PAL.ink),
        fontStyle: "500",
      })
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setAlpha(0);

    const controls = this.add
      .text(cx, 558, "WASD / ↑ ↓ ← →  walk        E  talk        TAB  notebook        I  pocket        ESC  pause", {
        fontFamily: SPECTRAL,
        fontSize: "15px",
        color: hex(PAL.inkFaint),
        fontStyle: "400",
      })
      .setOrigin(0.5)
      .setLetterSpacing(1.4)
      .setAlpha(0);

    this.add
      .text(VIEW_W - 16, VIEW_H - 14, "a small game from code · no images", {
        fontFamily: SPECTRAL,
        fontSize: "13px",
        color: "#4f4a3b",
        fontStyle: "italic 400",
      })
      .setOrigin(1, 1)
      .setAlpha(0.85);

    // a thin vignette on top
    this.add.image(cx, VIEW_H / 2, "vignette").setDisplaySize(VIEW_W, VIEW_H).setAlpha(0.9);

    // ---- entrance choreography ----------------------------------------
    this.cameras.main.fadeIn(900, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.tweens.add({ targets: titleGroup, alpha: 1, y: 252, duration: 850, delay: 350, ease: "Cubic.easeOut" });
    void titleBot;
    void titleWarm2;
    this.tweens.add({ targets: titleGlow, alpha: 0.42, duration: 1200, delay: 500, ease: "Sine.easeOut" });
    this.tweens.add({ targets: titleGlow, alpha: { from: 0.32, to: 0.5 }, scaleX: { from: 4.2, to: 4.9 }, yoyo: true, repeat: -1, duration: 2600, delay: 1700, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: rule, scaleX: { from: 0, to: 1 }, alpha: 1, duration: 600, delay: 1050, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: subtitle, alpha: 1, y: { from: 380, to: 388 }, duration: 600, delay: 1300, ease: "Cubic.easeOut" });
    this.tweens.add({
      targets: prompt,
      alpha: 1,
      duration: 500,
      delay: 1700,
      onComplete: () => this.tweens.add({ targets: prompt, alpha: 0.42, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.easeInOut" }),
    });
    this.tweens.add({ targets: [controls], alpha: 1, duration: 600, delay: 1900 });

    // gentle idle float on the title (both lines)
    this.tweens.add({ targets: titleGroup, y: "+=5", yoyo: true, repeat: -1, duration: 3600, delay: 1400, ease: "Sine.easeInOut" });

    // ---- begin ---------------------------------------------------------
    void title;
    void titleWarm;
    const begin = () => {
      if (this.started) return;
      this.started = true;
      SFX.unlock();
      BGM.start();
      SFX.select();
      this.tweens.add({ targets: titleGroup, scale: "+=0.06", duration: 500, ease: "Back.easeIn" });
      this.tweens.add({ targets: titleGlow, alpha: 0.8, scaleX: 6, duration: 500 });
      this.tweens.add({ targets: prompt, alpha: 0, duration: 200 });
      this.cameras.main.fadeOut(620, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start("Game"));
    };
    this.input.keyboard?.once("keydown-ENTER", begin);
    this.input.keyboard?.once("keydown-SPACE", begin);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, begin);
    // unlock audio on the first key even if it isn't ENTER/SPACE
    this.input.keyboard?.once("keydown", () => SFX.unlock());
  }
}
