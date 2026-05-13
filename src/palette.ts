/**
 * "ΓΑΜΩ ΤΟΝ ΚΗΦΙΣΟ ΜΟΥ" colour language — Athens dawn.
 *
 * Asphalt grays, sodium-orange streetlights, terracotta apartment roofs, and
 * the eyes of every driver in the next lane glowing red.
 *
 * Field names are kept from the previous (dark-fantasy) build so the rendering
 * code reads the same shapes: `grass*` is sidewalk, `dirt` is asphalt, `cloak`
 * is the player's hoodie, `gloom*` is road-rage, `ember*` is sodium-orange
 * streetlight, etc. Only the values change.
 */
export const PAL = {
  // backdrop / pre-dawn sky
  void: 0x07070b,
  night: 0x12121a,
  nightSky: 0x1d1c2a,

  // sidewalk / concrete / cracked pavement (was "grass")
  grassDeep: 0x1b1d22,
  grassMid: 0x2b2d33,
  grassHi: 0x3d3f45,
  grassDry: 0x4a4239, // a strip of dry leaves / dirt by the curb
  // asphalt (was "dirt") — the road itself
  dirt: 0x161618,
  dirtHi: 0x2a2a2c,
  // cobblestone plaza / πλατεία (was "sand")
  sand: 0x5b4d3a,
  // marble tile / kiosk floor (was "stone")
  stone: 0x36363c,
  stoneHi: 0x595a62,
  stoneEdge: 0x1c1c20,
  // puddle (was "water") — reflects sodium light, sky
  water: 0x1a232e,
  waterMid: 0x2e3b48,
  waterHi: 0x6d5a30,

  // metal poles / guard rails / lamp posts (was "wood")
  woodDark: 0x1c1d22,
  woodMid: 0x32333a,
  woodHi: 0x55575f,
  // terracotta tile roofs (Athens apartment buildings)
  roof: 0x5a2820,
  roofHi: 0x8a3a2c,
  roofDark: 0x36160f,
  // balcony / ochre wall trim (was "thatch")
  thatch: 0x8a6a3a,
  thatchHi: 0xb38950,

  // the commuter (player) — dark hoodie + olive skin
  cloak: 0x232428,
  cloakHi: 0x3a3b40,
  cloakDark: 0x111114,
  skin: 0xc99b6c,
  skinDark: 0x9c764e,
  hair: 0x1a120c,

  // sodium-orange streetlight (was "ember") — peak Athens night
  ember: 0xff8e1a,
  emberHot: 0xffd684,
  emberSoft: 0xffaa4d,
  emberDeep: 0xc25210,

  // road-rage drivers (was "Gloom") — gray car bodies with RED brake-light eyes
  gloom: 0x2c2c30,
  gloomMid: 0x46464a,
  gloomHi: 0x686b70,
  gloomGlow: 0xff2f3a, // brake-light red
  gloomEye: 0xff7a82,

  // pickups
  gold: 0xf2c038, // 1€ / 2€ coin
  goldHi: 0xffe8a0,
  goldDark: 0xa6791b,
  // espresso (was "heart") — coffee-cup life pickup
  heart: 0x4a2a16,
  heartHi: 0xb88458, // crema
  heartDark: 0x2a160a,
  // souvlaki / κουλούρι (was "potion") — full heal
  potion: 0xc8884a,
  potionHi: 0xf2c280,

  // UI ink — warm cream
  ink: 0xf3ead4,
  inkDim: 0xb9ad92,
  inkFaint: 0x7d745f,
  panel: 0x141318,
  panelHi: 0x22202a,
  panelEdge: 0x3a3a44,
  panelEdgeHi: 0x6b6b78,
  hpFull: 0x6a3a1c, // coffee-cup brown
  hpRim: 0xb88458,
  hpEmpty: 0x201510,
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
