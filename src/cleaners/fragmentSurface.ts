/**
 * THE CLEANERS — surface a fragment.
 *
 * Every scene used to do these four things separately:
 *   1. GameState.addFragment(id, awareness) → returns `true` if new
 *   2. GameState.addJournalEntry(text, { fragmentId })
 *   3. pulseGlitch(scene.fxPipeline)
 *   4. Maybe show a first-time hint "press J to read your journal"
 *
 * That's four places to forget the awareness number, four places to
 * forget the journal entry, four places where the post-FX pulse can be
 * skipped. This module is the one place. Every scene calls
 * `surfaceFragment(scene, def)` and the rest happens uniformly.
 *
 * Design doc §7.3 + §12.
 */

import Phaser from "phaser";
import { GameState } from "../state/gameState";
import { pulseGlitch, type CleanersFXPipeline } from "../fx/postProcess";
import { VIEW_W } from "../consts";
import { hex, PAL } from "../palette";
import { fireTutorial, TUT_FIRST_FRAGMENT } from "./tutorial";

/**
 * A scene that has called applyPostFX() and parked the pipeline on a
 * field named `fxPipeline`. Most rooms now do this; surfaceFragment
 * reads that field if present, otherwise falls back to a no-op.
 */
interface SceneWithFX extends Phaser.Scene {
  fxPipeline?: CleanersFXPipeline | null;
}

export interface FragmentSurface {
  /** Stable id — reused across days, prevents double-counting. */
  id: string;
  /** Notebook line, first-person, sensory. */
  journal: string;
  /** Hidden awareness points. Default 1, big reveals worth 2-3. */
  awareness?: number;
  /** Optional: also set an ending flag (e.g. saw_cleaner). */
  flag?: string;
}

/**
 * Surface a fragment. Returns true if it was new (and therefore caused a
 * glitch pulse + journal entry); returns false if the player has
 * already surfaced this fragment.
 */
export function surfaceFragment(scene: SceneWithFX, def: FragmentSurface): boolean {
  const added = GameState.addFragment(def.id, def.awareness ?? 1);
  if (!added) return false;
  GameState.addJournalEntry(def.journal, { fragmentId: def.id });
  if (def.flag) GameState.setFlag(def.flag, true);
  // Visual feedback — a brief chromatic-aberration pulse so the player
  // sees that something registered. We swallow null because some scenes
  // (Sleep / Credits / Title) intentionally skip the FX pipeline.
  if (scene.fxPipeline) pulseGlitch(scene.fxPipeline, 220);
  // First-fragment-ever moment: fire the big modal "YOU WROTE IT DOWN"
  // tutorial that teaches the J key, instead of a small toast you might
  // miss. The fireTutorial helper is idempotent by GameState flag.
  if (GameState.state.fragmentsFound.length === 1) {
    scene.time.delayedCall(900, () => fireTutorial(scene, TUT_FIRST_FRAGMENT));
  }
  return true;
}

/**
 * A small floating italic line that lasts a beat then fades. Used by
 * surfaceFragment's first-time tutorial nudge AND available for any
 * scene that wants a tip overlay. Stays attached to camera (no scroll
 * factor) so it works in any scene without extra wiring.
 */
export function floatTip(scene: Phaser.Scene, text: string, ms = 3000): void {
  // Sit just below the HUD bar (which ends at y≈124). The room's own
  // flashLine lives at y≈VIEW_H - 90, so we stay well clear of it.
  const t = scene.add
    .text(VIEW_W / 2, 160, text, {
      fontFamily: '"Spectral", Georgia, serif',
      fontSize: "14px",
      color: hex(PAL.emberSoft),
      fontStyle: "italic 400",
      backgroundColor: "rgba(20, 12, 8, 0.85)",
      padding: { left: 14, right: 14, top: 6, bottom: 6 },
      wordWrap: { width: 720 },
      align: "center",
    })
    .setOrigin(0.5)
    .setAlpha(0)
    .setDepth(9400)
    .setScrollFactor(0);
  scene.tweens.add({
    targets: t,
    alpha: { from: 0, to: 1 },
    duration: 380,
    yoyo: true,
    hold: ms,
    onComplete: () => t.destroy(),
  });
}
