/**
 * Ο κόσμος — Η Γειτονιά στα δυτικά, Τα Διόδια, η Λεωφ. Κηφισού πιο ανατολικά,
 * το Ύψος Μεταμόρφωσης στο τέλος. Το terrain υπολογίζεται per-tile και bake-άρεται
 * σε μία RenderTexture· props, colliders, lights, NPCs, εχθροί και pickups μένουν
 * εδώ ως data και ανεβαίνουν στη σκηνή από το GameScene.
 */
import Phaser from "phaser";
import { TILE } from "./textures";
import { PAL } from "./palette";
import { DIALOGUES } from "./dialogues";
import type {
  AreaDef,
  GloomSpawn,
  LightDef,
  NpcSpawn,
  PickupSpawn,
  World,
} from "./types";

export const MAP_W = 56;
export const MAP_H = 40;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

const T = (n: number) => n * TILE; // tiles → pixels
const tcx = (tx: number) => tx * TILE + TILE / 2; // tile centre x
const tcy = (ty: number) => ty * TILE + TILE / 2;

/* ----------------------------------------------------------------------- *
 * TERRAIN — pure function of tile coords                                  *
 * ----------------------------------------------------------------------- */
type Ground = "grass" | "path" | "sand" | "stone" | "water";

// path network (tile-space polylines); rasterised by distance test
const PATHS: Array<Array<[number, number]>> = [
  [
    [-1, 24],
    [8, 24],
    [13, 23],
    [18, 22],
    [22, 22],
  ],
  [
    [22, 22],
    [24, 20],
    [28, 20],
    [30, 19], // the Wood Gate gap
    [34, 21],
    [40, 18],
    [46, 22],
    [50, 22], // toward the shrine
  ],
  [
    [22, 23],
    [22, 29],
    [17, 33],
    [13, 33],
  ],
];

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-6;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Phaser.Math.Clamp(t, 0, 1);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

const POND = { cx: 7, cy: 6, rx: 4.6, ry: 3.6 };
const PLAZA = { cx: 22, cy: 22.5, rx: 5.6, ry: 4.4 };
const WELL_STONE = { x0: 20, y0: 17, x1: 24, y1: 21 };
const SHRINE_STONE = { x0: 47, y0: 18, x1: 54, y1: 27 };

function groundAt(tx: number, ty: number): Ground {
  // water pond (slightly irregular ellipse)
  const pe = ((tx - POND.cx) / POND.rx) ** 2 + ((ty - POND.cy) / POND.ry) ** 2;
  if (pe < 1) return "water";
  // stone plazas
  if (tx >= WELL_STONE.x0 && tx <= WELL_STONE.x1 && ty >= WELL_STONE.y0 && ty <= WELL_STONE.y1)
    return "stone";
  if (
    tx >= SHRINE_STONE.x0 &&
    tx <= SHRINE_STONE.x1 &&
    ty >= SHRINE_STONE.y0 &&
    ty <= SHRINE_STONE.y1
  ) {
    // crumbled edges
    const edge = Math.min(tx - SHRINE_STONE.x0, SHRINE_STONE.x1 - tx, ty - SHRINE_STONE.y0, SHRINE_STONE.y1 - ty);
    if (edge === 0 && ((tx * 7 + ty * 13) % 3 === 0)) return "grass";
    return "stone";
  }
  // village sand plaza (ellipse), but not where stone already won
  const se = ((tx - PLAZA.cx) / PLAZA.rx) ** 2 + ((ty - PLAZA.cy) / PLAZA.ry) ** 2;
  if (se < 1) return "sand";
  // worn path
  for (const line of PATHS) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i];
      const [bx, by] = line[i + 1];
      if (distToSeg(tx + 0.5, ty + 0.5, ax + 0.5, ay + 0.5, bx + 0.5, by + 0.5) < 0.95) return "path";
    }
  }
  return "grass";
}

