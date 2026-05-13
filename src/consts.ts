/** Logical (letterboxed) viewport size. The world is far larger; the camera roams it. */
export const VIEW_W = 1280;
export const VIEW_H = 720;

/** Depth bands (everything dynamic in the world is y-sorted between BG and OVERLAY). */
export const DEPTH = {
  ground: -1000,
  flat: -800,
  water: -900,
  darkness: 9000,
  bloom: 9050,
  vignette: 9100,
  floatText: 9300,
} as const;
