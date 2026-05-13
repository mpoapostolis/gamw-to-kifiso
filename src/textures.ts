/**
 * Procedural texture forge.
 *
 * Emberwilds ships zero image assets — every tile, creature, prop, particle and
 * UI chrome is drawn here at boot with Phaser's Graphics + Canvas APIs and baked
 * into the texture manager. Keeping it all in one place makes the art language
 * easy to tune.
 */
import Phaser from "phaser";
import { PAL, shade } from "./palette";

export const TILE = 48;

/* ----------------------------------------------------------------------- *
 * tiny seeded PRNG so noise/dither is stable between runs                  *
 * ----------------------------------------------------------------------- */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----------------------------------------------------------------------- *
 * draw helpers                                                            *
 * ----------------------------------------------------------------------- */
type GFX = Phaser.GameObjects.Graphics;

// A detached Graphics — never added to the display/update lists, so it only
// exists to be baked into a texture and then thrown away.
function makeGraphics(scene: Phaser.Scene): GFX {
  return new Phaser.GameObjects.Graphics(scene);
}

/** Draw into a fresh Graphics, bake to `key`, dispose. */
function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: GFX) => void) {
  if (scene.textures.exists(key)) return;
  const g = makeGraphics(scene);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Canvas-backed texture — needed for radial gradients (glow / vignette). */
function canvasTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h);
  if (!t) return;
  const ctx = t.getContext();
  draw(ctx, w, h);
  t.refresh();
}

/** Sprinkle little rects of a colour, deterministic. */
function speckle(
  g: GFX,
  rand: () => number,
  count: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  colour: number,
  alpha = 1,
  size = 1,
) {
  g.fillStyle(colour, alpha);
  for (let i = 0; i < count; i++) {
    const s = size + Math.floor(rand() * size);
    g.fillRect(Math.floor(x0 + rand() * (w - s)), Math.floor(y0 + rand() * (h - s)), s, s);
  }
}

/* ----------------------------------------------------------------------- *
 * GROUND TILES                                                            *
 * ----------------------------------------------------------------------- */
function buildGround(scene: Phaser.Scene) {
  // three grass variants so a tiled field doesn't read as a checkerboard
  for (let v = 0; v < 3; v++) {
    tex(scene, `grass${v}`, TILE, TILE, (g) => {
      const r = mulberry32(1000 + v);
      g.fillStyle(v === 2 ? PAL.grassDry : PAL.grassMid, 1);
      g.fillRect(0, 0, TILE, TILE);
      // mottling
      for (let i = 0; i < 26; i++) {
        const t = r();
        const col = t < 0.4 ? PAL.grassDeep : t < 0.8 ? PAL.grassHi : PAL.grassDry;
        g.fillStyle(col, 0.5 + r() * 0.4);
        const bw = 3 + Math.floor(r() * 7);
        const bh = 2 + Math.floor(r() * 4);
        g.fillRect(Math.floor(r() * (TILE - bw)), Math.floor(r() * (TILE - bh)), bw, bh);
      }
      // a few blades
      g.lineStyle(1, shade(PAL.grassHi, 0.12), 0.6);
      for (let i = 0; i < 7; i++) {
        const x = 3 + Math.floor(r() * (TILE - 6));
        const y = 6 + Math.floor(r() * (TILE - 8));
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (r() < 0.5 ? -1 : 1) * (2 + r() * 2), y - 4 - r() * 3);
        g.strokePath();
      }
    });
  }

  // worn dirt path — drawn slightly soft-edged so overlapping tiles read as a trail
  tex(scene, "path", TILE, TILE, (g) => {
    const r = mulberry32(2024);
    g.fillStyle(PAL.dirt, 1);
    g.fillRoundedRect(-2, -2, TILE + 4, TILE + 4, 6);
    speckle(g, r, 40, 0, 0, TILE, TILE, PAL.dirtHi, 0.5, 1);
    speckle(g, r, 22, 0, 0, TILE, TILE, shade(PAL.dirt, -0.25), 0.6, 1);
    // pebbles
    g.fillStyle(PAL.sand, 0.5);
    for (let i = 0; i < 5; i++) g.fillCircle(4 + r() * (TILE - 8), 4 + r() * (TILE - 8), 1 + r());
  });

  // packed sand / plaza floor
  tex(scene, "sand", TILE, TILE, (g) => {
    const r = mulberry32(777);
    g.fillStyle(PAL.sand, 1);
    g.fillRect(0, 0, TILE, TILE);
    speckle(g, r, 36, 0, 0, TILE, TILE, shade(PAL.sand, 0.12), 0.4);
    speckle(g, r, 24, 0, 0, TILE, TILE, shade(PAL.sand, -0.22), 0.5);
  });

  // stone flagging (for around the well / shrine)
  tex(scene, "stonefloor", TILE, TILE, (g) => {
    g.fillStyle(PAL.stone, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(2, PAL.stoneEdge, 1);
    g.strokeRect(1, 1, TILE - 2, TILE - 2);
    g.lineStyle(1, shade(PAL.stone, 0.16), 0.7);
    g.lineBetween(TILE / 2, 1, TILE / 2, TILE - 1);
    g.lineBetween(1, TILE / 2, TILE - 1, TILE / 2);
    g.fillStyle(PAL.stoneHi, 0.18);
    g.fillRect(3, 3, TILE / 2 - 5, TILE / 2 - 5);
    g.fillRect(TILE / 2 + 2, TILE / 2 + 2, TILE / 2 - 5, TILE / 2 - 5);
  });

  // water — 3 animated frames (ripple highlights drift)
  for (let f = 0; f < 3; f++) {
    tex(scene, `water${f}`, TILE, TILE, (g) => {
      const r = mulberry32(50 + f);
      g.fillStyle(PAL.water, 1);
      g.fillRect(0, 0, TILE, TILE);
      g.fillStyle(PAL.waterMid, 0.6);
      for (let i = 0; i < 5; i++) {
        const y = ((i * 11 + f * 5) % TILE) + 2;
        g.fillRect(0, y, TILE, 2 + (i % 2));
      }
      g.fillStyle(PAL.waterHi, 0.5);
      for (let i = 0; i < 6; i++) {
        const x = ((i * 9 + f * 7) % (TILE - 6)) + 2;
        const y = ((i * 13 + f * 4) % (TILE - 4)) + 2;
        g.fillRect(x, y, 3 + Math.floor(r() * 3), 1);
      }
      // foam fleck
      g.fillStyle(0xeaf6ff, 0.35);
      g.fillRect((f * 17) % (TILE - 4), (f * 23 + 6) % (TILE - 4), 2, 1);
    });
  }
}

/* ----------------------------------------------------------------------- *
 * PROPS  (trees / rocks / fences / structures / small dressing)           *
 * ----------------------------------------------------------------------- */
/**
 * Athens shop awning — a striped fabric panel that hangs over the sidewalk.
 * Repurposes the old "tree canopy" slot, so the y-sort effect ("things drawn
 * above actors when they walk under") now reads as "walking beneath an awning".
 */
