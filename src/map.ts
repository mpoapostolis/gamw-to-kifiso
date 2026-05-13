/**
 * Ο κόσμος — Η Γειτονιά στα δυτικά, Τα Διόδια, η Λεωφ. Κηφισού πιο ανατολικά,
 * το Ύψος Μεταμόρφωσης στο τέλος. Το terrain υπολογίζεται per-tile και bake-άρεται
 * σε μία RenderTexture· props, colliders, lights, NPCs, εχθροί και pickups μένουν
 * εδώ ως data και ανεβαίνουν στη σκηνή από το GameScene.
 */
import Phaser from "phaser";
import { TILE } from "./textures";
import { PAL } from "./palette";
import type {
  AreaDef,
  DialogPage,
  GameCtx,
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
  // houses: anchor = bottom-centre; solids inferred from texture dims below
  type HouseDef = { key: string; tw: number; th: number; bx: number; by: number };
  const houses: HouseDef[] = [
    { key: "house_c", tw: 6, th: 5, bx: tcx(23), by: tcy(12) }, // elder's hall, north of plaza
    { key: "house_a", tw: 5, th: 4, bx: tcx(13), by: tcy(17) }, // Bree's, west of plaza
    { key: "house_b", tw: 4, th: 4, bx: tcx(13), by: tcy(31) }, // Garrick's, south
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
 * NPCS + DIALOG                                                            *
 * ----------------------------------------------------------------------- */
const P = (name: string, portrait: string, text: string, tint?: number, effect?: (c: GameCtx) => void): DialogPage => ({
  name,
  portrait,
  text,
  tint,
  effect,
});

const NPCS: NpcSpawn[] = [
  // ---- Helena — your partner. At the house, at the centre. -----------
  {
    id: "eleni",
    key: "npc_merchant",
    altKey: "npc_merchant_b",
    name: "Helena",
    x: tcx(21),
    y: tcy(20.5),
    roam: 0,
    dialog: (c) => {
      // Day 1 — love without cracks
      if (c.day <= 1)
        return [
          P("Helena", "portrait_eleni", "Good morning, you. Did you sleep well? You were dreaming about me again. I left coffee for you in the kitchen."),
          P("Helena", "portrait_eleni", "I was thinking we could take a walk in the park this afternoon. The weather isn't saying anything. It'll be nice.", PAL.gloomGlow),
        ];
      // Day 2 — a small inconsistency
      if (c.day === 2)
        return [
          P("Helena", "portrait_eleni", "My love, thank you for yesterday. For the book. You gave it to me before we went to sleep.", undefined, (cc) => cc.addNote("eleniGift")),
          P("Helena", "portrait_eleni", "Here, it's by the door. Take it back if you want. It was lovely though.", undefined, (cc) => cc.addItem("helena_book")),
          P("Helena", "portrait_eleni", "Do you remember when you used to sing? No, it's alright. Tell me if you want coffee."),
        ];
      // Day 3 — it deepens
      if (c.day === 3)
        return [
          P("Helena", "portrait_eleni", "You're a little quiet today. You haven't said much. Are you okay?"),
          P("Helena", "portrait_eleni", "You know, sometimes I feel like I've known you for a lifetime. Other times like I met you yesterday. Isn't that strange.", PAL.gloomGlow),
        ];
      // Day 4+ — if you've woken up
      if (c.flags.awake)
        return [
          P("Helena", "portrait_eleni", "...I'm looking at you today and something is different. Nothing's happened to you, has it?"),
          P("Helena", "portrait_eleni", "Alex, always tell me the truth. Even if it's something I won't remember tomorrow.", PAL.heartHi),
        ];
      return [P("Helena", "portrait_eleni", "I love you. Always.")];
    },
  },

  // ---- Costas — the neighbour. Outside, on the road. -----------------
  {
    id: "kostas",
    key: "npc_smith",
    altKey: "npc_smith_b",
    name: "Costas",
    x: tcx(15),
    y: tcy(29.5),
    roam: 0,
    dialog: (c) => {
      // Day 1 — a simple hello
      if (c.day <= 1)
        return [
          P("Costas", "portrait_kostas", "Hey neighbour. Good start. How was your Monday?"),
          P("Costas", "portrait_kostas", "Me? Nothing — I've been painting my front door for three weeks. It's never finished. I don't know why."),
        ];
      // Day 2 — an uncertain beat
      if (c.day === 2)
        return [
          P("Costas", "portrait_kostas", "Oh hey — you. Alex? Yes, Alex. Sorry, yesterday you looked a little like the... never mind. Did you sleep well?"),
          P("Costas", "portrait_kostas", "Did you notice yesterday at 11:55 that the clock in the square stopped? No? I thought I saw it. But I can't remember clearly."),
        ];
      // Day 3 — a pause that freezes
      if (c.day === 3)
        return [
          P("Costas", "portrait_kostas", "So, I was telling you that the..."),
          P("Costas", "portrait_kostas", "...", undefined, (cc) => cc.addNote("kostasFreeze")),
          P("Costas", "portrait_kostas", "...what was I telling you? Oh yeah, about the door. I was telling you I'm done with the paint. Finally."),
        ];
      // Day 4+ — if you're awake, he tells you
      if (c.flags.awake && !c.flags.kostasReveal) {
        return [
          P("Costas", "portrait_kostas", "Alex. Look at me. Look at me in the eyes.", undefined, (cc) => (cc.flags.kostasReveal = true)),
          P("Costas", "portrait_kostas", "You know now. I can see it. How many days do you have? Six? Seven? I have twenty-two. Before me there were others. After me there will be others.", PAL.gloomGlow),
          P("Costas", "portrait_kostas", "You're the forty-seventh one who's woken up this week. Come by tonight at 11:50. I'll show you the hill.", undefined, (cc) => cc.addNote("kostasReveal")),
          P("Costas", "portrait_kostas", "Take this. I drew it last week and hid it under my mailbox. I'm only ever sure I drew it when I look at it. Keep it.", undefined, (cc) => cc.addItem("kostas_map")),
        ];
      }
      if (c.flags.kostasReveal)
        return [
          P("Costas", "portrait_kostas", "The hill. Beyond the little park. Go. You'll understand."),
        ];
      return [P("Costas", "portrait_kostas", "You alright? You look tired.")];
    },
  },

  // ---- Mrs. Despoina — the old woman who knows. At the corner. -------
  {
    id: "despoina",
    key: "npc_elder",
    altKey: "npc_elder_b",
    name: "Mrs. Despoina",
    x: tcx(11),
    y: tcy(18.5),
    roam: 0,
    dialog: (c) => {
      if (c.day === 1)
        return [
          P("Mrs. Despoina", "portrait_despoina", "Good morning, child. Come closer, let me see your face."),
          P("Mrs. Despoina", "portrait_despoina", "Nice face. Like my son's. Not exactly. Similar. Do you remember, child?", PAL.gloomGlow),
          P("Mrs. Despoina", "portrait_despoina", "It's okay if you don't. Slowly. Everyone does, slowly."),
        ];
      if (c.day === 2)
        return [
          P("Mrs. Despoina", "portrait_despoina", "You again, child. I told you something yesterday. You don't remember, do you."),
          P("Mrs. Despoina", "portrait_despoina", "I'll tell you again. At 11:55 the clock stops. Every day. Nobody sees it. Except me. And now you.", undefined, (cc) => cc.addNote("clockStop")),
        ];
      if (c.day >= 3 && !c.flags.despoinaSmile) {
        return [
          P("Mrs. Despoina", "portrait_despoina", "Did you light your candle, child?"),
          P("Mrs. Despoina", "portrait_despoina", "We all have a candle inside us. The ones of us who wake up — we wake up because someone forgot to blow it out. I've been awake sixty years. I don't grow old.", PAL.heartHi, (cc) => cc.addNote("despoinaSmile")),
          P("Mrs. Despoina", "portrait_despoina", "Take this. It looks small. It is not small. Keep it on you.", undefined, (cc) => cc.addItem("despoina_candle")),
          P("Mrs. Despoina", "portrait_despoina", "Listen. When it's eleven fifty-five, you get under your kitchen sink. Stay five minutes. You'll see. I love you, child."),
        ];
      }
      if (c.flags.awake)
        return [
          P("Mrs. Despoina", "portrait_despoina", "So you woke up. Good. Now you have two choices, child. Neither is wrong."),
          P("Mrs. Despoina", "portrait_despoina", "Either you put it all out and we learn again what it means to grow old. Or you go back to your sleep and everything is fine again.", PAL.gloomGlow),
        ];
      return [P("Mrs. Despoina", "portrait_despoina", "Good morning, child.")];
    },
  },

  // ---- The Custodian — at the facility (far east, act 5). ------------
  {
    id: "epistatis",
    key: "npc_child", // recolored as the white-robed Custodian
    altKey: "npc_child_b",
    name: "The Custodian",
    x: tcx(50.5),
    y: tcy(22),
    roam: 0,
    dialog: (c) => {
      if (!c.flags.kostasReveal)
        return [
          P("The Custodian", "portrait_epistatis", "You shouldn't be here yet. Go home. Helena is waiting for you."),
        ];
      return [
        P("The Custodian", "portrait_epistatis", "Welcome, Alex. You're not the first to do this. One hundred and twenty-four times. All of them you.", PAL.gloom),
        P("The Custodian", "portrait_epistatis", "You don't remember any pain. You don't remember anyone dead. You don't remember when your mother grew old. You don't remember ever losing her. That is happiness."),
        P("The Custodian", "portrait_epistatis", "Why do you want to break it, child?", PAL.heartHi),
        P(
          "The Custodian",
          "npc_child",
          "You have two choices. I'll let you pick. I won't stop you. — Light the lights, and everyone wakes up. They'll grow old. They'll hurt. They'll live. — Or take my hand, and you'll go back to sleep. Everything will be fine. Again.",
          undefined,
          (cc) => (cc.flags.endingAvailable = true),
        ),
      ];
    },
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