// stable per-tile hash → grass variant / dressing decisions
function hash2(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ----------------------------------------------------------------------- *
 * PROPS                                                                   *
 * ----------------------------------------------------------------------- */
type PropDef = {
  key: string;
  x: number; // px, anchor = bottom-centre
  y: number;
  /** axis-aligned collider box [w, h] in px around the base; omit = not solid */
  solid?: [number, number];
  /** vertical offset of the collider box centre from the anchor (px, negative = up) */
  solidUp?: number;
  /** companion canopy sprite drawn above actors (broadleaf trees) */
  canopy?: { key: string; up: number };
  /** wind sway tween */
  sway?: number;
  /** depth tweak */
  depthBias?: number;
  /** flat on the ground (flowers/tufts) — drawn beneath everything */
  flat?: boolean;
  scale?: number;
  flipX?: boolean;
  /** stamp into the static terrain image instead of spawning a live sprite */
  baked?: boolean;
};

// helper builders ---------------------------------------------------------
function tree(x: number, y: number, big = false, baked = false): PropDef {
  return {
    key: "tree_trunk",
    x,
    y,
    solid: baked ? undefined : [18, 12],
    solidUp: -4,
    canopy: { key: big ? "tree_canopy_b" : "tree_canopy", up: 30 },
    sway: baked ? 0 : 1.2,
    baked,
  };
}
function pine(x: number, y: number, baked = false): PropDef {
  return { key: "pine", x, y, solid: baked ? undefined : [20, 12], solidUp: -4, sway: baked ? 0 : 0.8, baked };
}
function flat(key: string, x: number, y: number, scale = 1): PropDef {
  return { key, x, y, flat: true, scale };
}

function buildProps(): PropDef[] {
  const props: PropDef[] = [];

  // --- world border tree-line (thick, baked into terrain; walls handle collision)
  for (let tx = 0; tx < MAP_W; tx++) {
    for (let d = 0; d < 2; d++) {
      if (!(tx > 3 && tx < 12 && d === 1)) // leave a gap above the pond
        props.push(tree(tcx(tx) + (hash2(tx, d) - 0.5) * 22, tcy(d) + 22 + hash2(tx, d + 9) * 10, hash2(tx, d) > 0.7, true));
      props.push(pine(tcx(tx) + (hash2(tx, d + 3) - 0.5) * 22, tcy(MAP_H - 1 - d) + 24, true));
    }
  }
  for (let ty = 2; ty < MAP_H - 2; ty++) {
    for (let d = 0; d < 2; d++) {
      props.push(tree(tcx(d) + 14 + hash2(ty, d) * 10, tcy(ty) + 22 + hash2(ty, d + 1) * 8, hash2(ty, d + 5) > 0.7, true));
      props.push(pine(tcx(MAP_W - 1 - d) - 14 - hash2(ty, d + 7) * 10, tcy(ty) + 22, true));
    }
  }

  // --- the dividing wood between village & Gloomwood (x ~ 29..31), gap at y19-20
  for (let ty = 2; ty < MAP_H - 2; ty++) {
    if (ty >= 18 && ty <= 21) continue; // the Wood Gate
    props.push(tree(tcx(29) + (hash2(ty, 1) - 0.5) * 20, tcy(ty) + 10, hash2(ty, 2) > 0.6));
    props.push(pine(tcx(31) + (hash2(ty, 3) - 0.5) * 20, tcy(ty) + 12));
  }
  // gate dressing
  props.push({ key: "lamp", x: tcx(29) - 14, y: tcy(18) + 6, solid: [10, 8], solidUp: -4 });
  props.push({ key: "lamp", x: tcx(31) + 14, y: tcy(21) + 6, solid: [10, 8], solidUp: -4 });
  props.push({ key: "sign", x: tcx(29) + 4, y: tcy(20) + 28, solid: [10, 8], solidUp: -3 });

  // --- Gloomwood: clusters of dark trees + clearings + rocks -------------
  const woodClusters: Array<[number, number, number]> = [
    [35, 8, 9],
    [38, 30, 10],
    [44, 12, 8],
    [40, 24, 7],
    [49, 33, 8],
    [34, 16, 6],
    [44, 6, 7],
    [50, 8, 6],
  ];
  for (const [cx, cy, n] of woodClusters) {
    for (let i = 0; i < n; i++) {
      const a = hash2(cx + i, cy) * Math.PI * 2;
      const r = (0.4 + hash2(cx, cy + i) * 1.8) * TILE;
      const px = tcx(cx) + Math.cos(a) * r;
      const py = tcy(cy) + Math.sin(a) * r * 0.8;
      if (px < T(32) || px > WORLD_W - T(2) || py < T(2) || py > WORLD_H - T(2)) continue;
      // keep the path & shrine plaza clearish
      if (
        px > T(SHRINE_STONE.x0 - 0.5) * 1 &&
        px < T(SHRINE_STONE.x1 + 1.5) &&
        py > T(SHRINE_STONE.y0 - 0.5) &&
        py < T(SHRINE_STONE.y1 + 1.5)
      )
        continue;
      props.push(hash2(i, cx) > 0.55 ? tree(px, py, hash2(px | 0, py | 0) > 0.7) : pine(px, py));
    }
  }
  // scattered rocks & bushes in the wood
  const rocks: Array<[string, number, number]> = [
    ["rock_big", 33, 24],
    ["rock", 37, 14],
    ["rock_big", 45, 30],
    ["rock", 41, 8],
    ["rock", 48, 18],
    ["rock_big", 39, 19],
    ["rock", 52, 14],
  ];
  for (const [key, tx, ty] of rocks) props.push({ key, x: tcx(tx), y: tcy(ty), solid: [key === "rock_big" ? 40 : 26, 12], solidUp: -2 });
  for (const [tx, ty] of [
    [34, 22],
    [42, 16],
    [47, 26],
    [36, 28],
    [50, 30],
  ] as const)
    props.push({ key: "bush", x: tcx(tx), y: tcy(ty), solid: [22, 8], solidUp: -2, sway: 1.6 });

  // --- the Sunken Shrine: broken pillars (rocks) + a violet brazier ------
  for (const [tx, ty] of [
    [48, 19],
    [53, 19],
    [48, 26],
    [53, 26],
    [50, 17],
  ] as const)
    props.push({ key: "rock_big", x: tcx(tx), y: tcy(ty), solid: [40, 14], solidUp: -2 });
  // shrine fire (will glow violet — handled via lights)
  props.push({ key: "fire0", x: tcx(50.5), y: tcy(22) + 6 });

  // --- LUMIN VILLAGE ----------------------------------------------------
  // houses: anchor = bottom-centre; solids inferred from texture dims below.
  // The town is six buildings, each with its own visual identity (built in
  // textures.ts) so the player can read the layout from a distance.
  type HouseDef = { key: string; tw: number; th: number; bx: number; by: number };
  const houses: HouseDef[] = [
    { key: "house_alex",     tw: 5, th: 4, bx: tcx(13), by: tcy(19) }, // (1) your house — west of plaza
    { key: "house_despoina", tw: 5, th: 4, bx: tcx(7),  by: tcy(18) }, // (2) Mrs. Despoina's — far west
    { key: "house_cafe",     tw: 4, th: 4, bx: tcx(22), by: tcy(13) }, // (3) the Café — north of plaza
    { key: "house_clinic",   tw: 4, th: 4, bx: tcx(29), by: tcy(19) }, // (4) the Clinic — east of plaza
    { key: "house_costas",   tw: 4, th: 4, bx: tcx(13), by: tcy(31) }, // (5) Costas & Anna's — south
    { key: "house_c",        tw: 6, th: 5, bx: tcx(24), by: tcy(33) }, // (6) a dim-lit house, southeast (decoration)
  ];
  for (const h of houses) {
    const wallH = h.th * TILE * 0.62;
    props.push({
      key: h.key,
      x: h.bx,
      y: h.by,
      solid: [h.tw * TILE * 0.84, wallH * 0.92],
      solidUp: -(14 + wallH * 0.5),
    });
  }
  // the well + its little roof (solid centre)
  props.push({ key: "well", x: tcx(22), y: tcy(19) + 8, solid: [40, 22], solidUp: -10 });
  // campfire in the square
  props.push({ key: "fire0", x: tcx(25), y: tcy(24) + 4 });

  // --- per-building decorative props ------------------------------------
  // Café outdoor seating — two bistro tables flanking the door, with chairs
  // around them. Pure dressing, no quest impact, but it sells the place.
  props.push({ key: "bush",   x: tcx(20.4), y: tcy(15) + 14, solid: [16, 6], solidUp: -2, sway: 1.4 });
  props.push({ key: "bush",   x: tcx(23.6), y: tcy(15) + 14, solid: [16, 6], solidUp: -2, sway: 1.4 });
  // Costas's house — a tipped paint can + a sawhorse outside, the kind of
  // mess Costas keeps describing in his "three weeks" speech.
  props.push({ key: "rock",   x: tcx(11), y: tcy(31) + 24, solid: [20, 10], solidUp: -2 });
  props.push({ key: "fence_h", x: tcx(15), y: tcy(32) + 26, solid: [TILE, 6], solidUp: -2 });
  // Despoina's — a little stone bench by the door and another tree, so the
  // far-west corner of the town has its own quiet weight.
  props.push(tree(tcx(5), tcy(17), true));
  props.push({ key: "rock",   x: tcx(8.5), y: tcy(19) + 20, solid: [22, 8], solidUp: -2 });
  // Clinic — a small bench for waiting patients.
  props.push({ key: "fence_h", x: tcx(28), y: tcy(20) + 24, solid: [TILE, 6], solidUp: -2 });
  props.push({ key: "fence_h", x: tcx(30), y: tcy(20) + 24, solid: [TILE, 6], solidUp: -2 });
  // Your home — a little flower patch by the door so the place reads as
  // lived-in rather than vacant.
  for (const [tx, ty] of [
    [12.4, 20.6],
    [13.6, 20.6],
    [13.0, 20.9],
  ] as const)
    props.push(flat("flower", tcx(tx), tcy(ty)));
  // lamp posts along the village path
  for (const [tx, ty] of [
    [8, 23],
    [14, 22],
    [19, 21],
    [22, 25],
    [26, 19],
  ] as const)
    props.push({ key: "lamp", x: tcx(tx), y: tcy(ty) + 6, solid: [10, 8], solidUp: -4 });
  // a fenced kitchen garden south of plaza
  for (let i = 0; i < 4; i++) props.push({ key: "fence_h", x: tcx(16 + i), y: tcy(28) + 8, solid: [TILE, 8], solidUp: -2 });
  for (let i = 0; i < 3; i++) props.push({ key: "fence_v", x: tcx(20) + 6, y: tcy(28.5 + i), solid: [8, TILE], solidUp: -2 });
  for (const [tx, ty] of [
    [16.5, 27],
    [17.5, 27.6],
    [18.7, 27.2],
    [19.2, 27.8],
  ] as const)
    props.push(flat("mushroom", tcx(tx), tcy(ty)));
  // a couple of trees & bushes dotted around the village (not on the plaza)
  props.push(tree(tcx(9), tcy(18), true));
  props.push(tree(tcx(28), tcy(14)));
  props.push({ key: "bush", x: tcx(11), y: tcy(20), solid: [20, 8], solidUp: -2, sway: 1.6 });
  props.push({ key: "bush", x: tcx(26), y: tcy(26), solid: [20, 8], solidUp: -2, sway: 1.6 });
  props.push({ key: "sign", x: tcx(18), y: tcy(23) + 28, solid: [10, 8], solidUp: -3 });
  props.push({ key: "sign", x: tcx(2.6), y: tcy(24) + 28, solid: [10, 8], solidUp: -3, flipX: true });

  // a few extra lamp posts so the village streets glow at dusk -----------
  for (const [tx, ty] of [
    [10, 21],
    [25, 21],
    [16, 30],
  ] as const)
    props.push({ key: "lamp", x: tcx(tx), y: tcy(ty) + 6, solid: [10, 8], solidUp: -4 });

  // --- ground dressing: flowers / tufts (flat, no collision) ------------
  for (let i = 0; i < 130; i++) {
    const tx = 2 + Math.floor(hash2(i, 11) * (MAP_W - 4));
    const ty = 2 + Math.floor(hash2(i, 23) * (MAP_H - 4));
    if (groundAt(tx, ty) !== "grass") continue;
    const east = tx > 31;
    const r = hash2(tx, ty + 1);
    const key = r < 0.45 ? "tuft" : east ? (r < 0.75 ? "flower_v" : "tuft") : r < 0.8 ? "flower" : "tuft";
    props.push(flat(key, tcx(tx) + (hash2(tx, ty) - 0.5) * 30, tcy(ty) + (hash2(ty, tx) - 0.5) * 24, 0.85 + hash2(i, 7) * 0.4));
  }

  return props;
}

/* ----------------------------------------------------------------------- *
 * LIGHTS / AREAS / SPAWNS                                                  *
 * ----------------------------------------------------------------------- */
const LIGHTS: LightDef[] = [
  { x: tcx(25), y: tcy(24) - 6, radius: 270, warm: true, flicker: 0.16, campfire: true }, // village campfire
  { x: tcx(8), y: tcy(23) - 16, radius: 150, warm: true, flicker: 0.12 },
  { x: tcx(14), y: tcy(22) - 16, radius: 150, warm: true, flicker: 0.12 },
  { x: tcx(19), y: tcy(21) - 16, radius: 150, warm: true, flicker: 0.12 },
  { x: tcx(22), y: tcy(25) - 16, radius: 150, warm: true, flicker: 0.12 },
  { x: tcx(26), y: tcy(19) - 16, radius: 150, warm: true, flicker: 0.12 },
  { x: tcx(29) - 14, y: tcy(18) - 10, radius: 160, warm: true, flicker: 0.13 }, // gate lamps
  { x: tcx(31) + 14, y: tcy(21) - 10, radius: 160, warm: true, flicker: 0.13 },
  // house windows — warm pools
  { x: tcx(23), y: tcy(12) - 70, radius: 140, warm: true, flicker: 0.06 },
  { x: tcx(13), y: tcy(17) - 60, radius: 130, warm: true, flicker: 0.06 },
  { x: tcx(13), y: tcy(31) - 60, radius: 120, warm: true, flicker: 0.06 },
  // the shrine brazier — cold violet
  { x: tcx(50.5), y: tcy(22) - 8, radius: 240, warm: false, flicker: 0.2, campfire: true },
  // a few wisp glimmers deep in the wood
  { x: tcx(38), y: tcy(30), radius: 120, warm: false, flicker: 0.25 },
  { x: tcx(44), y: tcy(10), radius: 110, warm: false, flicker: 0.25 },
  { x: tcx(35), y: tcy(16), radius: 100, warm: false, flicker: 0.25 },
];

// checked in order; first rect that contains the player wins
const AREAS: AreaDef[] = [
  { name: "The Little Park", rect: new Phaser.Geom.Rectangle(T(46), T(16), T(10), T(13)), darkness: 0.5, gloomwood: true },
  { name: "The Edge Road", rect: new Phaser.Geom.Rectangle(T(28), T(14), T(6), T(12)), darkness: 0.42 },
  { name: "Diona Community", rect: new Phaser.Geom.Rectangle(0, 0, T(28), WORLD_H), darkness: 0.36 },
  { name: "Beyond the Community", rect: new Phaser.Geom.Rectangle(T(28), 0, T(28), WORLD_H), darkness: 0.5, gloomwood: true },
];

// Κανείς δεν περπατάει στην Κοινότητα τη μέρα. Οι Καθαριστές εμφανίζονται μόνο
// στις 11:55. Για την Ημέρα 1 (MVP) ο κόσμος είναι σιωπηλός.
const GLOOM: GloomSpawn[] = [];

// Δεν υπάρχουν "pickups" με την παλιά έννοια. Αντί γι' αυτό υπάρχουν σημειώσεις
// που ο παίκτης βρίσκει στον κόσμο — αλλά αυτό το χειρίζεται το GameScene/Npc.
const PICKUPS: PickupSpawn[] = [];

/* ----------------------------------------------------------------------- *
 * NPCS + DIALOG (content from src/dialogues.ts)                            *
 * ----------------------------------------------------------------------- */

const NPCS: NpcSpawn[] = [
  // ---- Helena — your partner. In the front yard. ---------------------
  {
    id: "eleni",
    key: "npc_merchant",
    altKey: "npc_merchant_b",
    name: "Helena",
    x: tcx(21),
    y: tcy(20.5),
    roam: 0,
    dialog: DIALOGUES.eleni,
  },
  {
    id: "kostas",
    key: "npc_smith",
    altKey: "npc_smith_b",
    name: "Costas",
    x: tcx(15),
    y: tcy(29.5),
    roam: 0,
    dialog: DIALOGUES.kostas,
  },
  // Mrs. Despoina lives INSIDE — meet her by stepping into her house.
  // The Custodian is no longer in the outdoor world — you meet him below.
  {
    id: "mailman",
    key: "npc_mailman",
    altKey: "npc_mailman_b",
    name: "Mailman",
    x: tcx(18),
    y: tcy(23.5),
    roam: 0,
    dialog: DIALOGUES.mailman,
  },
  {
    id: "kid",
    key: "npc_kid",
    altKey: "npc_kid_b",
    name: "Eli",
    x: tcx(26),
    y: tcy(25),
    roam: 0,
    dialog: DIALOGUES.kid,
  },
];

/* ----------------------------------------------------------------------- *
 * BUILD                                                                   *
 * ----------------------------------------------------------------------- */
const GROUND_TEX: Record<Ground, (tx: number, ty: number) => string> = {
  grass: (tx, ty) => `grass${Math.floor(hash2(tx, ty) * 3)}`,
  path: () => "path",
  sand: () => "sand",
  stone: () => "stonefloor",
  water: () => "grass1", // unused — water tiles are real animated sprites
};

export function buildWorld(scene: Phaser.Scene): World {
  const props = buildProps();
  const baked = props.filter((p) => p.baked);
  const live = props.filter((p) => !p.baked).sort((a, b) => a.y - b.y);

  // ---- bake terrain (+ border tree-line) into one render texture -------
  const rt = scene.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0, 0).setDepth(-1000);
  rt.fill(PAL.night, 1);
  const waterTiles: Phaser.GameObjects.Sprite[] = [];
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const g = groundAt(tx, ty);
      if (g === "water") {
        const s = scene.add.sprite(tcx(tx), tcy(ty), "water0").setDepth(-900).play("wateranim");
        s.anims.setProgress(hash2(tx, ty));
        waterTiles.push(s);
        rt.draw("grass0", tx * TILE, ty * TILE);
        continue;
      }
      if (g === "path") {
        rt.draw("grass1", tx * TILE, ty * TILE);
        rt.draw("path", tx * TILE + (hash2(tx, ty) - 0.5) * 3, ty * TILE + (hash2(ty, tx) - 0.5) * 3);
        continue;
      }
      rt.draw(GROUND_TEX[g](tx, ty), tx * TILE, ty * TILE);
    }
  }
  // stamp baked props (border trees: trunk first, then canopy on top)
  const stamp = (key: string, anchorX: number, anchorY: number, oy: number) => {
    const tmp = scene.add.image(anchorX, anchorY, key).setOrigin(0.5, oy);
    rt.draw(tmp);
    tmp.destroy();
  };
  for (const d of baked.sort((a, b) => a.y - b.y)) {
    stamp(d.key, d.x, d.y, 1);
    if (d.canopy) stamp(d.canopy.key, d.x, d.y - d.canopy.up, 0.78);
  }
  const ground = rt; // keep the render texture as the static terrain layer

  // ---- live props ------------------------------------------------------
  const solids = scene.physics.add.staticGroup();
  const canopies: Phaser.GameObjects.Image[] = [];
  const swayers: Phaser.GameObjects.GameObject[] = [];

  const addSolid = (cx: number, cy: number, w: number, h: number) => {
    const b = solids.create(cx, cy, "px") as Phaser.Physics.Arcade.Sprite;
    b.setVisible(false);
    b.setDisplaySize(w, h);
    b.refreshBody();
  };

  // bulletproof world border (sits just inside the baked tree-line)
  const m = 2 * TILE;
  const wallT = 2 * TILE;
  addSolid(WORLD_W / 2, m - wallT / 2, WORLD_W, wallT); // top
  addSolid(WORLD_W / 2, WORLD_H - m + wallT / 2, WORLD_W, wallT); // bottom
  addSolid(m - wallT / 2, WORLD_H / 2, wallT, WORLD_H); // left
  addSolid(WORLD_W - m + wallT / 2, WORLD_H / 2, wallT, WORLD_H); // right

  for (const d of live) {
    if (d.flat) {
      scene.add
        .image(d.x, d.y, d.key)
        .setOrigin(0.5, 1)
        .setDepth(-800 + d.y * 0.0001)
        .setScale(d.scale ?? 1)
        .setAlpha(0.95);
      continue;
    }
    const animated = d.key === "fire0";
    const img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite = animated
      ? scene.add.sprite(d.x, d.y, "fire0")
      : scene.add.image(d.x, d.y, d.key);
    img.setOrigin(0.5, 1);
    if (animated) (img as Phaser.GameObjects.Sprite).play("fireflicker");
    if (d.flipX) img.setFlipX(true);
    if (d.scale) img.setScale(d.scale);
    img.setDepth((d.depthBias ?? 0) + d.y);
    if (d.sway) {
      scene.tweens.add({
        targets: img,
        rotation: { from: -0.012 * d.sway, to: 0.012 * d.sway },
        duration: 1700 + Math.random() * 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.random() * 1200,
      });
      swayers.push(img);
    }
    if (d.canopy) {
      const cv = scene.add
        .image(d.x, d.y - d.canopy.up, d.canopy.key)
        .setOrigin(0.5, 0.78)
        .setDepth(d.y + 200);
      scene.tweens.add({
        targets: cv,
        rotation: { from: -0.02, to: 0.02 },
        x: { from: d.x - 2, to: d.x + 2 },
        duration: 2200 + Math.random() * 1100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.random() * 1500,
      });
      canopies.push(cv);
    }
    if (d.solid) {
      const [w, h] = d.solid;
      addSolid(d.x, d.y + (d.solidUp ?? 0), w, h);
    }
  }

  return {
    ground,
    waterTiles,
    solids,
    canopies,
    swayers,
    lights: LIGHTS.map((l) => ({ ...l })),
    areas: AREAS,
    playerStart: { x: tcx(6), y: tcy(24) },
    npcs: NPCS,
    gloom: GLOOM,
    pickups: PICKUPS,
  };
}
