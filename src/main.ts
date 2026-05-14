/**
 * THE CLEANERS — entry point.
 *
 * Wires the Phaser game. Boot → Title → Bedroom (the Day 1 starter beat
 * lives in BedroomScene). Apartment rooms (Bedroom / Kitchen / LivingRoom
 * / Bathroom) navigate via the SceneRouter. The Journal scene is launched
 * as an overlay via `J` from any room.
 *
 * The original Yesterday Echoes scenes are still in the repo (en-rewrite
 * branch) but are no longer registered here — this branch is purely the
 * Cleaners build.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "./consts";
import { BootScene } from "./scenes/Boot";
import { TitleScene } from "./scenes/Title";
import { BedroomScene } from "./scenes/cleaners/Bedroom";
import { KitchenScene } from "./scenes/cleaners/Kitchen";
import { LivingRoomScene } from "./scenes/cleaners/LivingRoom";
import { BathroomScene } from "./scenes/cleaners/Bathroom";
import { JournalScene } from "./scenes/cleaners/Journal";

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
  scene: [
    BootScene,
    TitleScene,
    BedroomScene,
    KitchenScene,
    LivingRoomScene,
    BathroomScene,
    JournalScene,
  ],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
