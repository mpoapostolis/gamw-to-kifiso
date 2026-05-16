/**
 * ΑΚΟΜΑ ΕΓΩ — tableau: "Το ταξίδι" (The Journey).
 *
 * The outbound train, at dusk. She is leaving.
 *
 * We see the carriage from behind: the back of a lone seated woman, her
 * head tipped against the cold glass, watching a dusk landscape unspool
 * past her. The land slides — a far hill, a nearer field, telegraph poles
 * ticking by one slow beat at a time — and the sky behind it holds the
 * last of the day's amber, with deep blue pressing down from above.
 *
 * Nothing in this picture hurries. The only motion is the world leaving,
 * and her, sitting still inside it, being carried.
 *
 * --------------------------------------------------------------------
 * This file also owns the SHARED carriage helper (`buildCarriage`) used
 * by `trainBack.ts` — the return train re-uses the exact same interior
 * geometry and seated figure, only re-lit for night. Keeping the helper
 * here (rather than a third file) means the two tableaux that are "the
 * same woman at the same window" literally share their bones.
 */
import Phaser from "phaser";
import { VIEW_W, VIEW_H } from "../../../consts";
import { PAL, shade, mix } from "../../../palette";
import type { TableauHandle } from "../../../still/tableau";

/* ====================================================================
 * SHARED CARRIAGE GEOMETRY
 * ==================================================================== */

/**
 * The window cut-out, in screen coordinates. Both tableaux draw their
 * landscape / reflection clipped to exactly this rectangle, and the
 * carriage interior frames it. Defined once so the two pictures register.
 */
export const WIN = {
  x: 196,
  y: 96,
  w: 760,
  h: 470,
} as const;

/** Everything `buildCarriage` produced, so callers can depth-order + dispose. */
export interface CarriageParts {
  /** Objects to destroy on teardown (frame, walls, figure, seat...). */
  objects: Phaser.GameObjects.GameObject[];
  /** Tweens to stop on teardown (the figure's slow sway). */
  tweens: Phaser.Tweens.Tween[];
}

/**
 * Draw the train carriage interior + the seated woman seen from behind.
 *
 * Shared by both train tableaux. The caller is responsible for drawing
 * the WINDOW CONTENTS (landscape or reflection) BEFORE calling this, at a
 * lower depth — `buildCarriage` lays the interior on top so the window
 * frame, muntins and figure correctly occlude the view.
 *
 * @param scene  host scene
 * @param chill  0..1 cool-down; mutes the warm timber toward grey
 * @param baseDepth  depth the interior sits at (window art should be below)
 */
