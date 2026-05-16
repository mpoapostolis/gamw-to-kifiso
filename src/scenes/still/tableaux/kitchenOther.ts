/**
 * ΑΚΟΜΑ ΕΓΩ — tableau: "Ο Άλλος" (The Other One).
 *
 * A small kitchen, late at night. One hanging lamp. One table. Two chairs
 * pulled up to it, facing each other across the wood. And in the chairs:
 * two figures. The narrator — and the narrator again. Not a stranger. Not
 * a reflection in glass. A second her, sitting where a second her should
 * not be able to sit.
 *
 * The horror here is not motion. It is SAMENESS. The two silhouettes are
 * drawn from a single helper, placed twice — one mirrored — so every line
 * is identical: the slope of the shoulders, the exact tilt of the head.
 * They breathe, and they breathe TOGETHER, perfectly in phase, because at
 * this point in the story they are still one person wearing two bodies.
 *
 * The lamp is warm (chill ≈ 0.3) but its warmth is too even, too centred,
 * too composed — a room arranged for a photograph rather than lived in.
 *
 * Drawn entirely with Graphics + additive glow images. Everything sits at
 * depth < 1000 so the StoryScene's words (depth 9000+) stay on top.
 */
import type { TableauHandle } from "../../../still/tableau";
import { VIEW_W, VIEW_H } from "../../../consts";
import { PAL, shade, mix } from "../../../palette";

/* ------------------------------------------------------------------ *
 *  THE FIGURE HELPER
 *
 *  One seated woman, rendered as a soft layered silhouette. Both tableaux
 *  in this chapter use this exact shape — that is the whole point: the
 *  narrator and her double must be cut from the same stencil. The helper
 *  is intentionally duplicated verbatim in fourDays.ts so each tableau
 *  file stays fully self-contained.
 *
 *  `face` is +1 for a figure looking right, -1 for one looking left, so a
 *  single definition can be mirrored across the table.
 * ------------------------------------------------------------------ */

/** A handle onto one drawn figure: its root container + a way to breathe it. */
interface FigureHandle {
  /** The container holding every part of the figure. Move/scale this. */
  root: Phaser.GameObjects.Container;
  /** Apply a breathing offset (in px) — lifts the torso a hair on inhale. */
  breathe: (lift: number) => void;
}

/**
 * Draw one seated figure into `scene` at (x, y) — y being the seat line,
 * the point where the body meets the chair.
 *
 * `tone` tints the silhouette (warm dusk vs. cold blue depending on which
 * side of the divergence it sits on). `face` mirrors the figure.
 */
function drawFigure(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tone: number,
  face: 1 | -1,
): FigureHandle {
  const root = scene.add.container(x, y);

  // The silhouette is built from three tonal layers so it reads as a
  // soft body and not a flat cut-out: a dark core, a mid shell, a faint
  // rim where the lamp just catches a shoulder.
  const core = shade(tone, -0.55);
  const shell = shade(tone, -0.32);
  const rim = shade(tone, -0.08);

  const body = scene.add.graphics();

  // --- torso: a gently rounded trapezoid, narrower at the shoulders ---
  // Drawn relative to the container origin (0,0 = seat line).
  const torso = (col: number, inset: number) => {
    body.fillStyle(col, 1);
    body.beginPath();
    body.moveTo(-26 + inset, 0); // left hip at the seat
    body.lineTo(26 - inset, 0); // right hip
    body.lineTo(20 - inset, -78 + inset); // right shoulder
    body.lineTo(-20 + inset, -78 + inset); // left shoulder
    body.closePath();
    body.fillPath();
  };
  torso(core, 0);
  torso(shell, 5);

  // --- head: a soft oval, tilted very slightly toward the table ---
  // The tilt is what makes two of them unbearable — they incline the
  // same degree, like one gesture copied.
  const headY = -100;
  const headTilt = 5 * face; // px of lean toward the centre of the room
  const head = (col: number, r: number) => {
    body.fillStyle(col, 1);
    body.fillCircle(headTilt, headY, r);
  };
  head(core, 17);
  head(shell, 13);

  // --- neck: a short bridge from shoulders to head ---
  body.fillStyle(core, 1);
  body.fillRect(headTilt - 7, headY + 8, 14, 16);

  // --- a thin rim of lamp-light down the figure's outward edge ---
  // Only the side facing the lamp glow catches it, so the body has a
  // direction without ever showing a face.
  body.lineStyle(2, rim, 0.5);
  body.beginPath();
  body.moveTo(20 * face, -76);
  body.lineTo(26 * face, -4);
  body.strokePath();

  root.add(body);
  // The figures are deliberately mid-depth: behind nothing, in front of
  // the room, well under the story text.
  root.setDepth(300);

  // Breathing simply nudges the whole figure container up a few pixels.
  // Subtle enough that you doubt you saw it.
  const breathe = (lift: number) => {
    root.y = y - lift;
  };

  return { root, breathe };
}