function shopAwning(g: GFX, cx: number, cy: number, halfW: number, halfH: number, seed: number) {
  const r = mulberry32(seed);
  // hanging bar / pole that the awning attaches to
  g.fillStyle(PAL.woodDark, 1);
  g.fillRect(cx - halfW - 4, cy + halfH - 4, halfW * 2 + 8, 3);
  // fabric back (drop shadow)
  g.fillStyle(PAL.shadow, 0.3);
  g.fillRoundedRect(cx - halfW + 4, cy - halfH + 8, halfW * 2, halfH * 2, 6);
  // fabric body
  const stripeA = r() > 0.5 ? PAL.roof : PAL.thatch; // red or ochre
  const stripeB = PAL.ink;
  g.fillStyle(stripeA, 1);
  g.fillRoundedRect(cx - halfW, cy - halfH, halfW * 2, halfH * 2, 6);
  // vertical stripes
  const stripeW = 14;
  for (let x = -halfW; x < halfW; x += stripeW * 2) {
    g.fillStyle(stripeB, 0.92);
    g.fillRect(cx + x + stripeW, cy - halfH + 2, stripeW, halfH * 2 - 4);
  }
  // scalloped lower edge
  g.fillStyle(stripeA, 1);
  for (let i = 0; i < halfW * 2 / 12; i++) {
    g.fillTriangle(cx - halfW + i * 12, cy + halfH - 1, cx - halfW + i * 12 + 12, cy + halfH - 1, cx - halfW + i * 12 + 6, cy + halfH + 6);
  }
  // a faded shop name — three blocky "letters" we don't care about
  g.fillStyle(PAL.panel, 0.55);
  for (let i = 0; i < 3; i++) g.fillRect(cx - 18 + i * 12, cy - 4, 8, 8);
  // top highlight
  g.fillStyle(PAL.ink, 0.18);
  g.fillRect(cx - halfW + 2, cy - halfH + 2, halfW * 2 - 4, 3);
}