export function buildCarriage(
  scene: Phaser.Scene,
  chill: number,
  baseDepth: number,
): CarriageParts {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];

  // The carriage timber, cooled by `chill`. On the outbound dusk run this
  // stays warm wood; on the night return it drains toward blue-grey.
  const wood = mix(PAL.woodMid, PAL.gloomMid, chill * 0.7);
  const woodDk = mix(PAL.woodDark, PAL.night, chill * 0.6);
  const woodHi = mix(PAL.woodHi, PAL.gloomMid, chill * 0.55);

  // ---- INTERIOR WALLS — they pinch in from the screen edges, framing
  // the window like the inside of a tunnel. -----------------------------
  const walls = scene.add.graphics().setDepth(baseDepth);
  objects.push(walls);

  // back-of-carriage panelling visible above and below the window
  walls.fillStyle(woodDk, 1);
  walls.fillRect(0, 0, VIEW_W, WIN.y - 18); // ceiling band
  walls.fillRect(0, WIN.y + WIN.h + 18, VIEW_W, VIEW_H - (WIN.y + WIN.h + 18));
  // a soft highlight seam along the ceiling band's lower edge
  walls.fillStyle(shade(woodDk, 0.18), 0.5);
  walls.fillRect(0, WIN.y - 22, VIEW_W, 4);

  // left side wall — a near-black wedge, the dark of the aisle side
  walls.fillStyle(shade(woodDk, -0.35), 1);
  walls.fillTriangle(0, 0, WIN.x - 30, 0, 0, VIEW_H);
  walls.fillTriangle(WIN.x - 30, 0, WIN.x - 30, VIEW_H, 0, VIEW_H);
  // right side wall — likewise, behind the figure's shoulder
  const rWallX = WIN.x + WIN.w + 30;
  walls.fillStyle(shade(woodDk, -0.28), 1);
  walls.fillRect(rWallX, 0, VIEW_W - rWallX, VIEW_H);

  // wainscot panel lines on the lower interior band — quiet repetition
  walls.lineStyle(1, shade(woodDk, -0.4), 0.55);
  for (let x = 40; x < VIEW_W; x += 96) {
    walls.lineBetween(x, WIN.y + WIN.h + 26, x, VIEW_H - 30);
  }

  // ---- THE WINDOW FRAME — heavy timber surround + a single muntin -----
  const frame = scene.add.graphics().setDepth(baseDepth + 1);
  objects.push(frame);
  const lip = 18; // frame thickness
  // outer frame slab
  frame.fillStyle(wood, 1);
  frame.fillRoundedRect(
    WIN.x - lip,
    WIN.y - lip,
    WIN.w + lip * 2,
    WIN.h + lip * 2,
    6,
  );
  // inner bevel — a lit top/left edge, shadowed bottom/right
  frame.fillStyle(woodHi, 0.7);
  frame.fillRect(WIN.x - lip, WIN.y - lip, WIN.w + lip * 2, 4);
  frame.fillRect(WIN.x - lip, WIN.y - lip, 4, WIN.h + lip * 2);
  frame.fillStyle(shade(woodDk, -0.3), 0.8);
  frame.fillRect(WIN.x - lip, WIN.y + WIN.h + lip - 4, WIN.w + lip * 2, 4);
  frame.fillRect(WIN.x + WIN.w + lip - 4, WIN.y - lip, 4, WIN.h + lip * 2);
  // a thin sill ledge below the glass
  frame.fillStyle(shade(wood, -0.12), 1);
  frame.fillRect(WIN.x - lip - 6, WIN.y + WIN.h + lip, WIN.w + lip * 2 + 12, 12);
  // a single horizontal muntin a third of the way down — divides the view
  frame.fillStyle(wood, 1);
  frame.fillRect(WIN.x - 2, WIN.y + WIN.h * 0.34, WIN.w + 4, 9);
  frame.fillStyle(woodHi, 0.45);
  frame.fillRect(WIN.x - 2, WIN.y + WIN.h * 0.34, WIN.w + 4, 2);

  // ---- THE SEAT BACK — a tall padded rectangle, right-of-centre, that
  // the figure leans against. Draws just under the figure. --------------
  const seatX = WIN.x + WIN.w * 0.5;
  const seatW = 360;
  const seatTop = WIN.y + WIN.h * 0.16;
  const seat = scene.add.graphics().setDepth(baseDepth + 2);
  objects.push(seat);
  const seatCol = mix(0x4a3a52, PAL.gloom, chill * 0.6); // dusty upholstery
  seat.fillStyle(shade(seatCol, -0.25), 1);
  seat.fillRoundedRect(seatX, seatTop, seatW, VIEW_H - seatTop, 22);
  // a band of piping along the seat-back's crown
  seat.fillStyle(shade(seatCol, 0.12), 0.85);
  seat.fillRoundedRect(seatX, seatTop, seatW, 26, 13);
  // two vertical seam tucks down the upholstery — soft, repetitive
  seat.lineStyle(2, shade(seatCol, -0.4), 0.5);
  seat.lineBetween(seatX + seatW * 0.36, seatTop + 30, seatX + seatW * 0.36, VIEW_H);
  seat.lineBetween(seatX + seatW * 0.66, seatTop + 30, seatX + seatW * 0.66, VIEW_H);

  // ---- THE FIGURE — the narrator, seen from BEHIND. ------------------
  // She is built inside a container so a single slow tween can rock the
  // whole of her a degree or two: the train's gentle sway, nothing more.
  const figX = seatX + seatW * 0.5;
  const figBaseY = VIEW_H - 4;
  const figure = scene.add.container(figX, figBaseY).setDepth(baseDepth + 3);
  objects.push(figure);

  const fg = scene.add.graphics();
  figure.add(fg);

  // colours: a warm coat and dark hair, both pulled toward cold by chill
  const coat = mix(PAL.cloak, PAL.gloomMid, chill * 0.65);
  const coatDk = mix(PAL.cloakDark, PAL.night, chill * 0.5);
  const coatHi = mix(PAL.cloakHi, PAL.gloomHi, chill * 0.55);
  const hairCol = mix(PAL.hair, PAL.gloom, chill * 0.55);

  // torso / shoulders — a broad rounded trapezoid rising from the seat
  fg.fillStyle(coatDk, 1);
  fg.fillRoundedRect(-150, -300, 300, 320, 40);
  fg.fillStyle(coat, 1);
  fg.fillRoundedRect(-138, -296, 276, 300, 36);
  // a soft lit edge down the window side (left) of the coat
  fg.fillStyle(coatHi, 0.4);
  fg.fillRoundedRect(-138, -296, 30, 300, 14);
  // the shoulder line — a gentle highlight arc
  fg.fillStyle(coatHi, 0.3);
  fg.fillRoundedRect(-120, -300, 240, 26, 13);

  // the back of the head — tilted slightly toward the window (left)
  fg.fillStyle(hairCol, 1);
  fg.fillCircle(-26, -360, 88);
  // hair falling onto the shoulders / nape
  fg.fillStyle(shade(hairCol, -0.2), 1);
  fg.fillRoundedRect(-104, -360, 156, 130, 50);
  // a thin sheen on the crown of the hair
  fg.fillStyle(shade(hairCol, 0.22), 0.5);
  fg.fillEllipse(-46, -402, 70, 40);

  // the slow sway of the carriage — she rocks a hair around her seated
  // base. yoyo + sine easing keeps it hypnotic and never mechanical.
  const sway = scene.tweens.add({
    targets: figure,
    angle: { from: -1.1, to: 1.1 },
    duration: 5200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
  tweens.push(sway);

  return { objects, tweens };
}

/* ====================================================================
 * TABLEAU: buildJourney — the outbound dusk train
 * ==================================================================== */

export function buildJourney(scene: Phaser.Scene, chill: number): TableauHandle {
  // Everything we make, tracked for a clean teardown.
  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];

  // ---- BASE DEPTHS ----------------------------------------------------
  // Window art sits low; the carriage interior frames it from D_FRAME up.
  const D_SKY = 10;
  const D_LAND = 20;
  const D_GLASS = 40; // the faint reflection film on the glass
  const D_FRAME = 60; // buildCarriage lays interior at D_FRAME and up

  // ---- 1. THE SKY INSIDE THE WINDOW — a dusk gradient ----------------
  // Warm amber sits low on the horizon; deep blue presses from the top.
  // We band it: many thin horizontal fills blended top->bottom so the
  // gradient is smooth without needing a texture.
  const sky = scene.add.graphics().setDepth(D_SKY);
  objects.push(sky);
  const skyTop = mix(PAL.nightSky, PAL.night, 0.35); // deep dusk blue
  const skyHorizon = mix(PAL.ember, PAL.emberDeep, 0.35); // amber band
  const horizonY = WIN.y + WIN.h * 0.66; // where land meets sky
  const bands = 48;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    // ease the colour so amber clings near the horizon, blue dominates up
    const c = mix(skyTop, skyHorizon, Math.pow(t, 1.7));
    sky.fillStyle(c, 1);
    const y0 = WIN.y + (horizonY - WIN.y) * t;
    const y1 = WIN.y + (horizonY - WIN.y) * ((i + 1) / bands);
    sky.fillRect(WIN.x, y0, WIN.w, y1 - y0 + 1.5);
  }
  // a low, soft sun-bloom hugging the horizon, just left of centre
  const sunGlow = scene.add
    .image(WIN.x + WIN.w * 0.34, horizonY - 12, "glow_warm")
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(D_SKY + 1)
    .setScale(3.4, 1.8)
    .setAlpha(0.5 * (1 - chill * 0.5));
  objects.push(sunGlow);
  // the ground below the horizon — a flat dim field colour the silhouette
  // bands will sit against
  const ground = scene.add.graphics().setDepth(D_SKY + 2);
  objects.push(ground);
  ground.fillStyle(mix(PAL.grassDeep, PAL.night, 0.55 + chill * 0.2), 1);
  ground.fillRect(WIN.x, horizonY, WIN.w, WIN.y + WIN.h - horizonY);

  // ---- 2. THE SCROLLING LANDSCAPE ------------------------------------
  // Three silhouette layers, each drawn TWICE the window's width so it can
  // wrap seamlessly. Each layer scrolls left at its own slow speed —
  // parallax: the far hill barely moves, the poles tick briskly past.
  //
  // Each layer is a Graphics object positioned at WIN.x; in update() we
  // slide its `x` left and wrap it by one window-width.

  interface ScrollLayer {
    g: Phaser.GameObjects.Graphics;
    speed: number; // px per second, leftward
    span: number; // wrap distance (one window width)
  }
  const layers: ScrollLayer[] = [];
  const span = WIN.w;

  // -- far layer: a low rolling hill line, almost on the horizon --
  {
    const g = scene.add.graphics().setDepth(D_LAND);
    objects.push(g);
    const hillCol = mix(PAL.roofDark, PAL.night, 0.45 + chill * 0.2);
    g.fillStyle(hillCol, 1);
    // draw across 2× width so the wrap is seamless
    for (let tile = 0; tile < 2; tile++) {
      const ox = tile * span;
      // a gentle hand-drawn ridge: sample a sine + a slower sine
      g.beginPath();
      g.moveTo(ox, horizonY + 40);
      const steps = 40;
      for (let s = 0; s <= steps; s++) {
        const px = ox + (s / steps) * span;
        const ph = (s / steps) * Math.PI * 2;
        const ridge =
          horizonY -
          18 -
          Math.sin(ph * 1.0) * 16 -
          Math.sin(ph * 2.3 + 1.1) * 7;
        g.lineTo(px, ridge);
      }
      g.lineTo(ox + span, horizonY + 40);
      g.closePath();
      g.fillPath();
    }
    layers.push({ g, speed: 7, span });
  }

  // -- mid layer: a nearer field edge — a hedgerow line, taller --
  {
    const g = scene.add.graphics().setDepth(D_LAND + 1);
    objects.push(g);
    const fieldCol = mix(PAL.grassDeep, PAL.night, 0.3 + chill * 0.18);
    g.fillStyle(fieldCol, 1);
    for (let tile = 0; tile < 2; tile++) {
      const ox = tile * span;
      g.beginPath();
      g.moveTo(ox, WIN.y + WIN.h);
      const steps = 32;
      for (let s = 0; s <= steps; s++) {
        const px = ox + (s / steps) * span;
        const ph = (s / steps) * Math.PI * 2;
        const top =
          horizonY +
          18 -
          Math.abs(Math.sin(ph * 1.5 + 0.6)) * 26 -
          Math.sin(ph * 4.0) * 5;
        g.lineTo(px, top);
      }
      g.lineTo(ox + span, WIN.y + WIN.h);
      g.closePath();
      g.fillPath();
      // a few darker tree-clumps lifting off the hedge line
      g.fillStyle(shade(fieldCol, -0.3), 1);
      for (let k = 0; k < 4; k++) {
        const tx = ox + span * (0.12 + k * 0.26);
        const ty = horizonY + 6;
        g.fillCircle(tx, ty, 22);
        g.fillCircle(tx + 20, ty + 6, 16);
      }
      g.fillStyle(fieldCol, 1);
    }
    layers.push({ g, speed: 18, span });
  }

  // -- near layer: telegraph poles — the hypnotic tick of the journey --
  {
    const g = scene.add.graphics().setDepth(D_LAND + 2);
    objects.push(g);
    const poleCol = mix(PAL.woodDark, PAL.night, 0.4 + chill * 0.2);
    const poleBaseY = horizonY + 30; // poles plant just past the horizon
    const poleTopY = WIN.y + WIN.h * 0.2;
    const poleGap = span / 3; // three poles per window width => steady tick
    for (let tile = 0; tile < 2; tile++) {
      const ox = tile * span;
      for (let p = 0; p < 3; p++) {
        const px = ox + poleGap * (p + 0.5);
        g.fillStyle(poleCol, 1);
        // the post
        g.fillRect(px - 4, poleTopY, 8, poleBaseY - poleTopY);
        // the cross-arm
        g.fillRect(px - 26, poleTopY + 14, 52, 7);
        g.fillRect(px - 20, poleTopY + 30, 40, 6);
        // a slack wire dipping toward the next pole (drawn as a thin arc)
        g.lineStyle(2, shade(poleCol, 0.15), 0.55);
        const nextX = px + poleGap;
        g.beginPath();
        g.moveTo(px, poleTopY + 18);
        g.lineTo((px + nextX) / 2, poleTopY + 40);
        g.lineTo(nextX, poleTopY + 18);
        g.strokePath();
      }
    }
    // poles tick past briskly-but-calmly — fastest of the three layers
    layers.push({ g, speed: 84, span });
  }

  // give every layer a starting x at the window's left edge
  for (const l of layers) l.g.setX(WIN.x);

  // ---- 3. THE GLASS — a faint warm reflection of the carriage --------
  // A translucent film over the whole window: warm interior light caught
  // on the pane, plus a couple of soft diagonal smears (the ceiling lamp).
  const glass = scene.add.graphics().setDepth(D_GLASS);
  objects.push(glass);
  const reflWarm = mix(PAL.ember, PAL.gloomMid, chill);
  glass.fillStyle(reflWarm, 0.06);
  glass.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  // a faint ghost of the warm ceiling lamp, smeared diagonally on the glass
  glass.fillStyle(PAL.emberSoft, 0.05 * (1 - chill * 0.5));
  glass.fillEllipse(WIN.x + WIN.w * 0.7, WIN.y + WIN.h * 0.3, 320, 90);
  // a soft hint of the figure's shoulder mirrored low-right on the pane
  glass.fillStyle(mix(PAL.cloak, PAL.night, 0.4), 0.07);
  glass.fillEllipse(WIN.x + WIN.w * 0.78, WIN.y + WIN.h * 0.86, 260, 200);
  // two thin diagonal light-streaks — the gleam of a tube light on glass
  glass.fillStyle(PAL.emberHot, 0.04);
  glass.fillTriangle(
    WIN.x + WIN.w * 0.1, WIN.y,
    WIN.x + WIN.w * 0.18, WIN.y,
    WIN.x - 40, WIN.y + WIN.h,
  );

  // ---- 4. THE CARRIAGE — shared interior + the seated woman ----------
  const carriage = buildCarriage(scene, chill, D_FRAME);
  objects.push(...carriage.objects);
  tweens.push(...carriage.tweens);

  // ---- 5. A LOW VIGNETTE — settle the eye toward the window ----------
  const vign = scene.add.graphics().setDepth(D_FRAME + 10);
  objects.push(vign);
  vign.fillStyle(PAL.void, 0.3);
  vign.fillRect(0, 0, VIEW_W, 40);
  vign.fillRect(0, VIEW_H - 50, VIEW_W, 50);

  /* ---- per-frame: scroll the world past the window ------------------ */
  const update = (_time: number, delta: number): void => {
    const dt = delta / 1000;
    for (const l of layers) {
      // slide left; wrap by one window-width so the doubled draw is seamless
      let nx = l.g.x - l.speed * dt;
      if (nx <= WIN.x - l.span) nx += l.span;
      l.g.setX(nx);
    }
  };

  /* ---- teardown: stop every tween, destroy every object ------------- */
  const destroy = (): void => {
    for (const t of tweens) t.stop();
    for (const o of objects) o.destroy();
    tweens.length = 0;
    objects.length = 0;
  };

  return { update, destroy };
}
