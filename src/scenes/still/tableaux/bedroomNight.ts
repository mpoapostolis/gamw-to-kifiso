/**
 * ΑΚΟΜΑ ΕΓΩ — tableau: "bedroom_night" (Chapter 1).
 *
 * A bedroom at night, seen slightly from above. Aris is asleep under the
 * blanket. Nothing happens here — that is the point. The room is warm and
 * dark and breathing. The only sharp thing in the world is the phone on
 * the nightstand: a small cold-blue rectangle that will, in a moment,
 * light up and change everything. But not yet. For now he just breathes.
 *
 * The room geometry is shared with the final chapter ("home_end"), which
 * is the SAME room drained of all its warmth. To keep the two tableaux
 * truthfully identical, the drawing logic lives in `buildBedroomRoom`
 * below and is exported for `homeEnd.ts` to reuse.
 *
 * Drawn entirely with Phaser Graphics + a couple of additive glow images.
 * No assets, no sprites. Everything sits at depth < 1000 so the story
 * text (depth 9000+) always reads on top.
 */
import type { TableauHandle } from "../../../still/tableau";
import { VIEW_W, VIEW_H } from "../../../consts";
import { PAL, shade, mix } from "../../../palette";

/* ------------------------------------------------------------------ *
 * Shared room model
 * ------------------------------------------------------------------ */

/**
 * The breathing handle returned by the shared room builder. It carries a
 * little more than the public `TableauHandle` so the two callers can
 * layer their own per-frame behaviour (the chill fade in `homeEnd`)
 * on top of the room's own slow life.
 */
export interface BedroomRoom {
  /** Every game object the room created, for a clean teardown. */
  objects: Phaser.GameObjects.GameObject[];
  /** Every tween the room owns — killed on destroy. */
  tweens: Phaser.Tweens.Tween[];
  /** Advance the room's living motion (Aris breathing). */
  update: (time: number, delta: number) => void;
  /** Destroy every object + tween the room created. */
  destroy: () => void;
}

/**
 * Options that let the same room read as a warm "night" or a drained
 * "end". `chill` 0 → 1 cools the whole palette; `monoStrength` pulls
 * every colour toward a neutral grey (the end chapter is nearly
 * monochrome); `warmLight` toggles whether the window/phone glows feel
 * warm-adjacent or purely cold-grey.
 */
export interface BedroomOptions {
  chill: number;
  /** 0 = full colour, 1 = collapse toward grey. Default scales with chill. */
  monoStrength?: number;
  /** Whether to add the warm additive bloom over the room. Default true. */
  warmGlow?: boolean;
}

/**
 * Build the bedroom geometry. Returns a {@link BedroomRoom} the two
 * chapter tableaux wrap. The room breathes on its own; callers add any
 * extra behaviour (e.g. the slow fade-to-black) around `update`.
 */