function buildProps(scene: Phaser.Scene) {
  // ---- STREET LAMP POST (was: broadleaf tree). Pole + arm + lamp head.
  // The y-sort companion ("canopy") is now a shop awning hung high.
  tex(scene, "tree_trunk", 40, 56, (g) => {
    g.fillStyle(PAL.shadow, 0.28);
    g.fillEllipse(20, 52, 22, 8);
    // base plate
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(15, 47, 10, 6);
    // pole
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(18, 6, 4, 44);
    g.fillStyle(PAL.woodHi, 0.6);
    g.fillRect(19, 8, 1, 40);
    // curved arm holding the lamp head (top-right)
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(22, 6, 8, 3);
    g.fillTriangle(22, 6, 30, 6, 26, 2);
    // lamp head (warm box)
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(26, 1, 12, 9);
    g.fillStyle(PAL.emberSoft, 1);
    g.fillRect(27, 2, 10, 7);
    g.fillStyle(PAL.emberHot, 1);
    g.fillEllipse(32, 5, 8, 5);
    // hanger bolts
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(20, 20, 4, 2);
    g.fillRect(20, 34, 4, 2);
  });
  // The "canopy" slot becomes an Athens shop awning hung at sign-height.
  tex(scene, "tree_canopy", 112, 60, (g) => shopAwning(g, 56, 30, 44, 18, 4242));
  tex(scene, "tree_canopy_b", 120, 64, (g) => shopAwning(g, 60, 32, 50, 20, 9931));

  // ---- TRAFFIC LIGHT POLE (was: pine). Tall pole + three-light housing.
  tex(scene, "pine", 56, 88, (g) => {
    g.fillStyle(PAL.shadow, 0.26);
    g.fillEllipse(28, 84, 26, 9);
    // base plate
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(22, 78, 12, 6);
    // pole
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(26, 18, 4, 62);
    g.fillStyle(PAL.woodHi, 0.5);
    g.fillRect(27, 22, 1, 56);
    // horizontal arm
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(28, 22, 14, 3);
    // light housing (boxy, 3 lights stacked)
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(20, 2, 16, 26);
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(21, 3, 14, 24);
    // RED (top) — currently lit
    g.fillStyle(PAL.gloomGlow, 1);
    g.fillCircle(28, 8, 4);
    g.fillStyle(PAL.gloomEye, 0.7);
    g.fillCircle(27, 7, 2);
    // amber (middle), green (bottom) — dark
    g.fillStyle(shade(PAL.ember, -0.55), 1);
    g.fillCircle(28, 15, 4);
    g.fillStyle(shade(0x3aaa66, -0.55), 1);
    g.fillCircle(28, 22, 4);
    // visor over the red
    g.fillStyle(PAL.shadow, 0.4);
    g.fillTriangle(22, 8, 34, 8, 28, 4);
  });

  // ---- TRASH BAG PILE (was: bush). Dark blobs with the occasional taillight glint.
  tex(scene, "bush", 56, 40, (g) => {
    g.fillStyle(PAL.shadow, 0.26);
    g.fillEllipse(28, 34, 42, 10);
    // bag bodies — squat dark sacks
    g.fillStyle(PAL.cloakDark, 1);
    g.fillEllipse(16, 28, 22, 18);
    g.fillEllipse(40, 28, 24, 20);
    g.fillEllipse(28, 22, 26, 22);
    g.fillStyle(PAL.cloak, 1);
    g.fillEllipse(16, 26, 18, 14);
    g.fillEllipse(40, 26, 20, 16);
    g.fillEllipse(28, 20, 22, 18);
    // bag knot highlights at the top
    g.fillStyle(PAL.cloakHi, 0.85);
    g.fillTriangle(13, 15, 19, 15, 16, 9);
    g.fillTriangle(37, 14, 43, 14, 40, 8);
    g.fillTriangle(25, 10, 31, 10, 28, 4);
    // a beer bottle neck poking out
    g.fillStyle(0x2a4a2a, 1);
    g.fillRect(35, 14, 2, 6);
    g.fillStyle(shade(0x2a4a2a, 0.3), 1);
    g.fillRect(35, 14, 1, 6);
    // a stray red plastic — a brake-light glint
    g.fillStyle(PAL.gloomGlow, 0.7);
    g.fillRect(20, 24, 2, 2);
  });

  // ---- rocks
  for (const [key, w, h, seed] of [
    ["rock", 40, 30, 13],
    ["rock_big", 64, 46, 31],
  ] as const) {
    tex(scene, key, w, h, (g) => {
      const r = mulberry32(seed);
      g.fillStyle(PAL.shadow, 0.24);
      g.fillEllipse(w / 2, h - 5, w * 0.8, 9);
      g.fillStyle(shade(PAL.stone, -0.15), 1);
      g.fillRoundedRect(4, 6, w - 8, h - 10, 8);
      g.fillStyle(PAL.stone, 1);
      g.fillRoundedRect(5, 4, w - 12, h - 14, 7);
      g.fillStyle(PAL.stoneHi, 0.8);
      g.fillTriangle(8, 8, w * 0.55, 4, w * 0.35, h - 12);
      g.fillStyle(shade(PAL.stone, 0.2), 0.6);
      speckle(g, r, 10, 6, 5, w - 12, h - 12, shade(PAL.stone, 0.25), 0.5, 1);
      // a tuft of moss
      g.fillStyle(PAL.grassHi, 0.8);
      g.fillCircle(w - 12, 9, 3);
      g.fillCircle(w - 9, 11, 2);
    });
  }

  // ---- wooden fence segments (horizontal & vertical posts+rails)
  tex(scene, "fence_h", TILE, 28, (g) => {
    g.fillStyle(PAL.shadow, 0.2);
    g.fillRect(0, 22, TILE, 4);
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(0, 8, TILE, 4); // top rail
    g.fillRect(0, 16, TILE, 4); // bottom rail
    g.fillStyle(PAL.woodHi, 0.5);
    g.fillRect(0, 8, TILE, 1);
    g.fillRect(0, 16, TILE, 1);
    // posts
    for (const px of [3, TILE / 2 - 3, TILE - 9]) {
      g.fillStyle(PAL.woodDark, 1);
      g.fillRect(px, 2, 6, 24);
      g.fillStyle(PAL.woodMid, 1);
      g.fillRect(px, 2, 3, 24);
    }
  });
  tex(scene, "fence_v", 28, TILE, (g) => {
    g.fillStyle(PAL.shadow, 0.2);
    g.fillEllipse(14, TILE - 3, 18, 6);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(10, 2, 8, TILE - 4);
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(10, 2, 4, TILE - 4);
    g.fillStyle(PAL.woodHi, 0.45);
    g.fillRect(11, 4, 1, TILE - 8);
    // little cross rail nub
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(2, 14, 24, 4);
    g.fillRect(2, TILE - 22, 24, 4);
  });

  // ---- signpost
  tex(scene, "sign", 36, 44, (g) => {
    g.fillStyle(PAL.shadow, 0.24);
    g.fillEllipse(18, 40, 22, 7);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(15, 12, 6, 28);
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(15, 12, 3, 28);
    g.fillStyle(PAL.woodMid, 1);
    g.fillRoundedRect(2, 6, 32, 16, 2);
    g.fillStyle(PAL.woodHi, 0.5);
    g.fillRect(3, 7, 30, 2);
    g.lineStyle(1, PAL.woodDark, 0.8);
    g.lineBetween(5, 12, 25, 12);
    g.lineBetween(5, 16, 20, 16);
    // arrow tip
    g.fillStyle(PAL.woodMid, 1);
    g.fillTriangle(34, 6, 34, 22, 42, 14);
  });

  // ---- well (stone, with little roof) — collidable centre
  tex(scene, "well", 80, 92, (g) => {
    g.fillStyle(PAL.shadow, 0.3);
    g.fillEllipse(40, 80, 64, 16);
    // base ring
    g.fillStyle(shade(PAL.stone, -0.2), 1);
    g.fillEllipse(40, 64, 60, 26);
    g.fillStyle(PAL.stone, 1);
    g.fillEllipse(40, 60, 56, 24);
    // brick courses
    g.lineStyle(1, PAL.stoneEdge, 0.8);
    for (let i = 0; i < 5; i++) {
      const x = 16 + i * 12;
      g.lineBetween(x, 50, x + 4, 70);
    }
    // dark mouth
    g.fillStyle(PAL.void, 1);
    g.fillEllipse(40, 56, 40, 16);
    g.fillStyle(PAL.water, 0.8);
    g.fillEllipse(40, 58, 20, 7);
    // posts + roof
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(15, 12, 6, 40);
    g.fillRect(59, 12, 6, 40);
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(15, 12, 3, 40);
    g.fillRect(59, 12, 3, 40);
    // crossbar + bucket rope
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(18, 10, 44, 5);
    g.lineStyle(1, PAL.woodHi, 1);
    g.lineBetween(40, 14, 40, 40);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(36, 38, 8, 7);
    g.fillStyle(PAL.woodHi, 0.5);
    g.fillRect(37, 39, 2, 5);
    // roof
    g.fillStyle(PAL.roofDark, 1);
    g.fillTriangle(6, 14, 74, 14, 40, -8);
    g.fillStyle(PAL.roof, 1);
    g.fillTriangle(10, 13, 70, 13, 40, -4);
    g.fillStyle(PAL.roofHi, 0.5);
    g.fillTriangle(13, 12, 40, 12, 38, 0);
  });

  // ---- BARREL FIRE: 3 flicker frames. The "logs" are now a perforated metal
  // drum (the kind the Athens guys gather around in winter).
  for (let f = 0; f < 3; f++) {
    tex(scene, `fire${f}`, 40, 44, (g) => {
      g.fillStyle(PAL.shadow, 0.3);
      g.fillEllipse(20, 40, 32, 8);
      // drum body
      g.fillStyle(shade(PAL.woodDark, -0.15), 1);
      g.fillRect(8, 24, 24, 16);
      g.fillStyle(PAL.woodMid, 1);
      g.fillRect(9, 24, 22, 16);
      g.fillStyle(PAL.woodHi, 0.45);
      g.fillRect(9, 26, 22, 2);
      // drum bands
      g.fillStyle(shade(PAL.woodDark, -0.2), 1);
      g.fillRect(8, 27, 24, 2);
      g.fillRect(8, 35, 24, 2);
      // perforations glowing from inside
      g.fillStyle(PAL.emberHot, 1);
      for (let i = 0; i < 5; i++) g.fillRect(11 + i * 4, 31, 2, 2);
      g.fillStyle(PAL.emberSoft, 0.7);
      for (let i = 0; i < 4; i++) g.fillRect(13 + i * 4, 33, 2, 1);
      // rim at the top
      g.fillStyle(PAL.void, 1);
      g.fillRect(8, 22, 24, 3);
      g.fillStyle(shade(PAL.woodMid, 0.2), 1);
      g.fillRect(8, 22, 24, 1);
      // flame
      const wob = (f - 1) * 2;
      g.fillStyle(PAL.emberDeep, 1);
      g.fillTriangle(10 + wob, 30, 30 + wob, 30, 20 + wob, 6 - f);
      g.fillStyle(PAL.ember, 1);
      g.fillTriangle(13 + wob, 30, 27 + wob, 30, 20 + wob * 1.5, 11 - f);
      g.fillStyle(PAL.emberSoft, 1);
      g.fillTriangle(15 + wob, 30, 24 + wob, 30, 20 + wob, 15 - f);
      g.fillStyle(PAL.emberHot, 1);
      g.fillTriangle(17 + wob, 30, 22 + wob, 30, 20 + wob, 20);
      // a stray spark
      g.fillStyle(PAL.emberHot, 0.9);
      g.fillRect(20 + wob * 2 + (f - 1) * 3, 4 + f, 2, 2);
    });
  }

  // ---- lantern post (light source for the village paths)
  tex(scene, "lamp", 26, 64, (g) => {
    g.fillStyle(PAL.shadow, 0.24);
    g.fillEllipse(13, 60, 16, 6);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(10, 14, 6, 46);
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(10, 14, 3, 46);
    // arm + cage
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(13, 12, 4, 4);
    g.fillStyle(0x2a2630, 1);
    g.fillRoundedRect(6, 8, 14, 16, 3);
    g.fillStyle(PAL.emberSoft, 1);
    g.fillRoundedRect(8, 10, 10, 12, 2);
    g.fillStyle(PAL.emberHot, 1);
    g.fillEllipse(13, 16, 7, 9);
    // cap
    g.fillStyle(0x2a2630, 1);
    g.fillTriangle(4, 8, 22, 8, 13, 1);
  });

  // ---- flower & mushroom & grass tuft (ground dressing, no collision)
  tex(scene, "flower", 16, 18, (g) => {
    g.lineStyle(1, PAL.grassHi, 1);
    g.lineBetween(8, 17, 8, 9);
    g.fillStyle(PAL.emberSoft, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.fillCircle(8 + Math.cos(a) * 3.4, 6 + Math.sin(a) * 3.4, 2.2);
    }
    g.fillStyle(PAL.emberHot, 1);
    g.fillCircle(8, 6, 2);
  });
  tex(scene, "flower_v", 16, 18, (g) => {
    g.lineStyle(1, PAL.grassHi, 1);
    g.lineBetween(8, 17, 8, 9);
    g.fillStyle(PAL.gloomGlow, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      g.fillCircle(8 + Math.cos(a) * 3.4, 6 + Math.sin(a) * 3.4, 2.2);
    }
    g.fillStyle(PAL.gloomEye, 1);
    g.fillCircle(8, 6, 1.8);
  });
  tex(scene, "mushroom", 18, 16, (g) => {
    g.fillStyle(PAL.shadow, 0.2);
    g.fillEllipse(9, 14, 12, 4);
    g.fillStyle(0xd9c9b0, 1);
    g.fillRect(7, 8, 4, 6);
    g.fillStyle(PAL.heart, 1);
    g.fillEllipse(9, 7, 14, 9);
    g.fillStyle(PAL.heartDark, 1);
    g.fillRect(2, 7, 14, 3);
    g.fillStyle(0xfff1e0, 0.9);
    g.fillCircle(6, 5, 1.5);
    g.fillCircle(12, 6, 1.3);
    g.fillCircle(9, 8, 1.1);
  });
  tex(scene, "tuft", 18, 14, (g) => {
    g.lineStyle(1, PAL.grassHi, 0.9);
    for (let i = -2; i <= 2; i++) {
      g.lineBetween(9 + i * 2.5, 13, 9 + i * 3.4, 4 + Math.abs(i));
    }
    g.lineStyle(1, PAL.grassDry, 0.8);
    g.lineBetween(9, 13, 11, 3);
  });

  // ---- houses (whole-building textures; collide on most of the footprint)
  buildHouse(scene, "house_a", 5, 4, PAL.roof, PAL.roofHi);
  buildHouse(scene, "house_b", 4, 4, PAL.thatch, PAL.thatchHi, true);
  buildHouse(scene, "house_c", 6, 5, PAL.roofDark, PAL.roof);
}

