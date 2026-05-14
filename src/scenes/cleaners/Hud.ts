/**
 * THE CLEANERS — universal HUD.
 *
 * Runs as a separate Phaser scene at depth higher than every room.
 * Launched once (idempotent) from any room's create(). Polls GameState
 * each frame and repaints:
 *
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │  DAY 1 · TUESDAY                          3 fragments    J    │
 *   │  ─────────────────────────                                    │
 *   │  TODAY'S TASK                                                 │
 *   │  look around. press E on what catches your eye.               │
 *   │  walk · WASD     examine · E     journal · J                  │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * The HUD is intentionally minimal and warm-cream. It is the SECOND
 * thing the player reads after the room itself. The numbers are quiet,
 * the verbs are small. The "today's task" line is the single most
 * important UX element — it tells the player WHAT to do.
 */
import Phaser from "phaser";
import { VIEW_W } from "../../consts";
import { hex, PAL } from "../../palette";
import { GameState } from "../../state/gameState";
import { getObjective, dayName } from "../../cleaners/dayObjectives";

const SPECTRAL = '"Spectral", Georgia, serif';
const CINZEL = '"Cinzel", "Times New Roman", serif';

export class HudScene extends Phaser.Scene {
  private dayLabel!: Phaser.GameObjects.Text;
  private fragLabel!: Phaser.GameObjects.Text;
  // intentionally stamped once and held for future toggle — accessed via void
  private taskTitle?: Phaser.GameObjects.Text;
  private taskBody!: Phaser.GameObjects.Text;
  private taskSub!: Phaser.GameObjects.Text;
  private jHint?: Phaser.GameObjects.Text;
  private bgGfx!: Phaser.GameObjects.Graphics;

  // Cached previous values so we only setText when something changes —
  // Phaser repaints the text glyph atlas on every setText call.
  private lastDay = -1;
  private lastFrag = -1;
  private lastTask = "";

  constructor() { super("Hud"); }

  create() {
    // Single-screen overlay. We park everything at scrollFactor 0 so it
    // pins to the camera. No physics, no input — pure render.
    this.bgGfx = this.add.graphics().setScrollFactor(0).setDepth(9500);
    this.repaintBg();

    // TOP-LEFT: Day banner
    this.dayLabel = this.add
      .text(20, 16, "", {
        fontFamily: CINZEL,
        fontSize: "16px",
        color: hex(PAL.thatchHi),
        fontStyle: "800",
      })
      .setLetterSpacing(4)
      .setScrollFactor(0)
      .setDepth(9510);

    // TOP-RIGHT: Fragment counter + J hint pinned together
    this.fragLabel = this.add
      .text(VIEW_W - 60, 18, "", {
        fontFamily: SPECTRAL,
        fontSize: "13px",
        color: hex(PAL.inkDim),
        fontStyle: "italic 400",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(9510);

    this.jHint = this.add
      .text(VIEW_W - 20, 18, "J", {
        fontFamily: CINZEL,
        fontSize: "14px",
        color: hex(PAL.emberSoft),
        fontStyle: "800",
        backgroundColor: "rgba(255, 200, 130, 0.10)",
        padding: { left: 6, right: 6, top: 2, bottom: 2 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(9510);

    // CENTRE-TOP: today's task
    // (taskTitle / jHint are stamped once and never read again, but we
    // keep them as fields for future toggling — silence the unused-read
    // diagnostic with explicit void on use-site below.)
    this.taskTitle = this.add
      .text(VIEW_W / 2, 48, "TODAY'S TASK", {
        fontFamily: CINZEL,
        fontSize: "10px",
        color: hex(PAL.emberSoft),
        fontStyle: "600",
      })
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setScrollFactor(0)
      .setDepth(9510);

    this.taskBody = this.add
      .text(VIEW_W / 2, 66, "", {
        fontFamily: SPECTRAL,
        fontSize: "18px",
        color: hex(PAL.emberHot),
        fontStyle: "italic 600",
        align: "center",
        wordWrap: { width: 820 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(9510);

    this.taskSub = this.add
      .text(VIEW_W / 2, 96, "", {
        fontFamily: SPECTRAL,
        fontSize: "11px",
        color: hex(PAL.inkFaint),
        fontStyle: "italic 400",
        align: "center",
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(9510);

    // Initial paint
    this.refresh(true);
    // touch the held refs so the unused-locals checker is happy
    void this.taskTitle;
    void this.jHint;
  }

  /** Paint the soft horizontal bar behind the top-of-screen HUD. */
  private repaintBg() {
    this.bgGfx.clear();
    this.bgGfx.fillStyle(0x0a0608, 0.55);
    this.bgGfx.fillRect(0, 0, VIEW_W, 124);
    this.bgGfx.fillStyle(PAL.emberSoft, 0.06);
    this.bgGfx.fillRect(0, 0, VIEW_W, 2);
    this.bgGfx.fillStyle(0x0a0608, 0.85);
    this.bgGfx.fillRect(0, 122, VIEW_W, 2);
  }

  /** Repaint dynamic labels — called every ~250ms by update(). */
  private refresh(force = false) {
    const s = GameState.state;
    if (force || s.dayIndex !== this.lastDay) {
      this.dayLabel.setText(`DAY ${s.dayIndex}  ·  ${dayName(s.dayIndex).toUpperCase()}`);
      this.lastDay = s.dayIndex;
    }
    if (force || s.fragmentsFound.length !== this.lastFrag) {
      const n = s.fragmentsFound.length;
      this.fragLabel.setText(`${n}  fragment${n === 1 ? "" : "s"}`);
      this.lastFrag = n;
    }
    const obj = getObjective(s);
    const taskKey = obj.text + "|" + (obj.sub ?? "");
    if (force || taskKey !== this.lastTask) {
      this.taskBody.setText(obj.text);
      this.taskSub.setText(obj.sub ?? "");
      // pulse when the objective changes, so the player's eye is drawn
      // up to the new line. Skip on the very first paint (force=true).
      if (!force) {
        this.tweens.add({
          targets: this.taskBody,
          scale: { from: 1.0, to: 1.08 },
          yoyo: true,
          duration: 220,
          ease: "Sine.easeOut",
        });
        this.tweens.add({
          targets: this.taskBody,
          alpha: { from: 0.3, to: 1 },
          duration: 380,
          ease: "Cubic.easeOut",
        });
      }
      this.lastTask = taskKey;
    }
  }

  /** Poll-style refresh — cheap (string comparisons). */
  private acc = 0;
  update(_t: number, dt: number) {
    this.acc += dt;
    if (this.acc > 250) {
      this.acc = 0;
      this.refresh();
    }
  }
}

/**
 * Idempotent launcher — any room can call this from create() and
 * the HudScene will start exactly once. Subsequent calls are no-ops.
 */
export function ensureHud(scene: Phaser.Scene): void {
  if (scene.scene.manager.isActive("Hud")) return;
  scene.scene.launch("Hud");
}
