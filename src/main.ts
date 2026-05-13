/**
 * ΓΑΜΩ ΤΟΝ ΚΗΦΙΣΟ ΜΟΥ — entry point. Wires the Phaser game: smooth illustrative
 * render, 16:9 letterboxed, Arcade physics, four scenes (Boot → Title → Game + UI).
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "./consts";
import { BootScene } from "./scenes/Boot";
import { TitleScene } from "./scenes/Title";
import { GameScene } from "./scenes/Game";
import { HomeScene } from "./scenes/Home";
import { FacilityScene } from "./scenes/Facility";
import { ParkScene } from "./scenes/Park";
import { DespoinaScene } from "./scenes/Despoina";
import { UIScene } from "./scenes/Ui";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#07060d",
  pixelArt: false,
  roundPixels: true,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_W,
    height: VIEW_H,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  fps: { target: 60, min: 24, smoothStep: true },
  render: { powerPreference: "high-performance" },
  scene: [BootScene, TitleScene, GameScene, HomeScene, FacilityScene, ParkScene, DespoinaScene, UIScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