function buildHouse(
  scene: Phaser.Scene,
  key: string,
  tw: number,
  th: number,
  roofCol: number,
  roofHi: number,
  thatch = false,
) {
  const w = tw * TILE;
  const wallH = th * TILE * 0.62;
  const roofH = th * TILE * 0.62;
  const h = wallH + roofH + 14;
  tex(scene, key, w, h, (g) => {
    const baseY = roofH;
    // shadow
    g.fillStyle(PAL.shadow, 0.3);
    g.fillEllipse(w / 2, h - 4, w * 0.94, 18);
    // walls
    g.fillStyle(shade(PAL.woodMid, -0.18), 1);
    g.fillRect(0, baseY, w, wallH + 12);
    g.fillStyle(PAL.woodMid, 1);
    g.fillRect(3, baseY + 2, w - 6, wallH + 8);
    // plank lines
    g.lineStyle(1, shade(PAL.woodMid, -0.25), 0.6);
    for (let x = TILE; x < w; x += TILE) g.lineBetween(x, baseY + 2, x, baseY + wallH + 8);
    g.fillStyle(PAL.woodHi, 0.18);
    g.fillRect(3, baseY + 2, w - 6, 4);
    // door
    const dw = Math.min(TILE * 0.9, 44);
    const dx = w / 2 - dw / 2;
    const dy = baseY + wallH + 12 - TILE * 0.95;
    g.fillStyle(PAL.woodDark, 1);
    g.fillRoundedRect(dx, dy, dw, TILE * 0.95, 4);
    g.fillStyle(shade(PAL.woodDark, 0.15), 1);
    g.fillRect(dx + 3, dy + 3, dw - 6, TILE * 0.95 - 5);
    g.lineStyle(1, PAL.woodDark, 1);
    g.lineBetween(dx + dw / 2, dy + 3, dx + dw / 2, dy + TILE * 0.95 - 4);
    g.fillStyle(PAL.gold, 1);
    g.fillCircle(dx + dw - 7, dy + TILE * 0.5, 2);
    // windows (warm light inside)
    const winY = baseY + 12;
    for (const cx of tw >= 5 ? [w * 0.22, w * 0.78] : [w * 0.78]) {
      g.fillStyle(PAL.woodDark, 1);
      g.fillRect(cx - 13, winY - 2, 26, 22);
      g.fillStyle(PAL.emberSoft, 0.9);
      g.fillRect(cx - 10, winY, 20, 16);
      g.fillStyle(PAL.emberHot, 0.7);
      g.fillRect(cx - 9, winY + 9, 18, 6);
      g.lineStyle(2, PAL.woodDark, 1);
      g.lineBetween(cx, winY, cx, winY + 16);
      g.lineBetween(cx - 10, winY + 8, cx + 10, winY + 8);
      // sill
      g.fillStyle(PAL.woodHi, 1);
      g.fillRect(cx - 14, winY + 19, 28, 3);
    }
    // roof (overhangs)
    if (thatch) {
      g.fillStyle(shade(roofCol, -0.2), 1);
      g.fillTriangle(-8, baseY + 8, w + 8, baseY + 8, w / 2, -6);
      g.fillStyle(roofCol, 1);
      g.fillTriangle(-4, baseY + 6, w + 4, baseY + 6, w / 2, -2);
      // straw streaks
      g.lineStyle(1, roofHi, 0.5);
      for (let i = 0; i < 22; i++) {
        const t = i / 22;
        const lx = -4 + t * (w + 8);
        g.lineBetween(lx, baseY + 6, lx + 2, baseY + 6 - 14);
      }
      g.fillStyle(roofHi, 0.6);
      g.fillTriangle(2, baseY + 4, w / 2, 2, w / 2 - 3, baseY + 4);
    } else {
      g.fillStyle(shade(roofCol, -0.22), 1);
      g.fillTriangle(-8, baseY + 10, w + 8, baseY + 10, w / 2, -10);
      g.fillStyle(roofCol, 1);
      g.fillTriangle(-4, baseY + 8, w + 4, baseY + 8, w / 2, -5);
      // shingles
      g.fillStyle(shade(roofCol, -0.12), 0.7);
      for (let row = 0; row < 5; row++) {
        const yy = baseY + 6 - row * (baseY / 5.5);
        const inset = (row / 5) * (w / 2 - 6);
        g.fillRect(inset - 2, yy - 2, w - inset * 2 + 4, 3);
      }
      g.fillStyle(roofHi, 0.55);
      g.fillTriangle(0, baseY + 6, w / 2, 0, w / 2 - 4, baseY + 6);
      // ridge
      g.fillStyle(shade(roofCol, 0.1), 1);
      g.fillRect(w / 2 - 2, -6, 4, baseY + 12);
    }
    // chimney with a wisp
    g.fillStyle(PAL.stone, 1);
    g.fillRect(w * 0.72, -4, 14, roofH * 0.55);
    g.fillStyle(PAL.stoneHi, 0.5);
    g.fillRect(w * 0.72, -4, 4, roofH * 0.55);
    g.fillStyle(PAL.stoneEdge, 1);
    g.fillRect(w * 0.72 - 2, -7, 18, 4);
  });
}

