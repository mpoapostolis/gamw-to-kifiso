/**
 * THE CLEANERS — scene router.
 *
 * Single point of "go from scene A to scene B." Every door / hallway /
 * stairwell delegates here so transitions have one place to live and the
 * fade-out / fade-in feel consistent.
 *
 * The router itself doesn't care WHAT the scenes are — it just stops the
 * outgoing scene, starts the incoming one with a spawn point, and remembers
 * the journey so the back-button can work.
 */
import Phaser from "phaser";
import { getManifest } from "./sceneManifest";

/** A breadcrumb so we can paint "you came from kitchen" hints if we want. */
interface RouterFrame {
  from: string;
  to: string;
  spawn?: { x: number; y: number };
  at: number;
}

class SceneRouterClass {
  /** Last few transitions. Useful for "back" verbs and analytics. */
  history: RouterFrame[] = [];

  /** Current scene id. Updated by scenes themselves in `create()`. */
  current = "Bedroom";

  /**
   * Transition the player from the current scene to `target`.
   *
   * Phaser flow:
   *   1. Fade-out the current scene's camera.
   *   2. On fade-out complete: stop the current scene, start the target
   *      with `{ spawn }` init data.
   *   3. The target scene's `init()` reads `spawn` and places the player.
   *
   * `spawn` is optional — the target scene picks a default spawn if not
   * provided (usually the door the player would have walked through).
   */
  go(
    scene: Phaser.Scene,
    target: string,
    spawn?: { x: number; y: number },
    fadeMs = 380,
  ): void {
    const manifest = getManifest(target);
    if (manifest?.exits) {
      // (no-op for now — placeholder so manifest-gated transitions can
      // veto the move in a future iteration.)
    }
    this.history.push({
      from: this.current,
      to: target,
      spawn,
      at: Date.now(),
    });
    if (this.history.length > 16) this.history.shift();

    const cam = scene.cameras.main;
    cam.fadeOut(fadeMs, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.current = target;
      scene.scene.stop(scene.scene.key);
      scene.scene.start(target, { spawn });
    });
  }

  /** Go back to the previous scene (uses the last history frame). */
  back(scene: Phaser.Scene, fadeMs = 380): void {
    const last = this.history[this.history.length - 1];
    if (!last) return;
    this.go(scene, last.from, undefined, fadeMs);
  }
}

/** The one router. Import this; never instantiate. */
export const SceneRouter = new SceneRouterClass();
