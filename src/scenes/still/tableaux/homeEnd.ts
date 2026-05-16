/**
 * ΑΚΟΜΑ ΕΓΩ — tableau: "home_end" (Chapter 6, the final chapter).
 *
 * The same bedroom as Chapter 1 — the same bed, the same window, the
 * same phone on the same nightstand — but every warmth has gone out of
 * it. `chill` is ~1.0: the room is nearly monochrome, a cold ashen grey.
 * The window light is grey now, not blue-warm; the phone keeps only the
 * faintest cold ember.
 *
 * Aris still breathes. Slowly. He is still here. That is the whole title.
 *
 * The one thing this chapter does that Chapter 1 does not: over roughly
 * sixty seconds the entire tableau fades toward near-black. Every game
 * object the room created has its alpha lerped down on a slow curve, so
 * that by the time the chapter's last words are read the room has
 * emptied out completely and only the story text is left glowing in a
 * void. The room does not end with a cut. It just goes quiet, and then
 * it is gone.
 *
 * Geometry is shared with Chapter 1 via `buildBedroomRoom` so the two
 * rooms are provably the same room.
 */
import type { TableauHandle } from "../../../still/tableau";
import { buildBedroomRoom } from "./bedroomNight";

/* ------------------------------------------------------------------ *
 * Chapter 6 tableau — "home_end"
 * ------------------------------------------------------------------ */

/** Over how long the room fades out completely, in milliseconds. */
const FADE_DURATION = 60_000;

/**
 * The alpha the room settles at when the fade is "done". Not a true 0 —
 * a hair of the room lingers under the text, the ghost of a shape, so
 * the void never reads as a hard black card.
 */
const FADE_FLOOR = 0.04;

/**
 * Chapter 6. The drained version of the bedroom. Builds the shared room
 * with full chill + a strong monochrome collapse and no warm bloom, then
 * wraps its per-frame tick with a very slow global fade toward black.
 */
export function buildHomeEnd(
  scene: Phaser.Scene,
  chill: number,
): TableauHandle {
  // Build the room cold: full chill, near-total monochrome drain, and no
  // warm ambient glow at all — nothing warm survives into the last room.
  const room = buildBedroomRoom(scene, {
    chill: Math.max(chill, 1),
    monoStrength: 0.95,
    warmGlow: false,
  });

  // The fade clock. We track elapsed ms ourselves so the fade is robust
  // to whatever clock the StoryScene feeds `update` (it may not start
  // at zero, and we want the sixty seconds to begin when this chapter
  // begins — i.e. now).
  let elapsed = 0;
  let lastAppliedAlpha = -1; // so we only re-apply alpha when it changes

  /**
   * Each tracked object remembers the alpha the room gave it at build
   * time (the window glass, the vignette bands and the phone bloom all
   * start partly transparent). The fade multiplies that base, so a
   * half-transparent band fades from 0.5 → 0, not from 1 → 0.
   */
  const baseAlpha = new Map<Phaser.GameObjects.GameObject, number>();
  for (const obj of room.objects) {
    // Graphics, Image and Rectangle all carry `alpha`; guard structurally
    // so this stays strict without leaning on `any`.
    const a = (obj as { alpha?: number }).alpha;
    baseAlpha.set(obj, typeof a === "number" ? a : 1);
  }

  return {
    update: (time: number, delta: number): void => {
      // The room keeps breathing — Aris is still alive in the last room.
      room.update(time, delta);

      // Advance the fade clock and shape it: a gentle ease-in so the
      // room barely moves for the first beats, then sinks away. Phaser's
      // Quadratic.In gives exactly that slow-start curve.
      elapsed += delta;
      const t = Phaser.Math.Clamp(elapsed / FADE_DURATION, 0, 1);
      const eased = Phaser.Math.Easing.Quadratic.In(t);

      // Lerp the global multiplier from full (1) down to the floor.
      const mult = Phaser.Math.Linear(1, FADE_FLOOR, eased);

      // Only touch every object when the value has actually moved enough
      // to matter — keeps the per-frame cost near nothing once settled.
      if (Math.abs(mult - lastAppliedAlpha) < 0.002) return;
      lastAppliedAlpha = mult;

      for (const obj of room.objects) {
        const base = baseAlpha.get(obj) ?? 1;
        // setAlpha exists on every drawable we created; structural cast
        // keeps the loop strict-typed without `any`.
        (obj as { setAlpha?: (a: number) => void }).setAlpha?.(base * mult);
      }
    },

    destroy: (): void => {
      baseAlpha.clear();
      room.destroy();
    },
  };
}