/* ----------------------------------------------------------------------- *
 * ACTORS — the wanderer, the Gloom, villagers                             *
 * ----------------------------------------------------------------------- */
// A small "drop shadow + bell-cloak figure" builder shared by player & NPCs.
type FigureOpts = {
  cloak: number;
  cloakHi: number;
  cloakDark: number;
  skin: number;
  facing: "down" | "up" | "side";
  step: number; // -1, 0, 1 — leg/arm pose
  accent?: number; // gem / brooch colour
  hat?: "hood" | "wide" | "none";
  staff?: boolean;
};
function drawFigure(g: GFX, w: number, h: number, o: FigureOpts) {
  const cx = w / 2;
  const footY = h - 4;
  const bob = o.step === 0 ? 0 : -1;
  // shadow
  g.fillStyle(PAL.shadow, 0.26);
  g.fillEllipse(cx, footY + 1, 22, 8);
  // feet
  g.fillStyle(PAL.woodDark, 1);
  if (o.facing === "side") {
    g.fillRect(cx - 3 + o.step * 3, footY - 3, 7, 4);
    g.fillRect(cx - 6 - o.step * 2, footY - 2, 6, 3);
  } else {
    g.fillRect(cx - 6, footY - 3 + (o.step > 0 ? -1 : 0), 5, 4);
    g.fillRect(cx + 1, footY - 3 + (o.step < 0 ? -1 : 0), 5, 4);
  }
  // cloak bell (polygon)
  const topY = 14 + bob;
  const hipW = 14;
  const shoW = 9;
  g.fillStyle(o.cloakDark, 1);
  g.fillPoints(
    [
      new Phaser.Geom.Point(cx - shoW, topY),
      new Phaser.Geom.Point(cx + shoW, topY),
      new Phaser.Geom.Point(cx + hipW, footY - 2),
      new Phaser.Geom.Point(cx + hipW - 4 + o.step * 2, footY - 1),
      new Phaser.Geom.Point(cx - hipW + 4 + o.step * 2, footY - 1),
      new Phaser.Geom.Point(cx - hipW, footY - 2),
    ],
    true,
  );
  // cloak mid + light side
  g.fillStyle(o.cloak, 1);
  g.fillPoints(
    [
      new Phaser.Geom.Point(cx - shoW + 1, topY + 1),
      new Phaser.Geom.Point(cx + shoW - 1, topY + 1),
      new Phaser.Geom.Point(cx + hipW - 2, footY - 3),
      new Phaser.Geom.Point(cx - hipW + 2, footY - 3),
    ],
    true,
  );
  g.fillStyle(o.cloakHi, 0.5);
  g.fillTriangle(cx - shoW + 1, topY + 2, cx - 1, topY + 2, cx - hipW + 3, footY - 4);
  // belt
  g.fillStyle(shade(o.cloakDark, -0.2), 1);
  g.fillRect(cx - hipW + 4, footY - 16, hipW * 2 - 8, 3);
  if (o.accent) {
    g.fillStyle(o.accent, 1);
    g.fillCircle(cx, footY - 15, 2.2);
  }
  // head + headwear
  const headY = topY - 4;
  g.fillStyle(o.skin, 1);
  g.fillCircle(cx, headY, 6.4);
  g.fillStyle(shade(o.skin, -0.18), 1);
  g.fillCircle(cx + (o.facing === "side" ? 2 : 0), headY + 2, 5.6);
  g.fillStyle(o.skin, 1);
  g.fillCircle(cx + (o.facing === "side" ? 1 : 0), headY, 5.4);
  // hair / hood
  if (o.hat === "wide") {
    g.fillStyle(shade(o.cloakDark, 0), 1);
    g.fillEllipse(cx, headY - 1, 24, 8);
    g.fillStyle(o.cloak, 1);
    g.fillEllipse(cx, headY - 4, 12, 9);
    g.fillStyle(o.cloakHi, 0.5);
    g.fillEllipse(cx - 2, headY - 5, 6, 5);
  } else if (o.hat !== "none") {
    // hood crescent
    g.fillStyle(o.cloakDark, 1);
    g.fillCircle(cx, headY - 1, 8);
    g.fillStyle(o.cloak, 1);
    g.fillCircle(cx, headY - 2, 7);
    g.fillStyle(o.cloakHi, 0.5);
    g.fillCircle(cx - 2, headY - 3, 3.4);
    // carve the face opening back out
    g.fillStyle(o.skin, 1);
    if (o.facing === "down") g.fillEllipse(cx, headY + 1, 8, 8);
    else if (o.facing === "side") g.fillEllipse(cx + 3, headY + 1, 6, 8);
    // up: leave hood closed
    g.fillStyle(shade(o.skin, -0.18), 1);
    if (o.facing === "down") g.fillEllipse(cx, headY + 3, 6, 4);
  }
  // face
  if (o.facing === "down") {
    g.fillStyle(PAL.void, 0.85);
    g.fillCircle(cx - 2.4, headY + 1, 1.2);
    g.fillCircle(cx + 2.4, headY + 1, 1.2);
  } else if (o.facing === "side") {
    g.fillStyle(PAL.void, 0.85);
    g.fillCircle(cx + 3.4, headY + 1, 1.2);
  }
  // arms / lantern / staff (drawn for side & down)
  if (o.staff) {
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(cx + (o.facing === "side" ? 7 : 9), headY - 6, 3, footY - headY + 4);
    g.fillStyle(o.accent ?? PAL.potionHi, 1);
    g.fillCircle(cx + (o.facing === "side" ? 8.5 : 10.5), headY - 8, 3.4);
  } else {
    // a hand on the hip / forward — lantern is added as a child sprite in code
    g.fillStyle(o.skin, 1);
    if (o.facing === "side") g.fillCircle(cx + 8 + o.step, footY - 18, 2.4);
    else {
      g.fillCircle(cx - hipW + 2, footY - 14, 2.4);
      g.fillCircle(cx + hipW - 2, footY - 14, 2.4);
    }
  }
}

