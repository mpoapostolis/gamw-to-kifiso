/**
 * Emberwilds colour language.
 *
 * A twilight dark-fantasy palette: cool indigo terrain, warm ember light,
 * bruised-violet "Gloom" enemies. Everything elsewhere references these so the
 * world stays cohesive.
 */
export const PAL = {
  // backdrop / void
  void: 0x07060d,
  night: 0x0d0b16,
  nightSky: 0x161126,

  // terrain
  grassDeep: 0x152619,
  grassMid: 0x1e3727,
  grassHi: 0x2c5236,
  grassDry: 0x394a2a,
  dirt: 0x3a2f24,
  dirtHi: 0x55452f,
  sand: 0x6b5a3c,
  stone: 0x29263a,
  stoneHi: 0x403c54,
  stoneEdge: 0x1a1826,
  water: 0x122a3e,
  waterMid: 0x1b3e58,
  waterHi: 0x2f6f8f,

  // structures
  woodDark: 0x271b13,
  woodMid: 0x3c2b1d,
  woodHi: 0x5a3f29,
  roof: 0x4a2026,
  roofHi: 0x732f37,
  roofDark: 0x301519,
  thatch: 0x6e5328,
  thatchHi: 0x8f6d35,

  // the wanderer (player)
  cloak: 0x7c3528,
  cloakHi: 0xa0473a,
  cloakDark: 0x4f2018,
  skin: 0xdcae7e,
  skinDark: 0xb38758,
  hair: 0x2a1c12,

  // light
  ember: 0xff8a2a,
  emberHot: 0xffe08a,
  emberSoft: 0xffb455,
  emberDeep: 0xc85a18,

  // Gloom (enemies)
  gloom: 0x39204f,
  gloomMid: 0x55307a,
  gloomHi: 0x7c46ad,
  gloomGlow: 0xb866e0,
  gloomEye: 0xe9c6ff,

  // pickups
  gold: 0xffce3d,
  goldHi: 0xfff0a6,
  goldDark: 0xc6921a,
  heart: 0xe25a4a,
  heartHi: 0xff8f7e,
  heartDark: 0x7a2a28,
  potion: 0x3fd6a8,
  potionHi: 0x8ff0d4,

  // UI
  ink: 0xf3ead4,
  inkDim: 0xb9ad92,
  inkFaint: 0x7d745f,
  panel: 0x140f1c,
  panelHi: 0x221a30,
  panelEdge: 0x4d3b62,
  panelEdgeHi: 0x7d5fa0,
  hpFull: 0xe05a4a,
  hpRim: 0xff9384,
  hpEmpty: 0x2e1b20,
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
