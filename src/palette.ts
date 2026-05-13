/**
 * "5 ΛΕΠΤΑ ΠΡΙΝ" colour language — Soft melancholy, suburb at slow blue dusk.
 *
 * Faded pastels: dusty-rose sky, soft moss greens, washed amber lamp pools,
 * lavender night fog. Όχι σκληρό horror — μια πόλη που μοιάζει με ξεθωριασμένη
 * polaroid. The 11:55 Καθαριστές are pale, almost-white, drifting figures —
 * not threatening, just inevitable.
 *
 * Internal names from the original engine are preserved: `grass*` = lawn/path,
 * `cloak*` = player clothes, `gloom*` = the Καθαριστές, `ember*` = soft amber
 * interior lights, `heart*` = a kept-warm thing (memory candle).
 */
export const PAL = {
  // backdrop / dusk-into-night
  void: 0x100c1a,
  night: 0x1b1730,
  nightSky: 0x2a2546,

  // lawn / soft grass / dewy moss
  grassDeep: 0x2d3b32,
  grassMid: 0x435846,
  grassHi: 0x6b8064,
  grassDry: 0x7a7642, // last week's grass
  // suburban paving — light, faded
  dirt: 0x40363c,
  dirtHi: 0x6a5a60,
  // plaza tile (was sand) — pale stone
  sand: 0xa49680,
  // marble (was stone) — clock plaza floor
  stone: 0x59556a,
  stoneHi: 0x88859a,
  stoneEdge: 0x363144,
  // pool / decorative fountain water
  water: 0x2e3c5e,
  waterMid: 0x4d6190,
  waterHi: 0x9aaad6,

  // wood / fences / lamp posts — warm timber
  woodDark: 0x2e2128,
  woodMid: 0x4e3a3a,
  woodHi: 0x86675a,
  // pastel roof tiles — soft slate-blue / dusty pink
  roof: 0x6a5586,
  roofHi: 0x9986b0,
  roofDark: 0x3a2e4d,
  // siding / cream walls
  thatch: 0xcfb89a,
  thatchHi: 0xefdac0,

  // ο Άλεξ (player) — soft cardigan + warm skin
  cloak: 0x6a5a8a, // muted lavender cardigan
  cloakHi: 0x8e7eb0,
  cloakDark: 0x4a3a6a,
  skin: 0xe2bc94,
  skinDark: 0xb8916b,
  hair: 0x3e2c20,

  // soft interior amber (kept the "ember*" names) — kitchen window glow
  ember: 0xffb267,
  emberHot: 0xfee2b3,
  emberSoft: 0xffd1a0,
  emberDeep: 0xc97a3a,

  // οι Καθαριστές — pale, almost translucent, ghosts of porcelain
  gloom: 0xc8c3d6,
  gloomMid: 0xddd8e8,
  gloomHi: 0xf0ecf6,
  gloomGlow: 0xb8c5e2, // soft moonlight blue (was brake-light red)
  gloomEye: 0xe6ebf6,

  // pickups (kept for memory-candle / kept-things mechanic)
  gold: 0xead9a8, // a folded piece of paper
  goldHi: 0xfff3cf,
  goldDark: 0x9c8a55,
  // a "memory" — a warm-glow kept thing (used in the notebook)
  heart: 0xc46a4e, // a candle flame
  heartHi: 0xfdc890,
  heartDark: 0x5a2e1f,
  // a found photograph
  potion: 0xa48fc9,
  potionHi: 0xdbcaf2,

  // UI ink — warm cream over deep purple panels
  ink: 0xefe6d2,
  inkDim: 0xafa590,
  inkFaint: 0x7b7264,
  panel: 0x1a1428,
  panelHi: 0x2a2240,
  panelEdge: 0x4a3e66,
  panelEdgeHi: 0x7b6c9a,
  hpFull: 0xc46a4e,
  hpRim: 0xeea08a,
  hpEmpty: 0x251a2f,
  shadow: 0x000000,
} as const;

/** Convert a 0xRRGGBB int to a "#rrggbb" string (for CSS-style colours in text styles). */
export function hex(c: number): string {
  return "#" + c.toString(16).padStart(6, "0");
}

/** Linear-ish blend between two 0xRRGGBB ints. t in [0,1]. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Shade a colour toward black (t<0) or white (t>0). */
export function shade(c: number, t: number): number {
  return t < 0 ? mix(c, 0x000000, -t) : mix(c, 0xffffff, t);
}
