/**
 * ΑΚΟΜΑ ΕΓΩ — tableau: "Ο γυρισμός" (The Return).
 *
 * The same train. The same window. The same woman, seen from behind —
 * but it is night now, and she is coming back.
 *
 * Outside the glass there is almost nothing: the land is gone to black,
 * and only now and then a cold pinprick of far-off light — a farmhouse,
 * a signal lamp, a town she will never name — slides slowly past and is
 * swallowed again.
 *
 * Because the world outside has gone dark, the window has stopped being
 * a window. It has become a mirror. The dominant thing in this picture
 * is her own faint REFLECTION hanging in the black pane: a dim ghost of
 * her face turned back toward her, looking at the woman who is looking.
 *
 * The palette is drained — cold blue-grey, the warmth of the outbound
 * journey spent. `chill` runs high (~0.75).
 *
 * --------------------------------------------------------------------
 * Re-uses the carriage interior + seated figure from `journey.ts` via
 * the shared `buildCarriage` helper — same bones, re-lit for night.
 */
import Phaser from "phaser";
import { VIEW_W, VIEW_H } from "../../../consts";
import { PAL, shade, mix } from "../../../palette";
import type { TableauHandle } from "../../../still/tableau";
import { buildCarriage, WIN } from "./journey";

export function buildTrainBack(scene: Phaser.Scene, chill: number): TableauHandle {
  // Everything we make, tracked for a clean teardown.
  const objects: Phaser.GameObjects.GameObject[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];

  // ---- BASE DEPTHS ----------------------------------------------------
  const D_DARK = 10; // the black void beyond the glass
  const D_LIGHTS = 20; // the few drifting distant lights
  const D_REFLECT = 40; // her ghost reflection, floating on the pane
  const D_FRAME = 60; // buildCarriage interior at D_FRAME and up

  // ---- 1. THE VOID BEYOND THE GLASS ----------------------------------
  // Near-black, with the faintest cold wash low down — not a horizon, just
  // the memory of where one would be. Drained almost entirely of colour.
  const dark = scene.add.graphics().setDepth(D_DARK);
  objects.push(dark);
  const voidTop = PAL.void;
  const voidLow = mix(PAL.void, PAL.night, 0.5); // barely-there cold lift
  const bands = 28;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    dark.fillStyle(mix(voidTop, voidLow, Math.pow(t, 1.4)), 1);
    const y0 = WIN.y + (WIN.h * i) / bands;
    const y1 = WIN.y + (WIN.h * (i + 1)) / bands;
    dark.fillRect(WIN.x, y0, WIN.w, y1 - y0 + 1.5);
  }

  // ---- 2. THE DRIFTING DISTANT LIGHTS --------------------------------
  // A handful of cold pinpricks. Each one owns its own x; in update() it
  // slides slowly leftward and, once off the window's left edge, respawns
  // off the right edge at a fresh random height — so the slow procession
  // never ends and never repeats exactly.
  interface FarLight {
    glow: Phaser.GameObjects.Image; // the soft halo
    core: Phaser.GameObjects.Graphics; // the hard bright pip
    speed: number; // px/sec leftward
    y: number;
  }
  const lights: FarLight[] = [];
  const LIGHT_COUNT = 5;
  // confine the lights to the lower band of the window — distance lies low
  const lightBandTop = WIN.y + WIN.h * 0.42;
  const lightBandH = WIN.h * 0.4;

  // a small reusable spawn helper — fresh height + a touch of speed jitter
  const reseed = (l: FarLight, startX: number): void => {
    l.y = lightBandTop + Math.random() * lightBandH;
    l.speed = 14 + Math.random() * 12; // genuinely slow
    l.glow.setPosition(startX, l.y);
    l.core.setPosition(startX, l.y);
    // far lights vary in apparent brightness
    const b = 0.35 + Math.random() * 0.4;
    l.glow.setAlpha(b * 0.6);
  };

  for (let i = 0; i < LIGHT_COUNT; i++) {
    // cold-tinted bloom — the violet glow tinted toward pale moon-blue
    const glow = scene.add
      .image(0, 0, "glow_violet")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(D_LIGHTS)
      .setTint(PAL.gloomGlow)
      .setScale(0.42);
    objects.push(glow);
    // the hard little core of the light
    const core = scene.add.graphics().setDepth(D_LIGHTS + 1);
    core.fillStyle(shade(PAL.gloomHi, -0.05), 0.9);
    core.fillCircle(0, 0, 2.2);
    objects.push(core);

    const l: FarLight = { glow, core, speed: 0, y: 0 };
    // spread the initial procession across (and a little past) the window
    reseed(l, WIN.x + (WIN.w * (i + 0.5)) / LIGHT_COUNT);
    lights.push(l);
  }

  // ---- 3. HER REFLECTION IN THE DARK GLASS ---------------------------
  // The heart of the picture. With the world gone, the pane mirrors the
  // lit carriage — and her. We draw a dim, soft-edged ghost: the back of
  // the figure becomes a FRONT-facing reflection, so for the first time
  // in either train tableau we (and she) see her face. It is faint, blue,
  // and it is looking back.
  //
  // The reflection is mirrored to the LEFT half of the window (the glass
  // opposite where she physically sits) and floats a little — a slow
  // breathing drift, as if the image were not quite solid.
  const reflect = scene.add
    .container(WIN.x + WIN.w * 0.34, WIN.y + WIN.h * 0.52)
    .setDepth(D_REFLECT);
  objects.push(reflect);

  const rg = scene.add.graphics();
  reflect.add(rg);

  // reflection colours — everything pushed cold and dim; this is light on
  // glass, not a solid body, so alphas stay low throughout.
  const ghostCoat = mix(PAL.cloak, PAL.gloom, 0.6);
  const ghostSkin = mix(PAL.skin, PAL.gloomHi, 0.7);
  const ghostHair = mix(PAL.hair, PAL.gloomMid, 0.45);

  // shoulders / coat of the reflection — a soft trapezoid, low and wide
  rg.fillStyle(ghostCoat, 0.16);
  rg.fillRoundedRect(-150, 70, 300, 220, 46);
  rg.fillStyle(ghostCoat, 0.1);
  rg.fillRoundedRect(-170, 96, 340, 200, 54); // a blurred outer halo

  // the hair framing the face — falls past the shoulders
  rg.fillStyle(ghostHair, 0.2);
  rg.fillEllipse(0, -30, 220, 250);
  rg.fillStyle(ghostHair, 0.12);
  rg.fillEllipse(0, 10, 250, 280); // soft blur of the hair

  // the FACE — an oval of pale cold light. Faint: she is barely there.
  rg.fillStyle(ghostSkin, 0.22);
  rg.fillEllipse(0, -34, 132, 168);
  // a brighter inner core to the face so it reads through the dark
  rg.fillStyle(shade(ghostSkin, 0.1), 0.14);
  rg.fillEllipse(0, -30, 96, 124);

  // the eyes — two small, dim hollows. Not detailed; just enough that the
  // reflection is unmistakably *looking back*.
  rg.fillStyle(mix(PAL.night, PAL.gloom, 0.35), 0.3);
  rg.fillEllipse(-30, -44, 26, 16);
  rg.fillEllipse(30, -44, 26, 16);
  // the faintest catch-light in each eye
  rg.fillStyle(PAL.gloomHi, 0.22);
  rg.fillCircle(-30, -46, 3);
  rg.fillCircle(30, -46, 3);

  // a soft shadow under the brow and a hint of the nose / mouth line
  rg.fillStyle(mix(PAL.night, ghostSkin, 0.4), 0.16);
  rg.fillEllipse(0, -8, 22, 40); // nose shadow
  rg.fillStyle(mix(PAL.night, ghostSkin, 0.5), 0.14);
  rg.fillRoundedRect(-22, 18, 44, 8, 4); // the line of the mouth

  // a cold bloom set behind the reflected face — it makes the ghost glow
  // very faintly out of the black, the way a real reflection seems lit
  // from nowhere.
  const reflGlow = scene.add
    .image(reflect.x, reflect.y - 30, "glow_violet")
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(D_REFLECT - 1)
    .setTint(PAL.gloomGlow)
    .setScale(1.5)
    .setAlpha(0.12);
  objects.push(reflGlow);

  // the reflection BREATHES — a slow alpha + scale drift so it never
  // looks pasted on; it wavers like an image held on unsteady glass.
  const reflBreath = scene.tweens.add({
    targets: reflect,
    alpha: { from: 0.78, to: 1 },
    scaleX: { from: 0.992, to: 1.008 },
    scaleY: { from: 0.996, to: 1.006 },
    duration: 6400,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
  tweens.push(reflBreath);
  // the bloom behind her pulses on the same slow breath, very slightly
  const glowBreath = scene.tweens.add({
    targets: reflGlow,
    alpha: { from: 0.08, to: 0.16 },
    duration: 6400,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
  tweens.push(glowBreath);

  // ---- 4. A FILM ON THE GLASS ----------------------------------------
  // A whisper of the cold carriage light caught on the pane, over the top
  // of the reflection — ties the ghost to the surface of the window.
  const film = scene.add.graphics().setDepth(D_REFLECT + 1);
  objects.push(film);
  film.fillStyle(mix(PAL.gloomMid, PAL.night, 0.5), 0.05);
  film.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  // one faint diagonal gleam — the ghost of the carriage's tube light
  film.fillStyle(PAL.gloomHi, 0.035);
  film.fillTriangle(
    WIN.x + WIN.w * 0.6, WIN.y,
    WIN.x + WIN.w * 0.72, WIN.y,
    WIN.x + WIN.w * 0.2, WIN.y + WIN.h,
  );

  // ---- 5. THE CARRIAGE — shared interior + the seated woman ----------
  // chill is high, so buildCarriage drains the timber to blue-grey for us.
  const carriage = buildCarriage(scene, chill, D_FRAME);
  objects.push(...carriage.objects);
  tweens.push(...carriage.tweens);

  // ---- 6. A DEEPER NIGHT VIGNETTE ------------------------------------
  const vign = scene.add.graphics().setDepth(D_FRAME + 10);
  objects.push(vign);
  vign.fillStyle(PAL.void, 0.45);
  vign.fillRect(0, 0, VIEW_W, 56);
  vign.fillRect(0, VIEW_H - 64, VIEW_W, 64);
  vign.fillStyle(PAL.void, 0.3);
  vign.fillRect(0, 0, 70, VIEW_H);
  vign.fillRect(VIEW_W - 70, 0, 70, VIEW_H);

  /* ---- per-frame: drift the few far lights past the window ---------- */
  const update = (_time: number, delta: number): void => {
    const dt = delta / 1000;
    for (const l of lights) {
      const nx = l.glow.x - l.speed * dt;
      if (nx < WIN.x - 30) {
        // off the left edge — respawn it off the right at a new height
        reseed(l, WIN.x + WIN.w + 30 + Math.random() * 120);
      } else {
        l.glow.setX(nx);
        l.core.setX(nx);
      }
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
