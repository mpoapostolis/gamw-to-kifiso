/**
 * THE CLEANERS — screen-space post-processing pipeline.
 *
 * Drives the game's visual language of "wrongness":
 *   • Soft CRT scanlines (toggleable via GameState flag `crt_disabled`).
 *   • Subtle chromatic aberration that intensifies with awareness, and
 *     punches harder during Fragment events.
 *   • Film grain over everything; grain rises during Fragments.
 *   • Cold cyan tint for Window mode / twilight.
 *
 * One Phaser PostFXPipeline subclass; attached to a Scene's main camera
 * via `applyPostFX(scene)` from inside `create()`. The pipeline reads
 * GameState every frame in onPreRender to derive its baseline uniforms,
 * so scenes don't have to poll anything — they only need to call
 * `pulseGlitch` when something story-relevant fires.
 *
 * Boot wiring:
 *   The integrator must call `registerPostFX(game)` exactly once at boot
 *   (from main.ts after `new Phaser.Game(config)` finishes, or from
 *   BootScene.preload). This module deliberately does NOT do that work
 *   itself — see CONSTRAINTS in the task spec.
 */
import Phaser from "phaser";
import { GameState } from "../state/gameState";

/** Pipeline key — must match the string the camera uses to look it up. */
export const CLEANERS_FX_KEY = "CleanersFX";

/** Fragment shader (GLSL ES 1.0). Compact on purpose. */
const FRAG_SHADER = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float u_glitchIntensity;
uniform float u_coldShift;
uniform float u_grainAmount;
uniform float u_time;
uniform float u_scanline;
varying vec2 outTexCoord;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = outTexCoord;
  // chromatic aberration — split RGB channels by glitch intensity
  float ab = u_glitchIntensity * 0.006;
  vec4 colR = texture2D(uMainSampler, uv + vec2(ab, 0.0));
  vec4 colG = texture2D(uMainSampler, uv);
  vec4 colB = texture2D(uMainSampler, uv - vec2(ab, 0.0));
  vec3 col = vec3(colR.r, colG.g, colB.b);

  // film grain
  float n = hash(uv * 800.0 + u_time);
  col += (n - 0.5) * u_grainAmount;

  // soft CRT scanlines
  float s = sin(uv.y * 720.0) * 0.5 + 0.5;
  col *= mix(1.0, 1.0 - 0.12 * s, u_scanline);

  // cold shift toward cyan in twilight
  col.r *= mix(1.0, 0.86, u_coldShift);
  col.b *= mix(1.0, 1.18, u_coldShift);

  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------------------------------------------------ *
 * Pipeline class                                                     *
 * ------------------------------------------------------------------ */

/**
 * The post-FX pipeline. Subclass of Phaser's PostFXPipeline so it gets
 * attached to a single camera/GameObject as a full-screen pass.
 *
 * Public uniform-shadow fields let callers (and onPreRender) drive the
 * shader without having to read uniform locations every frame.
 */
export class CleanersFXPipeline extends Phaser.Renderer.WebGL.Pipelines
  .PostFXPipeline {
  /** Current glitch intensity (0..1). Driven by awareness + transient pulses. */
  public glitchIntensity = 0;
  /** Pulse offset added on top of the awareness baseline. Decays to 0. */
  public glitchPulse = 0;
  /**
   * Pulse decay rate, units-per-second. Set by pulseGlitch(). Public
   * because pulseGlitch() lives in this module but outside the class
   * (it's part of the user-facing API and we don't want to expose the
   * class via every import).
   */
  public glitchDecayPerSec = 0;
  /** Cold cyan shift (0..1). Driven externally via setColdShift. */
  public coldShift = 0;
  /** Film grain intensity (0..1). Default 0.06; rises during Fragments. */
  public grainAmount = 0.06;
  /** CRT scanline strength (0..1). Toggled by the GameState flag. */
  public scanline = 1;
  /** Wall-clock seconds since the pipeline booted; feeds u_time. */
  private elapsedSec = 0;
  /** Used to compute per-frame deltas in onPreRender. */
  private lastTimeMs = -1;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: CLEANERS_FX_KEY,
      fragShader: FRAG_SHADER,
    });
  }

  /**
   * Called every frame, right before the screen quad is drawn. We:
   *   1) advance our own internal clock (Phaser's PostFXPipeline doesn't
   *      pass us a delta, so we read performance.now() ourselves);
   *   2) read GameState to compute the awareness-driven baseline glitch
   *      and the CRT toggle;
   *   3) decay any transient pulse from pulseGlitch();
   *   4) push everything as `set1f` uniforms.
   */
  onPreRender(): void {
    // ---- 1. tick our clock -----------------------------------------
    const now = (typeof performance !== "undefined"
      ? performance.now()
      : Date.now());
    if (this.lastTimeMs < 0) this.lastTimeMs = now;
    const dt = Math.max(0, (now - this.lastTimeMs) / 1000);
    this.lastTimeMs = now;
    this.elapsedSec += dt;

    // ---- 2. baseline from awareness --------------------------------
    // awareness is 0..100. Baseline glitch caps out at 0.4 so the screen
    // never *only* looks broken; the player's still meant to read it.
    const awareness = GameState.state.awareness;
    const baseline = Math.min(0.4, Math.max(0, awareness / 100));

    // ---- 3. decay the pulse ---------------------------------------
    if (this.glitchPulse > 0 && this.glitchDecayPerSec > 0) {
      this.glitchPulse = Math.max(
        0,
        this.glitchPulse - this.glitchDecayPerSec * dt,
      );
    }
    // Final glitch is baseline + transient pulse, capped at 1.
    this.glitchIntensity = Math.min(1, baseline + this.glitchPulse);

    // ---- 4. scanline driven by the persisted flag -----------------
    // Default ON. Player can turn off via setCRT(false), which sets
    // `crt_disabled = true`.
    this.scanline = GameState.flag("crt_disabled") ? 0 : 1;

    // ---- 5. push uniforms -----------------------------------------
    this.set1f("u_glitchIntensity", this.glitchIntensity);
    this.set1f("u_coldShift", this.coldShift);
    this.set1f("u_grainAmount", this.grainAmount);
    this.set1f("u_time", this.elapsedSec);
    this.set1f("u_scanline", this.scanline);
  }
}

