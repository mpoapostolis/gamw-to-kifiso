/**
 * THE CLEANERS — scene manifest types.
 *
 * Each location in the game is described by a `SceneManifest` (see design
 * doc §10): which tiles, which NPCs, which fragments, which ambient sound,
 * which palette. The same location can have multiple variants (`day`,
 * `evening`, `night`) — they share geometry but differ in mood.
 *
 * For Phase 1 we only need the type definitions and a tiny in-memory
 * registry — manifests are still defined in TypeScript next to each scene.
 * Once the dialogue runner lands, we'll move them to JSON.
 */

export type ScenePalette = "day" | "evening" | "night";

/**
 * One way to leave a scene. The router uses this to know which keys / hot
 * spots can transport the player out of the current room.
 */
export interface SceneExit {
  /** Target scene id (matches `SceneManifest.id`). */
  to: string;
  /** Optional spawn coords inside the destination scene. */
  spawn?: { x: number; y: number };
  /** Optional human label for the prompt ("kitchen", "out the front door"). */
  label?: string;
  /** Optional gate condition. The router checks this before allowing the move. */
  gate?: () => boolean;
}

/**
 * A small "leaked memory" object the player can examine. Surfacing one
 * adds it to the journal and raises hidden awareness.
 *
 * Design doc §7.3 / §5 (glitch language).
 */
export interface FragmentDef {
  /** Stable id, persisted in GameState. Used to dedupe. */
  id: string;
  /** First-person sentence written to the journal when surfaced. */
  journalText: string;
  /** How much hidden awareness this fragment is worth (default 1). */
  awareness?: number;
  /** Optional flag set on surface — drives endings. */
  flag?: string;
}

/**
 * The full description of a location at one variant.
 */
export interface SceneManifest {
  /** Scene id — matches the Phaser scene key and the router's target name. */
  id: string;
  /** Display label, used in transition banners. */
  label: string;
  /** Day/evening/night variant — drives palette + ambient. */
  palette: ScenePalette;
  /** Audio key for the ambient loop. Empty string = silence. */
  ambient: string;
  /** Which exits the player can take from this scene. */
  exits: SceneExit[];
  /** Fragments that can surface in this scene this variant. */
  fragments: FragmentDef[];
  /** Optional npc ids present here (placeholders for future iterations). */
  npcs?: string[];
}

/**
 * In-memory registry — every scene calls `registerManifest(m)` from its
 * `create()`. The router reads from this map when checking exits/gates.
 */
const registry: Map<string, SceneManifest> = new Map();

export function registerManifest(m: SceneManifest): void {
  registry.set(m.id, m);
}

export function getManifest(id: string): SceneManifest | undefined {
  return registry.get(id);
}

export function listManifests(): SceneManifest[] {
  return Array.from(registry.values());
}
