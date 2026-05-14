/**
 * THE CLEANERS — sleep launcher helper.
 *
 * The single entry point a bedroom-side interactable should call when the
 * player presses E on the bed. Keeping this in its own tiny module lets the
 * integrator wire it into Bedroom.ts (or anywhere else) without that scene
 * having to know any of the Sleep scene's internals.
 *
 * Flow:
 *   1. Fade the calling scene's camera to black.
 *   2. When the fade completes, stop the calling scene and start "Sleep".
 *   3. The Sleep scene runs its prose beats + the wipe QTE, advances the
 *      day in GameState, then routes back to "Bedroom" itself.
 *
 * We never `launch()` Sleep on top of the caller — we `stop` + `start`
 * because the bedroom geometry must be torn down so the wipe-line decay
 * read clean on pure black, with nothing peeking through.
 */
import Phaser from "phaser";

/**
 * Begin the nightly sleep cinematic. Call this from a bedroom-side spot's
 * `act()` (e.g. "E · go to sleep" on the bed). Safe to call from any scene.
 */
export function launchSleep(fromScene: Phaser.Scene): void {
  // Lock the camera into a fade-to-black; the caller's update() may still
  // tick during the fade so any control-lock should be applied by the
  // caller (Bedroom toggles `player.controlsLocked` before calling us).
  const cam = fromScene.cameras.main;
  cam.fadeOut(900, 0, 0, 0);

  // We listen for FADE_OUT_COMPLETE rather than using a timer so a slow
  // device that drops the fade still hands control off at the right beat.
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    const fromKey = fromScene.scene.key;
    // Stop the calling scene cleanly so its graphics/physics are released
    // before Sleep paints over a fresh black canvas.
    fromScene.scene.stop(fromKey);
    fromScene.scene.start("Sleep");
  });
}
