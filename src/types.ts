/** Shared shapes used across the world data, the actors, and the scenes. */
import type Phaser from "phaser";

/** Visual-effect hooks the actors use; GameScene wires these to its emitters/camera. */
export interface Fx {
  dust(x: number, y: number, n?: number): void;
  slashArc(x: number, y: number, angleRad: number, tint: number): void;
  hitSpark(x: number, y: number, tint: number, n?: number): void;
  dashTrail(sprite: Phaser.GameObjects.Sprite): void;
  embers(x: number, y: number, n: number, tint?: number): void;
  ringPulse(x: number, y: number, color: number, toRadius: number, dur?: number): void;
  gloomBurst(x: number, y: number): void;
  pop(x: number, y: number, tint: number): void;
  shake(intensity: number, durationMs: number): void;
  hitStop(ms: number): void;
  floatText(x: number, y: number, text: string, color: number): void;
}

/** Mutable run-state. Owned by GameScene; passed to dialog/note callbacks. */
export interface GameCtx {
  // (kept for engine compatibility; not surfaced anywhere meaningful any more)
  hp: number;
  maxHp: number;
  gold: number;
  gloomKilled: number;
  questState: number;
  wardenDown: boolean;
  attackBonus: boolean;
  flags: Record<string, boolean>;

  /** Current in-game day (1, 2, 3, ...). Survives 11:55 events. */
  day: number;
  /** In-game time, in minutes from midnight. 7:00 AM = 420, 11:55 PM = 1435. */
  time: number;
  /** Auto-added notebook entries (note id → true when seen). */
  notes: Record<string, boolean>;
  /** Items the player carries (item id → true). */
  inventory: Record<string, boolean>;
  /** Snapshot of notes & inventory at the start of the current day. The
   *  cleaner phase restores these on a memory wipe (= "you got caught"). */
  dayStartNotes: Record<string, boolean>;
  dayStartInventory: Record<string, boolean>;

  // --- actions the dialog layer can take ---
  giveGold(n: number): void;
  takeGold(n: number): void;
  giveHeartContainer(): void;
  healFull(): void;
  heal(halfHearts: number): void;
  /** brief on-screen toast */
  toast(text: string, tint?: number): void;
  /** add an entry to the notebook + small UI toast */
  addNote(id: string): void;
  /** add an item to the pocket + small UI toast */
  addItem(id: string): void;
}

export interface DialogPage {
  name: string;
  portrait: string; // texture key
  tint?: number; // optional portrait tint
  text: string;
  /** runs exactly once, the moment this page becomes visible */
  effect?: (ctx: GameCtx) => void;
}

export interface NpcSpawn {
  id: string;
  key: string; // idle texture
  altKey?: string; // second frame for a gentle two-pose bob
  name: string;
  x: number;
  y: number;
  /** villager wanders within this radius of its home (px); 0 = stays put */
  roam?: number;
  /** pages to show right now, given current run-state */
  dialog: (ctx: GameCtx) => DialogPage[];
}

export interface GloomSpawn {
  x: number;
  y: number;
  warden?: boolean;
  /** wander radius around home (px) */
  range?: number;
}

export type PickupKind = "coin" | "heart" | "potion";
export interface PickupSpawn {
  kind: PickupKind;
  x: number;
  y: number;
  value?: number; // for coins
}

export interface LightDef {
  x: number;
  y: number;
  radius: number;
  warm: boolean; // warm ember vs cool violet
  /** 0..1 flicker amount */
  flicker: number;
  /** true => also throws a few drifting embers */
  campfire?: boolean;
}

export interface AreaDef {
  name: string;
  rect: Phaser.Geom.Rectangle;
  /** 0..1 darkness-overlay opacity while inside */
  darkness: number;
  gloomwood?: boolean;
}

export interface World {
  ground: Phaser.GameObjects.RenderTexture; // baked terrain + border tree-line
  waterTiles: Phaser.GameObjects.Sprite[];
  solids: Phaser.Physics.Arcade.StaticGroup;
  canopies: Phaser.GameObjects.Image[]; // drawn above actors
  swayers: Phaser.GameObjects.GameObject[]; // props that get a wind tween
  lights: LightDef[];
  areas: AreaDef[];
  playerStart: { x: number; y: number };
  npcs: NpcSpawn[];
  gloom: GloomSpawn[];
  pickups: PickupSpawn[];
}