function buildActors(scene: Phaser.Scene) {
  const W = 34;
  const H = 44;
  // player — rust cloak, hooded; 2 walk frames per facing
  const playerOpts = {
    cloak: PAL.cloak,
    cloakHi: PAL.cloakHi,
    cloakDark: PAL.cloakDark,
    skin: PAL.skin,
    accent: PAL.emberHot,
    hat: "hood" as const,
  };
  for (const facing of ["down", "up", "side"] as const) {
    for (let f = 0; f < 2; f++) {
      tex(scene, `player_${facing}_${f}`, W, H, (g) =>
        drawFigure(g, W, H, { ...playerOpts, facing, step: f === 0 ? 0 : 1 }),
      );
    }
    // a third "mid" frame (mirror of step) for a 4-key cycle: 0,1,0,2
    tex(scene, `player_${facing}_2`, W, H, (g) =>
      drawFigure(g, W, H, { ...playerOpts, facing, step: -1 }),
    );
  }
  // a "hurt" pose
  tex(scene, "player_hurt", W, H, (g) =>
    drawFigure(g, W, H, { ...playerOpts, facing: "down", step: 0 }),
  );

  // villagers — recoloured for Athens dawn
  const villagers: Record<string, FigureOpts> = {
    // Παππού Γιάννης — the kiosk owner. Working-class blue cardigan, flat cap.
    npc_elder: {
      cloak: 0x2a3a55,
      cloakHi: 0x4a648c,
      cloakDark: 0x18233a,
      skin: PAL.skinDark,
      facing: "down",
      step: 0,
      hat: "hood", // reads as a flat cap with the new palette
      staff: true, // a long umbrella propped on the kiosk
      accent: 0x9c2a2a, // a red scarf clasp
    },
    // Κυρά Σούλα — μανάβικο owner. Flowered apron, headscarf.
    npc_merchant: {
      cloak: 0x7a2a2a,
      cloakHi: 0xbf4a4a,
      cloakDark: 0x4a1818,
      skin: PAL.skin,
      facing: "down",
      step: 0,
      hat: "wide", // the headscarf
      accent: PAL.thatchHi,
    },
    // Στέλιος ο μηχανικός — greasy mechanic in coveralls.
    npc_smith: {
      cloak: 0x4a5660,
      cloakHi: 0x6a7882,
      cloakDark: 0x282d33,
      skin: PAL.skinDark,
      facing: "down",
      step: 0,
      hat: "none",
      accent: PAL.ember, // a hi-vis chest stripe
    },
    // Νικολάκης — skiving-school kid in a loud sweatshirt.
    npc_child: {
      cloak: 0xc2872a,
      cloakHi: 0xf3b550,
      cloakDark: 0x6b4818,
      skin: PAL.skin,
      facing: "down",
      step: 0,
      hat: "none",
      accent: PAL.gloomGlow, // a red backpack strap
    },
  };
  for (const [key, opt] of Object.entries(villagers)) {
    const hh = key === "npc_child" ? H - 8 : H;
    tex(scene, key, W, hh, (g) => drawFigure(g, W, hh, opt));
    tex(scene, `${key}_b`, W, hh, (g) => drawFigure(g, W, hh, { ...opt, step: 1 }));
  }

  // ---- Gloom enemy — bruised-violet blob, 3 squash/stretch frames + a glow child
  const GW = 40;
  const GH = 36;
  const gloomFrame = (g: GFX, squash: number) => {
    const cx = GW / 2;
    const baseY = GH - 4;
    const rx = 13 + squash * 3;
    const ry = 12 - squash * 4;
    const top = baseY - ry * 2;
    // shadow
    g.fillStyle(PAL.shadow, 0.22);
    g.fillEllipse(cx, baseY + 1, rx * 1.7, 7);
    // body
    g.fillStyle(PAL.gloom, 1);
    g.fillEllipse(cx, baseY - ry, rx, ry * 2);
    g.fillStyle(PAL.gloomMid, 1);
    g.fillEllipse(cx, baseY - ry - 1, rx - 2, ry * 2 - 3);
    // rim light
    g.fillStyle(PAL.gloomHi, 0.7);
    g.fillEllipse(cx - rx * 0.35, top + ry * 0.7, rx * 0.45, ry * 0.6);
    // gloopy drips at the base
    g.fillStyle(PAL.gloom, 1);
    g.fillCircle(cx - rx * 0.7, baseY - 2, 2.4);
    g.fillCircle(cx + rx * 0.65, baseY - 1, 2.8);
    // wisp tendrils rising
    g.fillStyle(PAL.gloomMid, 0.5);
    g.fillTriangle(cx - 4, top + 2, cx, top - 6 - squash * 3, cx + 2, top + 2);
    g.fillStyle(PAL.gloomGlow, 0.35);
    g.fillCircle(cx + 1, top - 7 - squash * 3, 2);
    // eyes
    const eyeY = baseY - ry - 1;
    g.fillStyle(PAL.gloomEye, 1);
    g.fillCircle(cx - 4, eyeY, 2.4);
    g.fillCircle(cx + 4, eyeY, 2.4);
    g.fillStyle(PAL.void, 1);
    g.fillCircle(cx - 4, eyeY + 0.4, 1);
    g.fillCircle(cx + 4, eyeY + 0.4, 1);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(cx - 4.8, eyeY - 0.8, 0.7);
    g.fillCircle(cx + 3.2, eyeY - 0.8, 0.7);
  };
  tex(scene, "gloom_0", GW, GH, (g) => gloomFrame(g, 0));
  tex(scene, "gloom_1", GW, GH, (g) => gloomFrame(g, 0.8));
  tex(scene, "gloom_2", GW, GH, (g) => gloomFrame(g, -0.5));
  // a bigger "Gloom Warden" mini-boss recolour
  tex(scene, "warden_0", GW + 18, GH + 14, (g) => {
    const s = (GW + 18) / GW;
    g.save();
    g.scaleCanvas(s, s);
    gloomFrame(g, 0.2);
    g.restore();
    // a jagged crown of shards
    g.fillStyle(PAL.gloomGlow, 0.9);
    for (let i = 0; i < 5; i++) {
      const x = (GW + 18) / 2 + (i - 2) * 6;
      g.fillTriangle(x - 2.5, 12, x + 2.5, 12, x, 2);
    }
  });
}

/* ----------------------------------------------------------------------- *
 * PICKUPS                                                                 *
 * ----------------------------------------------------------------------- */
