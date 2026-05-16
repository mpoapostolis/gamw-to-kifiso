/**
 * ΑΚΟΜΑ ΕΓΩ — tableau: "Τέσσερις Μέρες" (Four Days).
 *
 * The companion picture to "Ο Άλλος". Same two figures, same single
 * stencil — but the room has split. A band of shadow runs straight down
 * the middle of the frame; the left half holds onto warmth, the right
 * half has gone cold blue-grey. Two halves of a life that used to be one.
 *
 * Across roughly forty seconds the figures DRIFT APART — each slides a
 * little further toward its own edge, the dark seam between them slowly
 * widening. They are no longer breathing together: their chests rise on
 * slightly different periods now, the way two people breathe.
 *
 * On the back wall, a clock. Its minute hand sweeps a full circle every
 * ~30 seconds — fast enough to actually watch move. Time is the thing
 * that turned one person into two, and here you can see it spending.
 *
 * chill ≈ 0.5 — half-drained. Drawn with Graphics + additive glow images,
 * everything at depth < 1000.
 */
import type { TableauHandle } from "../../../still/tableau";
import { VIEW_W, VIEW_H } from "../../../consts";
import { PAL, shade, mix } from "../../../palette";

/* ------------------------------------------------------------------ *
 *  THE FIGURE HELPER  (shared shape with kitchenOther.ts)
 *
 *  Duplicated verbatim so this tableau file is fully self-contained.
 *  It MUST stay identical to the version in kitchenOther.ts — the whole
 *  chapter depends on the two figures being literally the same drawing,
 *  here merely pulled apart and recoloured by the split frame.
 * ------------------------------------------------------------------ */

/** A handle onto one drawn figure: its root container + a way to breathe it. */
interface FigureHandle {
  /** The container holding every part of the figure. Move/scale this. */
  root: Phaser.GameObjects.Container;
  /** The figure's settled seat-line y (breathing lifts up from here). */
  baseY: number;
  /** Apply a breathing offset (in px) — lifts the torso a hair on inhale. */
  breathe: (lift: number) => void;
}

/**
 * Draw one seated figure into `scene` at (x, y) — y being the seat line,
 * the point where the body meets the chair. `tone` tints the silhouette,
 * `face` mirrors it (+1 looks right, -1 looks left).
 */
function drawFigure(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tone: number,
  face: 1 | -1,
): FigureHandle {
  const root = scene.add.container(x, y);

  // Three tonal layers: dark core, mid shell, faint rim — so the body
  // reads soft, not as a flat cut-out.
  const core = shade(tone, -0.55);
  const shell = shade(tone, -0.32);
  const rim = shade(tone, -0.08);

  const body = scene.add.graphics();

  // --- torso: a gently rounded trapezoid, narrower at the shoulders ---
  const torso = (col: number, inset: number) => {
    body.fillStyle(col, 1);
    body.beginPath();
    body.moveTo(-26 + inset, 0);
    body.lineTo(26 - inset, 0);
    body.lineTo(20 - inset, -78 + inset);
    body.lineTo(-20 + inset, -78 + inset);
    body.closePath();
    body.fillPath();
  };
  torso(core, 0);
  torso(shell, 5);

  // --- head: a soft oval, tilted slightly toward the room's centre ---
  const headY = -100;
  const headTilt = 5 * face;
  const head = (col: number, r: number) => {
    body.fillStyle(col, 1);
    body.fillCircle(headTilt, headY, r);
  };
  head(core, 17);
  head(shell, 13);

  // --- neck: a short bridge from shoulders to head ---
  body.fillStyle(core, 1);
  body.fillRect(headTilt - 7, headY + 8, 14, 16);

  // --- a thin rim of light down the figure's outward edge ---
  body.lineStyle(2, rim, 0.5);
  body.beginPath();
  body.moveTo(20 * face, -76);
  body.lineTo(26 * face, -4);
  body.strokePath();

  root.add(body);
  root.setDepth(300);

  // Breathing nudges the whole container up a few pixels from baseY.
  const breathe = (lift: number) => {
    root.y = y - lift;
  };

  return { root, baseY: y, breathe };
}

/* ------------------------------------------------------------------ *
 *  THE TABLEAU
 * ------------------------------------------------------------------ */

