/**
 * THE CLEANERS — entry point.
 *
 * Wires the Phaser game. Boot → Title → Bedroom. Apartment rooms
 * (Bedroom / Kitchen / LivingRoom / Bathroom) navigate via SceneRouter.
 * Morning loop (Stairwell / Street / Cafe / Office / Metro) hangs off the
 * apartment's front door. Sleep + Credits are special-purpose scenes
 * launched at the right moment in the day cycle. Journal is an overlay
 * any room can launch via J.
 *
 * The Yesterday Echoes scenes are no longer registered here. They live on
 * en-rewrite for reference.
 */
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "./consts";
import { BootScene } from "./scenes/Boot";
import { TitleScene } from "./scenes/Title";
import { BedroomScene } from "./scenes/cleaners/Bedroom";
import { KitchenScene } from "./scenes/cleaners/Kitchen";
import { LivingRoomScene } from "./scenes/cleaners/LivingRoom";
import { BathroomScene } from "./scenes/cleaners/Bathroom";
import { StairwellScene } from "./scenes/cleaners/Stairwell";
import { StreetScene } from "./scenes/cleaners/Street";
import { CafeScene } from "./scenes/cleaners/Cafe";
import { OfficeScene } from "./scenes/cleaners/Office";
import { MetroScene } from "./scenes/cleaners/Metro";
import { SleepScene } from "./scenes/cleaners/Sleep";
import { CreditsScene } from "./scenes/cleaners/Credits";
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
    // The Apartment
    BedroomScene,
    KitchenScene,
    LivingRoomScene,
    BathroomScene,
    // The morning loop
    StairwellScene,
    StreetScene,
    CafeScene,
    OfficeScene,
    MetroScene,
    // Special-purpose
    SleepScene,
    CreditsScene,
    JournalScene,
  ],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
