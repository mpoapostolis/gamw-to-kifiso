/**
 * ΑΚΟΜΑ ΕΓΩ (Still Me) — entry point.
 *
 * A quiet interactive story about identity and consciousness. Boot forges
 * the procedural textures + audio, Title holds the splash, and StoryScene
 * plays the whole thing — one chapter at a time, six chapters, then black.
 *
 * No HUD, no inventory, no combat. Earlier builds of this repo (Yesterday
 * Echoes, The Cleaners) live on their own branches.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "./consts";
import { BootScene } from "./scenes/Boot";
import { TitleScene } from "./scenes/Title";
import { StoryScene } from "./scenes/still/StoryScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#05050a",
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
  scene: [BootScene, TitleScene, StoryScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