function buildPickups(scene: Phaser.Scene) {
  // spinning coin — 4 frames (full → thin → full)
  const widths = [16, 11, 4, 11];
  widths.forEach((cw, i) => {
    tex(scene, `coin_${i}`, 20, 22, (g) => {
      const cx = 10;
      const cy = 11;
      g.fillStyle(PAL.shadow, 0.2);
      g.fillEllipse(cx, 20, 12, 4);
      g.fillStyle(PAL.goldDark, 1);
      g.fillEllipse(cx, cy + 1, cw, 16);
      g.fillStyle(PAL.gold, 1);
      g.fillEllipse(cx, cy, cw - 1.5, 14.5);
      if (cw > 7) {
        g.fillStyle(PAL.goldHi, 0.8);
        g.fillEllipse(cx - cw * 0.18, cy - 2, cw * 0.35, 5);
        g.fillStyle(PAL.goldDark, 0.6);
        g.lineStyle(1, PAL.goldDark, 0.8);
        g.strokeEllipse(cx, cy, cw - 4, 10);
        // a rune
        g.fillStyle(PAL.goldDark, 0.9);
        g.fillRect(cx - 1, cy - 4, 2, 8);
      } else {
        g.fillStyle(PAL.goldHi, 0.9);
        g.fillEllipse(cx, cy, cw, 14);
      }
    });
  });

  // coffee cup pickup (was: heart). The classic Greek takeaway cup — white body,
  // brown lid, red "ΚΑΦΕΣ" stripe, steam wisps above.
  tex(scene, "heart_pickup", 24, 26, (g) => {
    g.fillStyle(PAL.shadow, 0.22);
    g.fillEllipse(12, 24, 14, 4);
    // steam wisps
    g.fillStyle(PAL.ink, 0.45);
    g.fillEllipse(9, 4, 2, 5);
    g.fillEllipse(12, 2, 2, 6);
    g.fillEllipse(15, 4, 2, 5);
    // cup body (tapered: narrower at the bottom)
    g.fillStyle(PAL.heartDark, 1);
    g.fillTriangle(5, 22, 19, 22, 8, 9);
    g.fillTriangle(5, 22, 19, 22, 16, 9);
    g.fillRect(7, 9, 10, 13);
    g.fillStyle(PAL.ink, 1);
    g.fillRect(7, 9, 10, 13);
    g.fillTriangle(6, 22, 18, 22, 8, 9);
    g.fillTriangle(6, 22, 18, 22, 16, 9);
    // red brand stripe
    g.fillStyle(PAL.gloomGlow, 1);
    g.fillRect(6, 14, 12, 4);
    g.fillStyle(PAL.ink, 0.9);
    // little Greek-coffee text glyphs
    for (let i = 0; i < 4; i++) g.fillRect(7 + i * 3, 15, 2, 2);
    // brown lid + sip hole
    g.fillStyle(PAL.heart, 1);
    g.fillRoundedRect(5, 7, 14, 4, 2);
    g.fillStyle(PAL.heartDark, 1);
    g.fillRect(10, 6, 4, 3);
  });

  // potion pickup
  tex(scene, "potion", 20, 24, (g) => {
    g.fillStyle(PAL.shadow, 0.2);
    g.fillEllipse(10, 22, 12, 4);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(7, 2, 6, 5);
    g.fillStyle(0x2a3340, 1);
    g.fillRect(6, 6, 8, 3);
    g.fillStyle(0x9fc7d8, 0.5);
    g.fillRoundedRect(4, 8, 12, 13, 4);
    g.fillStyle(PAL.potion, 1);
    g.fillRoundedRect(5, 12, 10, 8, 3);
    g.fillStyle(PAL.potionHi, 0.9);
    g.fillCircle(8, 15, 1.6);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(6, 10, 2, 8);
  });
}

/* ----------------------------------------------------------------------- *
 * FX / PARTICLES / LIGHTING                                                *
 * ----------------------------------------------------------------------- */