/* ------------------------------------------------------------------ *
 *  THE TABLEAU
 * ------------------------------------------------------------------ */

export function buildKitchenOther(
  scene: Phaser.Scene,
  chill: number,
): TableauHandle {
  // Track every object + tween so destroy() can leave nothing behind.
  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];
  const track = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    objects.push(o);
    return o;
  };

  // chill cools the room a touch — at ~0.3 it is still warm, just less so.
  const warm = (c: number): number => mix(c, PAL.gloomMid, chill * 0.35);

  const cx = VIEW_W / 2;

  // ---- 1. THE ROOM SHELL: night beyond, then walls ----
  const shell = track(scene.add.graphics());
  // deep night fills the whole frame first
  shell.fillStyle(PAL.void, 1);
  shell.fillRect(0, 0, VIEW_W, VIEW_H);
  // back wall — a warm-but-dim plane, lit from the centre
  const wallTop = 70;
  const wallBottom = VIEW_H * 0.66;
  shell.fillStyle(warm(shade(PAL.woodMid, -0.3)), 1);
  shell.fillRect(0, wallTop, VIEW_W, wallBottom - wallTop);
  // floor — darker timber receding below the wall
  shell.fillStyle(warm(shade(PAL.woodDark, -0.2)), 1);
  shell.fillRect(0, wallBottom, VIEW_W, VIEW_H - wallBottom);
  // a faint skirting line where wall meets floor
  shell.lineStyle(3, shade(PAL.woodDark, -0.45), 0.8);
  shell.beginPath();
  shell.moveTo(0, wallBottom);
  shell.lineTo(VIEW_W, wallBottom);
  shell.strokePath();
  shell.setDepth(10);

  // ---- 2. THE COUNTER: a kitchen line along the back wall ----
  const counter = track(scene.add.graphics());
  const counterY = wallBottom - 150;
  const counterH = 26;
  // counter top
  counter.fillStyle(warm(PAL.woodHi), 1);
  counter.fillRect(0, counterY, VIEW_W, counterH);
  counter.fillStyle(warm(shade(PAL.woodHi, 0.2)), 0.6);
  counter.fillRect(0, counterY, VIEW_W, 5); // a sheen on the surface
  // cabinet face beneath the counter
  counter.fillStyle(warm(shade(PAL.woodMid, -0.45)), 1);
  counter.fillRect(0, counterY + counterH, VIEW_W, wallBottom - counterY - counterH);
  // a couple of cabinet seams — quiet vertical lines
  counter.lineStyle(2, shade(PAL.woodDark, -0.4), 0.7);
  for (const sx of [VIEW_W * 0.18, VIEW_W * 0.4, VIEW_W * 0.62, VIEW_W * 0.84]) {
    counter.beginPath();
    counter.moveTo(sx, counterY + counterH);
    counter.lineTo(sx, wallBottom);
    counter.strokePath();
  }
  counter.setDepth(20);

  // ---- 3. THE TABLE: a low slab dead-centre, two chairs facing ----
  const tableY = VIEW_H * 0.7; // the table's top surface
  const tableHalfW = 210;
  const tableThick = 22;
  const legH = 96;

  const furniture = track(scene.add.graphics());

  // -- two chairs, FACING EACH OTHER across the table --
  // Each chair: a seat slab + a tall back. The backs lean toward the
  // table's centre so the chairs clearly "address" one another.
  const drawChair = (side: 1 | -1) => {
    const seatY = tableY + 6;
    const seatW = 70;
    // chairs sit just outside the table edge
    const seatCx = cx + side * (tableHalfW + 18);
    // backrest — a vertical plank rising behind the seat
    furniture.fillStyle(warm(shade(PAL.woodDark, -0.15)), 1);
    const backX = seatCx + side * (seatW / 2 - 8);
    furniture.fillRect(backX - 6, seatY - 118, 12, 124);
    // seat slab
    furniture.fillStyle(warm(shade(PAL.woodMid, -0.05)), 1);
    furniture.fillRect(seatCx - seatW / 2, seatY, seatW, 14);
    // a near front leg (the far one is hidden behind the table)
    furniture.fillStyle(warm(shade(PAL.woodDark, -0.3)), 1);
    furniture.fillRect(seatCx - side * (seatW / 2 - 6) - 5, seatY + 14, 10, 70);
  };
  drawChair(-1);
  drawChair(1);

  // -- the table itself, drawn after the chairs so it overlaps them --
  // legs
  furniture.fillStyle(warm(shade(PAL.woodDark, -0.25)), 1);
  furniture.fillRect(cx - tableHalfW + 16, tableY + tableThick, 16, legH);
  furniture.fillRect(cx + tableHalfW - 32, tableY + tableThick, 16, legH);
  // table top
  furniture.fillStyle(warm(shade(PAL.woodMid, 0.05)), 1);
  furniture.fillRect(cx - tableHalfW, tableY, tableHalfW * 2, tableThick);
  // a warm sheen across the tabletop where the lamp lands
  furniture.fillStyle(warm(PAL.emberSoft), 0.22);
  furniture.fillRect(cx - tableHalfW + 30, tableY, tableHalfW * 2 - 60, 6);
  // front edge shadow line
  furniture.lineStyle(2, shade(PAL.woodDark, -0.5), 0.7);
  furniture.beginPath();
  furniture.moveTo(cx - tableHalfW, tableY + tableThick);
  furniture.lineTo(cx + tableHalfW, tableY + tableThick);
  furniture.strokePath();
  furniture.setDepth(400); // in front of the figures' lower bodies

  // ---- 4. THE HANGING LAMP: cord, shade, and the cone of light ----
  // The cone is the soul of the picture — a single pool of warmth that
  // holds both figures inside it, equally, like specimens.
  const lampX = cx;
  const lampShadeY = 150;

  // the cone of light, drawn as a soft triangle from shade to table
  const cone = track(scene.add.graphics());
  cone.fillStyle(PAL.emberSoft, 0.1 - chill * 0.03);
  cone.beginPath();
  cone.moveTo(lampX, lampShadeY + 22);
  cone.lineTo(cx - tableHalfW - 70, tableY + 30);
  cone.lineTo(cx + tableHalfW + 70, tableY + 30);
  cone.closePath();
  cone.fillPath();
  // an inner, brighter core of the cone
  cone.fillStyle(PAL.emberHot, 0.12 - chill * 0.03);
  cone.beginPath();
  cone.moveTo(lampX, lampShadeY + 22);
  cone.lineTo(cx - 150, tableY + 20);
  cone.lineTo(cx + 150, tableY + 20);
  cone.closePath();
  cone.fillPath();
  cone.setDepth(120); // behind the figures, in front of the room

  // the lamp hardware: cord + shade, drawn above the cone
  const lamp = track(scene.add.graphics());
  // cord up to the ceiling
  lamp.lineStyle(3, shade(PAL.woodDark, -0.3), 1);
  lamp.beginPath();
  lamp.moveTo(lampX, 0);
  lamp.lineTo(lampX, lampShadeY - 28);
  lamp.strokePath();
  // conical shade
  lamp.fillStyle(warm(shade(PAL.woodMid, -0.1)), 1);
  lamp.beginPath();
  lamp.moveTo(lampX - 46, lampShadeY + 22);
  lamp.lineTo(lampX + 46, lampShadeY + 22);
  lamp.lineTo(lampX + 14, lampShadeY - 28);
  lamp.lineTo(lampX - 14, lampShadeY - 28);
  lamp.closePath();
  lamp.fillPath();
  // the glowing underside of the shade — the bulb itself
  lamp.fillStyle(PAL.emberHot, 0.95);
  lamp.fillEllipse(lampX, lampShadeY + 22, 78, 16);
  lamp.setDepth(500); // the shade hangs in front of everything but text

  // a soft additive bloom around the bulb so the light feels physical
  const bulbGlow = track(
    scene.add
      .image(lampX, lampShadeY + 20, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.0)
      .setAlpha(0.5 - chill * 0.12)
      .setDepth(130),
  );
  // a second, wider bloom pooled over the tabletop
  const tableGlow = track(
    scene.add
      .image(cx, tableY + 4, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(4.4)
      .setAlpha(0.3 - chill * 0.08)
      .setDepth(125),
  );

  // ---- 5. THE TWO FIGURES — identical, mirror-placed, facing ----
  // Their seat line sits on top of the chair seats. The left one looks
  // right (face = +1), the right one looks left (face = -1). Same tone,
  // same helper: a single woman printed twice.
  const figTone = warm(PAL.cloak);
  const seatLine = tableY + 12;
  const left = drawFigure(scene, cx - (tableHalfW + 18), seatLine, figTone, 1);
  const right = drawFigure(scene, cx + (tableHalfW + 18), seatLine, figTone, -1);

  // ---- 6. A VIGNETTE so the room edges fall away into night ----
  const vignette = track(scene.add.graphics());
  vignette.fillStyle(PAL.void, 1);
  // four soft slabs darkening the frame border
  const v = 90;
  vignette.fillRect(0, 0, VIEW_W, v);
  vignette.fillRect(0, VIEW_H - v, VIEW_W, v);
  vignette.fillRect(0, 0, v, VIEW_H);
  vignette.fillRect(VIEW_W - v, 0, v, VIEW_H);
  vignette.setAlpha(0.0); // the slabs themselves stay invisible...
  // ...instead use the additive glow texture inverted is overkill — keep
  // it honest: just a faint dark frame via low-alpha rectangles.
  vignette.clear();
  vignette.fillStyle(PAL.void, 0.55);
  vignette.fillRect(0, 0, VIEW_W, 46);
  vignette.fillRect(0, VIEW_H - 60, VIEW_W, 60);
  vignette.fillRect(0, 0, 60, VIEW_H);
  vignette.fillRect(VIEW_W - 60, 0, 60, VIEW_H);
  vignette.setAlpha(1);
  vignette.setDepth(600);

  // ------------------------------------------------------------------
  //  LIVING MOTION
  //
  //  Two things move, both barely. (1) The lamp flickers — a tiny,
  //  slow wander of the bulb-glow's alpha. (2) The figures breathe, and
  //  they breathe AS ONE: a single sine wave drives both. That shared
  //  phase is the unease — two chests rising on the exact same beat.
  // ------------------------------------------------------------------
  let elapsed = 0;
  const baseBulb = bulbGlow.alpha;
  const baseTable = tableGlow.alpha;

  const update = (_time: number, delta: number): void => {
    elapsed += delta;
    const t = elapsed / 1000;

    // -- lamp flicker: a layered, slow shimmer, never strobing --
    const flick =
      Math.sin(t * 1.3) * 0.55 +
      Math.sin(t * 0.41 + 1.7) * 0.35 +
      Math.sin(t * 2.7 + 0.6) * 0.1;
    bulbGlow.setAlpha(baseBulb + flick * 0.05);
    tableGlow.setAlpha(baseTable + flick * 0.035);

    // -- shared breathing: ONE wave, ~5.5s per breath, both figures --
    const breath = Math.sin(t * ((Math.PI * 2) / 5.5));
    const lift = (breath * 0.5 + 0.5) * 3.2; // 0..3.2 px of rise
    left.breathe(lift);
    right.breathe(lift); // identical lift — perfectly in sync
  };

  // ------------------------------------------------------------------
  //  TEARDOWN — destroy every object + tween, plus the figure
  //  containers (which destroy their children with them).
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
