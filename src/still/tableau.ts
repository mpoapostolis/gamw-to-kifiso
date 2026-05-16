/**
 * ΑΚΟΜΑ ΕΓΩ — tableau contract.
 *
 * Each chapter of the story is played over a "tableau": a procedurally
 * drawn, quietly alive picture (a bedroom with someone breathing, a train
 * window with the dark sliding past, a kitchen with two identical figures).
 * The tableau is the SET. The StoryScene paints the words on top of it.
 *
 * A tableau builder receives the scene + the chapter's `chill` value
 * (0 = warm, 1 = cold/drained — the story desaturates as it goes) and
 * returns a handle the StoryScene can update each frame and tear down on
 * the way to the next chapter.
 *
 * Tableaux live in src/scenes/still/tableaux/*.ts. They draw with
 * Phaser.GameObjects.Graphics only — no image assets. They must keep all
 * their game objects at depth < 1000 so the story text (depth 9000+)
 * always sits on top.
 */
import type Phaser from "phaser";

export interface TableauHandle {
  /** Optional per-frame tick for living elements (breathing, scrolling). */
  update?: (time: number, delta: number) => void;
  /** Tear down everything the builder created. Called on chapter change. */
  destroy?: () => void;
}

/**
 * A tableau builder. `chill` is 0..1 — the builder may cool its own
 * palette by that amount, though the global post-FX also handles the
 * drain. Most builders can ignore it.
 */
export type TableauBuilder = (scene: Phaser.Scene, chill: number) => TableauHandle;