function buildFx(scene: Phaser.Scene) {
  // 1x1 white — handy for flashes & rects
  tex(scene, "px", 1, 1, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
  });

  // soft radial glow (white core → transparent) — used as the LIGHT MASK
  canvasTex(scene, "glow_mask", 256, 256, (ctx, w, h) => {
    const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.45, "rgba(255,255,255,0.92)");
    grd.addColorStop(0.72, "rgba(255,255,255,0.4)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  });

  // warm bloom (ember-tinted radial) — additive overlay on lit areas
  canvasTex(scene, "glow_warm", 256, 256, (ctx, w, h) => {
    const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,209,138,0.85)");
    grd.addColorStop(0.35, "rgba(255,150,60,0.45)");
    grd.addColorStop(0.7, "rgba(200,80,24,0.14)");
    grd.addColorStop(1, "rgba(120,40,10,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  });
  // cool bloom for Gloom auras
  canvasTex(scene, "glow_violet", 256, 256, (ctx, w, h) => {
    const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(184,102,224,0.7)");
    grd.addColorStop(0.4, "rgba(124,70,173,0.32)");
    grd.addColorStop(1, "rgba(57,32,79,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  });

  // vignette — transparent centre, dusk at the edges; scrollFactor 0 over the world
  canvasTex(scene, "vignette", 1280, 720, (ctx, w, h) => {
    const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, h * 0.92);
    grd.addColorStop(0, "rgba(7,6,13,0)");
    grd.addColorStop(0.6, "rgba(7,6,13,0.18)");
    grd.addColorStop(1, "rgba(5,4,9,0.78)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    // subtle top scrim
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.25);
    top.addColorStop(0, "rgba(5,4,9,0.45)");
    top.addColorStop(1, "rgba(5,4,9,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * 0.25);
  });

  // tiny particles
  canvasTex(scene, "soft", 32, 32, (ctx, w, h) => {
    const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.5, "rgba(255,255,255,0.6)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  });
  tex(scene, "dot", 6, 6, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(3, 3, 3);
  });
  tex(scene, "spark", 14, 14, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(6, 0, 2, 14);
    g.fillRect(0, 6, 14, 2);
    g.fillCircle(7, 7, 2.4);
  });
  tex(scene, "leaf", 10, 10, (g) => {
    g.fillStyle(PAL.grassHi, 1);
    g.fillEllipse(5, 5, 8, 4);
  });
  // slash arc — a tapering crescent, white; tinted & rotated in code.
  // Drawn as a few concentric stroked arcs of decreasing width => a soft swoosh.
  tex(scene, "slash", 96, 72, (g) => {
    const cx = 18;
    const cy = 36;
    const arcs: [number, number, number, number][] = [
      // radius, lineWidth, halfSpanDeg, alpha
      [40, 12, 56, 1],
      [40, 4, 60, 0.5],
      [52, 6, 38, 0.85],
      [52, 2, 44, 0.4],
      [30, 5, 50, 0.6],
    ];
    for (const [rad, lw, span, a] of arcs) {
      g.lineStyle(lw, 0xffffff, a);
      g.beginPath();
      g.arc(cx, cy, rad, Phaser.Math.DegToRad(-span), Phaser.Math.DegToRad(span), false);
      g.strokePath();
    }
    // a bright tip where the blade leads
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx + Math.cos(Phaser.Math.DegToRad(-46)) * 46, cy + Math.sin(Phaser.Math.DegToRad(-46)) * 46, 4);
  });
  // a thin ring (telegraph / pickup pop)
  tex(scene, "ring", 64, 64, (g) => {
    g.lineStyle(4, 0xffffff, 1);
    g.strokeCircle(32, 32, 28);
  });
  // an upward-pointing chevron prompt
  tex(scene, "chevron", 18, 12, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(2, 11, 16, 11, 9, 1);
    g.fillStyle(0x000000, 1);
    g.fillTriangle(5, 11, 13, 11, 9, 5);
  });
}

/* ----------------------------------------------------------------------- *
 * UI CHROME (icons rendered as textures; panels are drawn live in UIScene) *
 * ----------------------------------------------------------------------- */
function buildUi(scene: Phaser.Scene) {
  // coffee-cup life icon. "Full" = steam + dark-coffee fill, "Empty" = greyed
  // outline only, "Half" = half coffee fill.
  const cupIcon = (g: GFX, fill: "full" | "half" | "empty") => {
    g.fillStyle(PAL.shadow, 0.3);
    g.fillEllipse(15, 28, 16, 4);
    if (fill === "full") {
      g.fillStyle(PAL.ink, 0.55);
      g.fillEllipse(10, 5, 2.4, 5);
      g.fillEllipse(15, 3, 2.6, 6);
      g.fillEllipse(20, 5, 2.4, 5);
    }
    // cup outline (always)
    const cupCol = fill === "empty" ? PAL.hpEmpty : PAL.ink;
    g.fillStyle(cupCol, fill === "empty" ? 0.55 : 1);
    g.fillTriangle(4, 26, 26, 26, 7, 11);
    g.fillTriangle(4, 26, 26, 26, 23, 11);
    g.fillRect(7, 11, 16, 15);
    // brand stripe (red) — visible when there's coffee
    if (fill !== "empty") {
      g.fillStyle(PAL.gloomGlow, 1);
      g.fillRect(7, 17, 16, 5);
      g.fillStyle(PAL.ink, 0.9);
      for (let i = 0; i < 5; i++) g.fillRect(8 + i * 3, 18, 2, 3);
    }
    // lid
    g.fillStyle(fill === "empty" ? shade(PAL.heart, -0.4) : PAL.heart, 1);
    g.fillRoundedRect(4, 8, 22, 5, 2);
    g.fillStyle(fill === "empty" ? shade(PAL.heartDark, -0.2) : PAL.heartDark, 1);
    g.fillRect(12, 6, 6, 4);
    // half: paint a horizontal "fill line" mid-cup, darken bottom half
    if (fill === "half") {
      g.fillStyle(PAL.heartDark, 0.55);
      g.fillTriangle(8, 26, 22, 26, 12, 18);
      g.fillTriangle(8, 26, 22, 26, 18, 18);
      g.fillRect(11, 18, 8, 8);
      g.lineStyle(1, PAL.heartHi, 0.9);
      g.lineBetween(8, 18, 22, 18);
    }
    // empty: hollow + a fade across the body
    if (fill === "empty") {
      g.fillStyle(PAL.panel, 0.6);
      g.fillTriangle(7, 25, 23, 25, 10, 12);
      g.fillTriangle(7, 25, 23, 25, 20, 12);
      g.fillRect(9, 12, 12, 13);
    }
  };
  tex(scene, "ui_heart_full", 30, 30, (g) => cupIcon(g, "full"));
  tex(scene, "ui_heart_empty", 30, 30, (g) => cupIcon(g, "empty"));
  tex(scene, "ui_heart_half", 30, 30, (g) => cupIcon(g, "half"));

  // coin HUD icon (front-facing, with shine)
  tex(scene, "ui_coin", 26, 26, (g) => {
    g.fillStyle(PAL.shadow, 0.25);
    g.fillCircle(13, 22, 9);
    g.fillStyle(PAL.goldDark, 1);
    g.fillCircle(13, 13, 11);
    g.fillStyle(PAL.gold, 1);
    g.fillCircle(13, 12, 9.5);
    g.lineStyle(1.6, PAL.goldDark, 0.8);
    g.strokeCircle(13, 12, 6.5);
    g.fillStyle(PAL.goldDark, 0.9);
    g.fillRect(12, 8, 2, 8);
    g.fillStyle(PAL.goldHi, 0.95);
    g.fillEllipse(9.5, 8.5, 5, 7);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(8, 7, 1.4);
  });

  // a small sword icon (kill-count / quest marker)
  tex(scene, "ui_blade", 24, 26, (g) => {
    g.fillStyle(PAL.shadow, 0.25);
    g.fillEllipse(12, 23, 14, 4);
    g.fillStyle(0xc9d2dc, 1);
    g.fillTriangle(12, 1, 16, 16, 8, 16);
    g.fillStyle(0xeef3f8, 1);
    g.fillTriangle(12, 2, 12, 16, 9, 16);
    g.fillStyle(PAL.woodDark, 1);
    g.fillRect(7, 16, 10, 3);
    g.fillRect(10.5, 19, 3, 6);
    g.fillStyle(PAL.gold, 1);
    g.fillCircle(12, 25, 2);
  });

  // gloom sigil for the quest banner
  tex(scene, "ui_sigil", 28, 28, (g) => {
    g.lineStyle(2.5, PAL.gloomGlow, 1);
    g.strokeCircle(14, 14, 11);
    g.lineStyle(2, PAL.gloomHi, 1);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      g.lineBetween(14, 14, 14 + Math.cos(a) * 10, 14 + Math.sin(a) * 10);
    }
    g.fillStyle(PAL.gloomEye, 1);
    g.fillCircle(14, 14, 3);
  });

  // a faint paper/parchment swatch used as the dialog portrait backing
  tex(scene, "ui_portrait_bg", 64, 64, (g) => {
    g.fillStyle(0x241b2e, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x2e2338, 1);
    g.fillRect(2, 2, 60, 60);
    g.lineStyle(2, PAL.panelEdge, 1);
    g.strokeRect(2, 2, 60, 60);
  });

  // soft drop shadow blob (reused under floating UI bits if needed)
  canvasTex(scene, "ui_softshadow", 64, 32, (ctx, w, h) => {
    const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(0,0,0,0.5)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  });
}

/* ----------------------------------------------------------------------- *
 * public entry                                                            *
 * ----------------------------------------------------------------------- */
export function buildTextures(scene: Phaser.Scene) {
  buildGround(scene);
  buildProps(scene);
  buildActors(scene);
  buildPickups(scene);
  buildFx(scene);
  buildUi(scene);
}

/** Build a data-URL crosshair cursor (called once from Boot, applied via CSS). */
export function buildCursor(): string {
  const cv = document.createElement("canvas");
  cv.width = 28;
  cv.height = 28;
  const ctx = cv.getContext("2d")!;
  ctx.translate(14, 14);
  // soft ember halo
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 13);
  grd.addColorStop(0, "rgba(255,180,90,0.55)");
  grd.addColorStop(1, "rgba(255,140,40,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  // ring
  ctx.strokeStyle = "rgba(255,230,180,0.95)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.stroke();
  // ticks
  ctx.strokeStyle = "rgba(255,230,180,0.95)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
    ctx.stroke();
  }
  // centre dot
  ctx.fillStyle = "rgba(255,240,210,1)";
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();
  return `url(${cv.toDataURL("image/png")}) 14 14, crosshair`;
}