/* ------------------------------------------------------------------ *
 * Public API                                                         *
 * ------------------------------------------------------------------ */

/**
 * Register the post-FX pipeline class with the renderer. Safe to call
 * exactly once at boot; later calls are no-ops. Bails harmlessly if the
 * renderer isn't WebGL (e.g. Canvas fallback in some headless envs).
 */
export function registerPostFX(game: Phaser.Game): void {
  const renderer = game.renderer as
    | Phaser.Renderer.WebGL.WebGLRenderer
    | Phaser.Renderer.Canvas.CanvasRenderer;
  if (!isWebGL(renderer)) return;
  // The PipelineManager dedupes by name, but `has` saves a redundant
  // boot if registerPostFX is called twice (e.g. once from main, once
  // from a defensive scene).
  if (renderer.pipelines.has(CLEANERS_FX_KEY)) return;
  renderer.pipelines.addPostPipeline(CLEANERS_FX_KEY, CleanersFXPipeline);
}

/**
 * Attach the pipeline to the scene's main camera and return the running
 * instance so the scene can drive transient uniforms (cold shift,
 * fragment pulses, …). Returns null if WebGL isn't available — the
 * caller should treat null as "no post-FX, continue normally".
 *
 * Call from `create()` of any scene:
 *   const fx = applyPostFX(this);
 *   // later, when a fragment lands:
 *   if (fx) pulseGlitch(fx);
 */
export function applyPostFX(
  scene: Phaser.Scene,
): CleanersFXPipeline | null {
  const renderer = scene.game.renderer as
    | Phaser.Renderer.WebGL.WebGLRenderer
    | Phaser.Renderer.Canvas.CanvasRenderer;
  if (!isWebGL(renderer)) return null;

  // Belt-and-braces: if the integrator forgot to call registerPostFX at
  // boot, register on first attach. Cheap — has() short-circuits the
  // common case.
  if (!renderer.pipelines.has(CLEANERS_FX_KEY)) {
    renderer.pipelines.addPostPipeline(CLEANERS_FX_KEY, CleanersFXPipeline);
  }

  const cam = scene.cameras.main;
  // Reset first so re-entering a scene doesn't stack copies of the same
  // pipeline (Phaser will happily append to the list otherwise).
  cam.resetPostPipeline();
  cam.setPostPipeline(CleanersFXPipeline);

  // Pull the freshly-instantiated pipeline back out so the scene can
  // poke it. `getPostPipeline` accepts either the class or the key; we
  // pass the class for the strongest typing.
  const pipe = renderer.pipelines.getPostPipeline(
    CleanersFXPipeline,
  ) as CleanersFXPipeline | undefined;
  return pipe ?? null;
}

/**
 * Briefly raise glitch intensity to ~0.8 then ease back to whatever the
 * awareness-driven baseline is. Default duration ~200ms (per the design
 * spec's "Fragment pulse"). Manual linear decay handled in onPreRender.
 */
export function pulseGlitch(
  pipeline: CleanersFXPipeline,
  ms = 200,
): void {
  const peak = 0.8;
  pipeline.glitchPulse = peak;
  // Decay linearly from `peak` to 0 over `ms` milliseconds. Slightly
  // crude (no easing) but at 200ms it reads as a single visual flash,
  // which is exactly what the design doc asks for.
  pipeline.glitchDecayPerSec = peak / (Math.max(16, ms) / 1000);
  // Also nudge grain up briefly — design doc says grain rises during
  // Fragment events. Reset to the gentle baseline once the pulse ends.
  const grainBaseline = 0.06;
  const grainPeak = 0.18;
  pipeline.grainAmount = grainPeak;
  setTimeout(() => {
    pipeline.grainAmount = grainBaseline;
  }, Math.max(16, ms));
}

/**
 * Set the cold-cyan shift (0 = neutral, 1 = full Window-mode twilight).
 * Clamped to [0, 1].
 */
export function setColdShift(
  pipeline: CleanersFXPipeline,
  value: number,
): void {
  pipeline.coldShift = Math.max(0, Math.min(1, value));
}

/* ------------------------------------------------------------------ *
 * Internal helpers                                                   *
 * ------------------------------------------------------------------ */

/**
 * Type guard: is the renderer a WebGL renderer with a PipelineManager?
 * Phaser exposes `WEBGL`/`CANVAS` constants on the renderer's `type`
 * property; we also fall back to a structural check on `pipelines`.
 */
function isWebGL(
  r: Phaser.Renderer.WebGL.WebGLRenderer | Phaser.Renderer.Canvas.CanvasRenderer,
): r is Phaser.Renderer.WebGL.WebGLRenderer {
  // Phaser.WEBGL is 2 in current versions, but we'd rather not import
  // that constant just for this. Duck-type on `pipelines`.
  return (
    typeof (r as Phaser.Renderer.WebGL.WebGLRenderer).pipelines !== "undefined"
  );
}

