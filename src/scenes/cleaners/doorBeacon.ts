/**
 * THE CLEANERS — door visual cue.
 *
 * Every interactive doorway in the apartment + the morning loop calls
 * `addDoorBeacon(scene, x, y)` to drop a warm bobbing chevron above the
 * door frame. The chevron uses the existing "chevron" texture built in
 * src/textures.ts, tints it amber, and adds a soft ground glow.
 *
 * Why this matters: indoor rooms are dim sepia. Without a beacon, the
 * doors blend into the wall and the player gets stuck staring at the
 * room wondering how to leave. The beacon is the single most important
 * UX affordance in the game.
 */
import Phaser from "phaser";
import { PAL } from "../../palette";

export function addDoorBeacon(
  scene: Phaser.Scene,
  x: number,
  y: number,
): { glow: Phaser.GameObjects.Image; chevron: Phaser.GameObjects.Image } {
  // a ground-level warm pool so the doorway reads as a destination
  const glow = scene.add
    .image(x, y + 38, "glow_warm")
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.9)
    .setAlpha(0.55)
    .setDepth(y - 100);
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.4, to: 0.7 },
    scale: { from: 0.85, to: 1.0 },
    yoyo: true,
    repeat: -1,
    duration: 1700,
    ease: "Sine.easeInOut",
  });
  // a bobbing chevron pointing down at the door
  const chevron = scene.add
    .image(x, y, "chevron")
    .setOrigin(0.5)
    .setScale(2.4)
    .setTint(PAL.emberHot)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(9050)
    .setScrollFactor(1);
  scene.tweens.add({
    targets: chevron,
    y: y - 8,
    yoyo: true,
    repeat: -1,
    duration: 1100,
    ease: "Sine.easeInOut",
  });
  scene.tweens.add({
    targets: chevron,
    alpha: { from: 0.85, to: 1 },
    yoyo: true,
    repeat: -1,
    duration: 700,
    ease: "Sine.easeInOut",
  });
  return { glow, chevron };
}