export function buildBedroomRoom(
  scene: Phaser.Scene,
  opts: BedroomOptions,
): BedroomRoom {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];

  const chill = Phaser.Math.Clamp(opts.chill, 0, 1);
  const mono = Phaser.Math.Clamp(opts.monoStrength ?? chill, 0, 1);
  const warmGlow = opts.warmGlow ?? true;

  // A neutral grey the whole room collapses toward in the end chapter.
  const ASH = 0x2a2730;

  /**
   * Palette pipeline: cool a warm colour toward night, then drain it
   * toward ash. Every colour in the room passes through here so the
   * warm-room and drained-room share one consistent logic.
   */
  const tone = (warm: number): number => {
    const cooled = mix(warm, PAL.night, chill * 0.55);
    return mix(cooled, ASH, mono * 0.82);
  };

  /* --- floor + back wall ------------------------------------------ */
  // The room is seen slightly from above: the back wall takes the upper
  // ~46% of the frame, the floor rakes away below it.
  const wallBottom = VIEW_H * 0.46;

  const room = scene.add.graphics();
  room.setDepth(40);
  objects.push(room);

  // Back wall — warm dark brown, a soft top-to-floor gradient faked with
  // three stacked bands so the skirting reads darker.
  room.fillStyle(tone(shade(PAL.woodMid, -0.32)), 1);
  room.fillRect(0, 0, VIEW_W, wallBottom);
  room.fillStyle(tone(shade(PAL.woodMid, -0.42)), 1);
  room.fillRect(0, wallBottom - 26, VIEW_W, 26); // skirting board

  // Floor — darker still, raked toward the camera.
  room.fillStyle(tone(shade(PAL.woodDark, -0.18)), 1);
  room.fillRect(0, wallBottom, VIEW_W, VIEW_H - wallBottom);
  // A few faint floorboard seams running into the room.
  room.lineStyle(2, tone(shade(PAL.woodDark, -0.4)), 0.5);
  for (let i = 1; i < 6; i++) {
    const fx = (VIEW_W / 6) * i;
    room.lineBetween(fx, wallBottom, fx + (fx - VIEW_W / 2) * 0.22, VIEW_H);
  }

  /* --- corner shadow / vignette ----------------------------------- */
  // A dark rectangle "ring": four thick bands around the edge, low alpha,
  // so the corners sink into gloom without a real radial mask.
  const vig = scene.add.graphics();
  vig.setDepth(720);
  objects.push(vig);
  const vigCol = mix(PAL.void, ASH, mono * 0.5);
  const band = 150;
  vig.fillStyle(vigCol, 0.5);
  vig.fillRect(0, 0, VIEW_W, band); // top
  vig.fillStyle(vigCol, 0.62);
  vig.fillRect(0, VIEW_H - band, VIEW_W, band); // bottom
  vig.fillStyle(vigCol, 0.46);
  vig.fillRect(0, 0, band, VIEW_H); // left
  vig.fillRect(VIEW_W - band, 0, band, VIEW_H); // right
  // Heavier blot in each corner so they truly fall away.
  vig.fillStyle(vigCol, 0.4);
  vig.fillRect(0, 0, band * 1.5, band * 1.5);
  vig.fillRect(VIEW_W - band * 1.5, 0, band * 1.5, band * 1.5);
  vig.fillRect(0, VIEW_H - band * 1.5, band * 1.5, band * 1.5);
  vig.fillRect(VIEW_W - band * 1.5, VIEW_H - band * 1.5, band * 1.5, band * 1.5);

  /* --- window + moonlight ----------------------------------------- */
  // Upper-right of the back wall. Pale cold blue — moonlight is the one
  // thing in the room the warmth never reached.
  const winX = VIEW_W * 0.6;
  const winY = VIEW_H * 0.08;
  const winW = VIEW_W * 0.26;
  const winH = wallBottom - winY - 40;

  // Moon colour: gloomGlow is a soft moonlight blue. In the end chapter
  // it greys out like everything else but never goes warm.
  const moonCol = mix(PAL.gloomGlow, ASH, mono * 0.78);
  const moonPale = mix(PAL.gloomHi, ASH, mono * 0.72);

  const win = scene.add.graphics();
  win.setDepth(60);
  objects.push(win);
  // Frame.
  win.fillStyle(tone(shade(PAL.woodDark, -0.05)), 1);
  win.fillRect(winX - 10, winY - 10, winW + 20, winH + 20);
  // Glass — cold blue, slightly graded.
  win.fillStyle(shade(moonCol, -0.4), 1);
  win.fillRect(winX, winY, winW, winH);
  win.fillStyle(moonCol, 0.55);
  win.fillRect(winX, winY, winW, winH * 0.62); // upper glass catches more sky
  // A pale wash at the very top — the brightest sliver of night sky.
  win.fillStyle(moonPale, 0.35);
  win.fillRect(winX, winY, winW, winH * 0.2);
  // Mullion cross.
  win.fillStyle(tone(shade(PAL.woodDark, 0.04)), 1);
  win.fillRect(winX + winW / 2 - 4, winY, 8, winH);
  win.fillRect(winX, winY + winH / 2 - 4, winW, 8);

  // The faint parallelogram of moonlight thrown onto the floor — skewed
  // because the light enters at an angle. Drawn as a filled polygon.
  const moonPool = scene.add.graphics();
  moonPool.setDepth(50);
  objects.push(moonPool);
  const poolTopY = wallBottom + 8;
  const poolBotY = VIEW_H - 70;
  moonPool.fillStyle(moonCol, 0.1);
  moonPool.beginPath();
  moonPool.moveTo(winX + winW * 0.05, poolTopY);
  moonPool.lineTo(winX + winW * 0.95, poolTopY);
  moonPool.lineTo(winX + winW * 0.62, poolBotY);
  moonPool.lineTo(winX - winW * 0.34, poolBotY);
  moonPool.closePath();
  moonPool.fillPath();

  /* --- bed + sleeping Aris ---------------------------------------- */
  // Lower-left. The bed sits at an angle into the room; Aris is a soft
  // rounded lump under the blanket with his head on the pillow.
  const bedCX = VIEW_W * 0.3;
  const bedCY = VIEW_H * 0.7;
  const bedW = VIEW_W * 0.42;
  const bedH = VIEW_H * 0.34;

  // The bed frame + base — static, on its own graphics.
  const bed = scene.add.graphics();
  bed.setDepth(100);
  objects.push(bed);
  // Drop shadow on the floor under the bed.
  bed.fillStyle(mix(PAL.void, ASH, mono * 0.5), 0.45);
  bed.fillEllipse(bedCX, bedCY + bedH * 0.5, bedW * 1.08, bedH * 0.42);
  // Wooden frame.
  bed.fillStyle(tone(PAL.woodDark), 1);
  bed.fillRoundedRect(
    bedCX - bedW / 2,
    bedCY - bedH / 2,
    bedW,
    bedH,
    14,
  );
  // Mattress — slightly inset, a touch lighter.
  bed.fillStyle(tone(shade(PAL.woodMid, 0.08)), 1);
  bed.fillRoundedRect(
    bedCX - bedW / 2 + 12,
    bedCY - bedH / 2 + 8,
    bedW - 24,
    bedH - 28,
    10,
  );

  // The pillow — top of the bed (head end is upper-left).
  const pillowX = bedCX - bedW * 0.3;
  const pillowY = bedCY - bedH * 0.22;
  bed.fillStyle(tone(shade(PAL.thatch, -0.06)), 1);
  bed.fillEllipse(pillowX, pillowY, bedW * 0.3, bedH * 0.32);

  /**
   * Aris breathing.
   *
   * The figure (the blanket lump + head) is drawn fresh every frame onto
   * its own graphics so the breath can move it without redraw artefacts.
   * Breath is a slow sine, ~4s period, riding `breathPhase`. We move the
   * whole body a few px and let the chest bulge a hair more than the head
   * — the difference between a body breathing and a body just bobbing.
   */
  const figure = scene.add.graphics();
  figure.setDepth(110);
  objects.push(figure);

  const blanketCol = tone(PAL.woodMid);
  const blanketHi = tone(shade(PAL.woodMid, 0.16));
  const skinCol = tone(mix(PAL.skin, PAL.skinDark, 0.35 + chill * 0.3));
  const hairCol = tone(PAL.hair);
  const shadowCol = mix(PAL.void, ASH, mono * 0.5);

  // Where the body's mass sits — chest a little right of the pillow.
  const bodyX = bedCX + bedW * 0.04;
  const bodyY = bedCY + bedH * 0.04;
  const headX = pillowX + bedW * 0.02;
  const headY = pillowY - bedH * 0.04;

  /** Redraw Aris with a given breath offset (px) and chest swell (0..1). */
  const drawAris = (lift: number, swell: number): void => {
    figure.clear();

    // Soft contact shadow the blanket casts on the mattress.
    figure.fillStyle(shadowCol, 0.4);
    figure.fillEllipse(bodyX, bodyY + bedH * 0.2, bedW * 0.62, bedH * 0.3);

    // The blanket lump — one big rounded body shape, plus a raised chest
    // ellipse that swells slightly more on the inhale.
    figure.fillStyle(blanketCol, 1);
    figure.fillEllipse(
      bodyX,
      bodyY - lift,
      bedW * 0.66,
      bedH * 0.5 + swell * 4,
    );
    // Hip/leg taper toward the foot of the bed (lower-right).
    figure.fillEllipse(
      bodyX + bedW * 0.22,
      bodyY + bedH * 0.12 - lift * 0.6,
      bedW * 0.4,
      bedH * 0.34,
    );
    // Chest highlight — catches what little light there is; rises most.
    figure.fillStyle(blanketHi, 0.85);
    figure.fillEllipse(
      bodyX - bedW * 0.04,
      bodyY - bedH * 0.1 - lift * 1.25,
      bedW * 0.3,
      bedH * 0.2 + swell * 4,
    );
    // A fold line of the blanket near the shoulder.
    figure.lineStyle(3, shade(blanketCol, -0.3), 0.6);
    figure.beginPath();
    figure.moveTo(bodyX - bedW * 0.22, bodyY - lift);
    figure.lineTo(bodyX + bedW * 0.16, bodyY + bedH * 0.06 - lift * 0.7);
    figure.strokePath();

    // The head — resting on the pillow, rises only a touch with the breath.
    const headLift = lift * 0.45;
    // Hair / back of the head.
    figure.fillStyle(hairCol, 1);
    figure.fillEllipse(
      headX,
      headY - headLift,
      bedW * 0.17,
      bedH * 0.21,
    );
    // The face — a soft crescent of skin, turned half toward the room.
    figure.fillStyle(skinCol, 1);
    figure.fillEllipse(
      headX + bedW * 0.035,
      headY + bedH * 0.012 - headLift,
      bedW * 0.115,
      bedH * 0.165,
    );
    // Cheek shadow so the head reads round, not flat.
    figure.fillStyle(shade(skinCol, -0.35), 0.5);
    figure.fillEllipse(
      headX - bedW * 0.03,
      headY + bedH * 0.03 - headLift,
      bedW * 0.07,
      bedH * 0.1,
    );
  };

  // Initial pose — mid-breath.
  drawAris(0, 0.5);

  /* --- nightstand + phone ----------------------------------------- */
  // Beside the bed, head end (left of the pillow). On it: the phone.
  const nsX = bedCX - bedW * 0.62;
  const nsY = bedCY - bedH * 0.12;
  const nsW = VIEW_W * 0.1;
  const nsH = VIEW_H * 0.16;

  const stand = scene.add.graphics();
  stand.setDepth(105);
  objects.push(stand);
  // Floor shadow.
  stand.fillStyle(shadowCol, 0.4);
  stand.fillEllipse(nsX, nsY + nsH * 0.52, nsW * 1.2, nsH * 0.26);
  // Cabinet body.
  stand.fillStyle(tone(shade(PAL.woodDark, 0.06)), 1);
  stand.fillRoundedRect(nsX - nsW / 2, nsY - nsH / 2, nsW, nsH, 6);
  // Top surface — a slightly lighter lip so the tabletop reads.
  stand.fillStyle(tone(shade(PAL.woodMid, 0.05)), 1);
  stand.fillRoundedRect(nsX - nsW / 2 - 4, nsY - nsH / 2 - 8, nsW + 8, 16, 5);
  // A single drawer line + knob.
  stand.lineStyle(2, tone(shade(PAL.woodDark, -0.3)), 0.7);
  stand.lineBetween(
    nsX - nsW / 2 + 6,
    nsY,
    nsX + nsW / 2 - 6,
    nsY,
  );
  stand.fillStyle(tone(shade(PAL.woodMid, 0.18)), 1);
  stand.fillCircle(nsX, nsY + nsH * 0.18, 3);

  // The phone — the only sharp light source in the room. A small
  // rounded rectangle lying on the nightstand, screen-up, glowing a
  // faint cold blue. It pulses very slightly (a breathing standby glow).
  const phoneX = nsX + nsW * 0.05;
  const phoneY = nsY - nsH * 0.46;
  const phoneW = nsW * 0.46;
  const phoneH = nsW * 0.86;

  const phone = scene.add.graphics();
  phone.setDepth(120);
  objects.push(phone);

  // The phone's cold light bloom — an additive image so it actually
  // spills onto the wood. Even in the end chapter the phone stays cold,
  // never warm; but it does dim with `mono`.
  const phoneGlow = scene.add.image(phoneX, phoneY, "glow_violet");
  phoneGlow.setBlendMode(Phaser.BlendModes.ADD);
  phoneGlow.setDepth(118);
  phoneGlow.setScale(0.95);
  phoneGlow.setAlpha(0.32 * (1 - mono * 0.55));
  objects.push(phoneGlow);

  /** Phone screen colour — kept cold regardless of room warmth. */
  const screenCol = mix(PAL.gloomGlow, 0xffffff, 0.25);
  const screenColDim = mix(screenCol, ASH, mono * 0.6);

  /** Redraw the phone with a given screen brightness (0..1). */
  const drawPhone = (bright: number): void => {
    phone.clear();
    // Casing.
    phone.fillStyle(tone(shade(PAL.woodDark, -0.5)), 1);
    phone.fillRoundedRect(
      phoneX - phoneW / 2 - 3,
      phoneY - phoneH / 2 - 3,
      phoneW + 6,
      phoneH + 6,
      5,
    );
    // Screen — cold blue, brightness pulses.
    phone.fillStyle(screenColDim, 0.4 + bright * 0.6);
    phone.fillRoundedRect(
      phoneX - phoneW / 2,
      phoneY - phoneH / 2,
      phoneW,
      phoneH,
      4,
    );
    // A brighter inner core so the screen feels lit, not painted.
    phone.fillStyle(mix(screenColDim, 0xffffff, 0.3), bright * 0.5);
    phone.fillRoundedRect(
      phoneX - phoneW * 0.3,
      phoneY - phoneH * 0.34,
      phoneW * 0.6,
      phoneH * 0.68,
      3,
    );
  };
  drawPhone(0.5);

  /* --- warm ambient bloom ----------------------------------------- */
  // A single big warm additive glow low in the room — the leftover heat
  // of a lived-in space. The end chapter switches this off (warmGlow
  // false) so nothing warm survives.
  if (warmGlow) {
    const warm = scene.add.image(
      VIEW_W * 0.42,
      VIEW_H * 0.6,
      "glow_warm",
    );
    warm.setBlendMode(Phaser.BlendModes.ADD);
    warm.setDepth(30);
    warm.setScale(4.4, 3.2);
    warm.setAlpha(0.16 * (1 - chill * 0.7));
    objects.push(warm);
  }

  /* --- living motion ---------------------------------------------- */
  // `update` is driven by the chapter tableau. We track elapsed time
  // ourselves rather than trust `time` (the StoryScene may pass a clock
  // that does not start at zero).
  let elapsed = 0;
  const BREATH_PERIOD = 4000; // ms — a slow, sleeping breath
  const PHONE_PERIOD = 5200; // ms — the standby glow, slightly off-tempo

  const update = (_time: number, delta: number): void => {
    elapsed += delta;

    // Breath: a slow sine. `lift` raises the body a few px; `swell`
    // (offset so it never goes flat-negative) bulges the chest.
    const bPhase = (elapsed / BREATH_PERIOD) * Math.PI * 2;
    const lift = (Math.sin(bPhase) * 0.5 + 0.5) * 6; // 0..6 px
    const swell = Math.sin(bPhase) * 0.5 + 0.5; // 0..1
    drawAris(lift, swell);

    // Phone: a very faint pulse, never fully off.
    const pPhase = (elapsed / PHONE_PERIOD) * Math.PI * 2;
    const bright = 0.55 + Math.sin(pPhase) * 0.18;
    drawPhone(bright);
    phoneGlow.setScale(0.92 + Math.sin(pPhase) * 0.05);
  };

  /* --- teardown --------------------------------------------------- */
  const destroy = (): void => {
    for (const t of tweens) t.stop();
    tweens.length = 0;
    for (const o of objects) o.destroy();
    objects.length = 0;
  };

  return { objects, tweens, update, destroy };
}

/* ------------------------------------------------------------------ *
 * Chapter 1 tableau — "bedroom_night"
 * ------------------------------------------------------------------ */

/**
 * Chapter 1. The warm version of the room: Aris asleep, the phone about
 * to ring, the moon at the window. `chill` is ~0 here, so we keep the
 * room warm and let only the moon and phone be cold.
 */
export function buildBedroomNight(
  scene: Phaser.Scene,
  chill: number,
): TableauHandle {
  const room = buildBedroomRoom(scene, {
    chill,
    monoStrength: chill * 0.2, // barely any drain in the opening chapter
    warmGlow: true,
  });

  return {
    update: room.update,
    destroy: room.destroy,
  };
}