export function buildFourDays(
  scene: Phaser.Scene,
  chill: number,
): TableauHandle {
  // Track every object + tween so destroy() leaves nothing behind.
  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  const track = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    objects.push(o);
    return o;
  };

  const cx = VIEW_W / 2;
  const wallBottom = VIEW_H * 0.66;

  // Two palettes for the two halves. The left clings to a dimmed warmth;
  // the right has cooled most of the way to the Καθαριστές' blue-grey.
  // chill (~0.5) pulls BOTH a step further toward cold.
  const warmSide = (c: number): number => mix(c, PAL.gloomMid, 0.28 + chill * 0.25);
  const coldSide = (c: number): number => mix(c, PAL.gloomGlow, 0.6 + chill * 0.2);

  // ---- 1. THE SPLIT ROOM: night, then a warm half and a cold half ----
  const shell = track(scene.add.graphics());
  // deep night underneath everything
  shell.fillStyle(PAL.void, 1);
  shell.fillRect(0, 0, VIEW_W, VIEW_H);

  const wallTop = 70;
  // LEFT HALF — back wall + floor in dimmed warmth
  shell.fillStyle(warmSide(shade(PAL.woodMid, -0.32)), 1);
  shell.fillRect(0, wallTop, cx, wallBottom - wallTop);
  shell.fillStyle(warmSide(shade(PAL.woodDark, -0.22)), 1);
  shell.fillRect(0, wallBottom, cx, VIEW_H - wallBottom);
  // RIGHT HALF — back wall + floor gone cold blue-grey
  shell.fillStyle(coldSide(shade(PAL.gloomMid, -0.62)), 1);
  shell.fillRect(cx, wallTop, cx, wallBottom - wallTop);
  shell.fillStyle(coldSide(shade(PAL.night, -0.2)), 1);
  shell.fillRect(cx, wallBottom, cx, VIEW_H - wallBottom);
  // skirting line, tinted per side
  shell.lineStyle(3, shade(PAL.woodDark, -0.45), 0.8);
  shell.beginPath();
  shell.moveTo(0, wallBottom);
  shell.lineTo(cx, wallBottom);
  shell.strokePath();
  shell.lineStyle(3, shade(PAL.night, -0.35), 0.8);
  shell.beginPath();
  shell.moveTo(cx, wallBottom);
  shell.lineTo(VIEW_W, wallBottom);
  shell.strokePath();
  shell.setDepth(10);

  // ---- 2. THE BAND OF SHADOW down the centre seam ----
  // A soft dark column dividing the frame — the gap the two figures are
  // about to pour themselves into.
  const seam = track(scene.add.graphics());
  const seamHalf = 64;
  // a gradient-ish band built from three nested rectangles
  seam.fillStyle(PAL.void, 0.4);
  seam.fillRect(cx - seamHalf, 0, seamHalf * 2, VIEW_H);
  seam.fillStyle(PAL.void, 0.55);
  seam.fillRect(cx - seamHalf * 0.6, 0, seamHalf * 1.2, VIEW_H);
  seam.fillStyle(PAL.void, 0.7);
  seam.fillRect(cx - 14, 0, 28, VIEW_H);
  seam.setDepth(450); // in front of furniture + figures' lower bodies

  // ---- 3. THE TABLE + TWO CHAIRS (still facing, for now) ----
  const tableY = VIEW_H * 0.7;
  const tableHalfW = 210;
  const tableThick = 22;
  const legH = 96;

  const furniture = track(scene.add.graphics());

  // Each chair tinted by the side it stands on.
  const drawChair = (side: 1 | -1) => {
    const tint = side < 0 ? warmSide : coldSide;
    const seatY = tableY + 6;
    const seatW = 70;
    const seatCx = cx + side * (tableHalfW + 18);
    furniture.fillStyle(tint(shade(PAL.woodDark, -0.15)), 1);
    const backX = seatCx + side * (seatW / 2 - 8);
    furniture.fillRect(backX - 6, seatY - 118, 12, 124);
    furniture.fillStyle(tint(shade(PAL.woodMid, -0.05)), 1);
    furniture.fillRect(seatCx - seatW / 2, seatY, seatW, 14);
    furniture.fillStyle(tint(shade(PAL.woodDark, -0.3)), 1);
    furniture.fillRect(seatCx - side * (seatW / 2 - 6) - 5, seatY + 14, 10, 70);
  };
  drawChair(-1);
  drawChair(1);

  // The table straddles the seam, so paint its halves in the two tones.
  // legs
  furniture.fillStyle(warmSide(shade(PAL.woodDark, -0.25)), 1);
  furniture.fillRect(cx - tableHalfW + 16, tableY + tableThick, 16, legH);
  furniture.fillStyle(coldSide(shade(PAL.woodDark, -0.25)), 1);
  furniture.fillRect(cx + tableHalfW - 32, tableY + tableThick, 16, legH);
  // table top — left half warm, right half cold
  furniture.fillStyle(warmSide(shade(PAL.woodMid, 0.05)), 1);
  furniture.fillRect(cx - tableHalfW, tableY, tableHalfW, tableThick);
  furniture.fillStyle(coldSide(shade(PAL.woodMid, -0.1)), 1);
  furniture.fillRect(cx, tableY, tableHalfW, tableThick);
  // front edge shadow line
  furniture.lineStyle(2, shade(PAL.woodDark, -0.5), 0.7);
  furniture.beginPath();
  furniture.moveTo(cx - tableHalfW, tableY + tableThick);
  furniture.lineTo(cx + tableHalfW, tableY + tableThick);
  furniture.strokePath();
  furniture.setDepth(400);

  // ---- 4. THE CLOCK on the back wall (warm-left side) ----
  // A plain round wall clock. Its FACE + tick marks + the slow hour hand
  // are static; only the minute hand turns, redrawn each frame.
  const clockX = cx - VIEW_W * 0.27;
  const clockY = wallTop + 130;
  const clockR = 56;

  const clockBody = track(scene.add.graphics());
  // rim
  clockBody.fillStyle(warmSide(shade(PAL.woodHi, -0.1)), 1);
  clockBody.fillCircle(clockX, clockY, clockR + 7);
  // face
  clockBody.fillStyle(warmSide(PAL.thatchHi), 1);
  clockBody.fillCircle(clockX, clockY, clockR);
  // twelve tick marks around the dial
  clockBody.lineStyle(3, shade(PAL.woodDark, -0.2), 0.85);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const inner = i % 3 === 0 ? clockR - 13 : clockR - 8;
    clockBody.beginPath();
    clockBody.moveTo(
      clockX + Math.cos(a) * inner,
      clockY + Math.sin(a) * inner,
    );
    clockBody.lineTo(
      clockX + Math.cos(a) * (clockR - 4),
      clockY + Math.sin(a) * (clockR - 4),
    );
    clockBody.strokePath();
  }
  // a short, near-static hour hand, parked just past the 10
  clockBody.lineStyle(5, shade(PAL.woodDark, -0.35), 1);
  const hourA = (-Math.PI / 2) + (10 / 12) * Math.PI * 2;
  clockBody.beginPath();
  clockBody.moveTo(clockX, clockY);
  clockBody.lineTo(
    clockX + Math.cos(hourA) * (clockR * 0.5),
    clockY + Math.sin(hourA) * (clockR * 0.5),
  );
  clockBody.strokePath();
  // hub
  clockBody.fillStyle(shade(PAL.woodDark, -0.4), 1);
  clockBody.fillCircle(clockX, clockY, 5);
  clockBody.setDepth(30);

  // the minute hand lives in its own Graphics so it can be cleared and
  // redrawn every frame without disturbing the dial.
  const minuteHand = track(scene.add.graphics());
  minuteHand.setDepth(31);

  // ---- 5. LAMP COLUMN over the table (kept central, warm) ----
  const lampShadeY = 150;
  const cone = track(scene.add.graphics());
  cone.fillStyle(PAL.emberSoft, 0.07);
  cone.beginPath();
  cone.moveTo(cx, lampShadeY + 22);
  cone.lineTo(cx - tableHalfW - 60, tableY + 30);
  cone.lineTo(cx + tableHalfW + 60, tableY + 30);
  cone.closePath();
  cone.fillPath();
  cone.setDepth(120);

  const lamp = track(scene.add.graphics());
  lamp.lineStyle(3, shade(PAL.woodDark, -0.3), 1);
  lamp.beginPath();
  lamp.moveTo(cx, 0);
  lamp.lineTo(cx, lampShadeY - 28);
  lamp.strokePath();
  lamp.fillStyle(shade(PAL.woodMid, -0.2), 1);
  lamp.beginPath();
  lamp.moveTo(cx - 46, lampShadeY + 22);
  lamp.lineTo(cx + 46, lampShadeY + 22);
  lamp.lineTo(cx + 14, lampShadeY - 28);
  lamp.lineTo(cx - 14, lampShadeY - 28);
  lamp.closePath();
  lamp.fillPath();
  lamp.fillStyle(PAL.emberHot, 0.88);
  lamp.fillEllipse(cx, lampShadeY + 22, 78, 16);
  lamp.setDepth(500);

  // warm bloom under the bulb — static, just tracked for teardown.
  track(
    scene.add
      .image(cx, lampShadeY + 20, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.8)
      .setAlpha(0.34)
      .setDepth(130),
  );
  // ...and a cold violet bloom seeping in from the right edge.
  const coldGlow = track(
    scene.add
      .image(VIEW_W - 120, VIEW_H * 0.5, "glow_violet")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(5.2)
      .setAlpha(0.3)
      .setDepth(125),
  );

  // ---- 6. THE TWO FIGURES — same stencil, one per side, recoloured ----
  // They START close to the table edge, exactly as in "Ο Άλλος". update()
  // will walk them outward. We remember each start x and drift target.
  const seatLine = tableY + 12;
  const leftStartX = cx - (tableHalfW + 18);
  const rightStartX = cx + (tableHalfW + 18);
  const driftDist = 120; // px each figure travels outward over the drift

  const left = drawFigure(
    scene,
    leftStartX,
    seatLine,
    warmSide(PAL.cloak),
    1,
  );
  const right = drawFigure(
    scene,
    rightStartX,
    seatLine,
    coldSide(PAL.cloak),
    -1,
  );

  // ---- 7. VIGNETTE so the frame edges fall into dark ----
  const vignette = track(scene.add.graphics());
  vignette.fillStyle(PAL.void, 0.58);
  vignette.fillRect(0, 0, VIEW_W, 46);
  vignette.fillRect(0, VIEW_H - 60, VIEW_W, 60);
  vignette.fillRect(0, 0, 60, VIEW_H);
  vignette.fillRect(VIEW_W - 60, 0, 60, VIEW_H);
  vignette.setDepth(600);

  // ------------------------------------------------------------------
  //  LIVING MOTION
  //
  //  (1) DRIFT — over ~40s each figure eases outward by `driftDist`, so
  //      the shadow seam between them widens. Eased so the parting is
  //      slow at first, then resigned.
  //  (2) BREATHING — no longer shared. Two waves with different periods
  //      (5.1s vs 6.4s) so the chests fall out of step.
  //  (3) THE MINUTE HAND — a full sweep every 30s, redrawn each frame.
  // ------------------------------------------------------------------
  let elapsed = 0;
  const DRIFT_MS = 40_000; // forty seconds to come fully apart
  const SWEEP_MS = 30_000; // one full clock-hand revolution

  // smootherstep — gentle ease in and out of the drift
  const ease = (p: number): number => {
    const c = p < 0 ? 0 : p > 1 ? 1 : p;
    return c * c * c * (c * (c * 6 - 15) + 10);
  };

  const update = (_time: number, delta: number): void => {
    elapsed += delta;
    const t = elapsed / 1000;

    // -- (1) drift apart --
    const driftP = ease(elapsed / DRIFT_MS); // 0..1, saturates after 40s
    left.root.x = leftStartX - driftDist * driftP; // slides left
    right.root.x = rightStartX + driftDist * driftP; // slides right

    // -- (2) out-of-sync breathing --
    const breathL = Math.sin(t * ((Math.PI * 2) / 5.1));
    const breathR = Math.sin(t * ((Math.PI * 2) / 6.4) + 1.1);
    left.breathe((breathL * 0.5 + 0.5) * 3.0);
    right.breathe((breathR * 0.5 + 0.5) * 3.0);

    // -- (3) the minute hand sweeps a visible full circle --
    const sweepP = (elapsed % SWEEP_MS) / SWEEP_MS; // 0..1 looping
    const minA = -Math.PI / 2 + sweepP * Math.PI * 2;
    minuteHand.clear();
    minuteHand.lineStyle(3, shade(PAL.woodDark, -0.15), 1);
    minuteHand.beginPath();
    minuteHand.moveTo(clockX, clockY);
    minuteHand.lineTo(
      clockX + Math.cos(minA) * (clockR - 12),
      clockY + Math.sin(minA) * (clockR - 12),
    );
    minuteHand.strokePath();

    // a faint pulse on the cold glow as the right side keeps cooling
    coldGlow.setAlpha(0.3 + Math.sin(t * 0.5) * 0.04);
  };

  // ------------------------------------------------------------------
  //  TEARDOWN
  // ------------------------------------------------------------------
  const destroy = (): void => {
    for (const tw of tweens) tw.stop();
    tweens.length = 0;
    left.root.destroy();
    right.root.destroy();
    for (const o of objects) o.destroy();
    objects.length = 0;
  };

  return { update, destroy };
}
