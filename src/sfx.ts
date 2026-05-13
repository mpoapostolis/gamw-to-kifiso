/**
 * Pocket synth.
 *
 * No audio files — every sound is a few oscillators and a noise burst shaped by
 * envelopes through the Web Audio API. One module-level singleton; resumed on
 * the first user gesture (browsers gate autoplay). All calls are no-ops if Web
 * Audio is unavailable.
 */

type Wave = OscillatorType;

class Synth {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private warmth!: BiquadFilterNode;
  private _muted = false;
  private ready = false;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
      | typeof AudioContext
      | undefined;
    if (!AC) return null;
    try {
      this.ctx = new AC();
    } catch {
      return null;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.warmth = this.ctx.createBiquadFilter();
    this.warmth.type = "lowpass";
    this.warmth.frequency.value = 7200;
    this.warmth.Q.value = 0.4;
    this.master.connect(this.warmth);
    this.warmth.connect(this.ctx.destination);
    this.ready = true;
    return this.ctx;
  }

  /** Call from a user-gesture handler (pointerdown / keydown) to unlock audio. */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.ready) this.master.gain.value = m ? 0 : 0.5;
  }
  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }
  get muted() {
    return this._muted;
  }

  private now() {
    return this.ctx!.currentTime;
  }

  /** A single shaped oscillator voice. */
  private voice(
    opt: {
      wave?: Wave;
      f0: number;
      f1?: number;
      t: number; // duration
      gain?: number;
      attack?: number;
      delay?: number;
      detune?: number;
      glideShape?: "lin" | "exp";
      to?: AudioNode;
    },
  ) {
    const ctx = this.ensure();
    if (!ctx || this._muted) return;
    const t0 = this.now() + (opt.delay ?? 0);
    const dur = opt.t;
    const osc = ctx.createOscillator();
    osc.type = opt.wave ?? "sine";
    if (opt.detune) osc.detune.value = opt.detune;
    osc.frequency.setValueAtTime(opt.f0, t0);
    if (opt.f1 !== undefined && opt.f1 !== opt.f0) {
      if ((opt.glideShape ?? "exp") === "exp")
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.f1), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(opt.f1, t0 + dur);
    }
    const g = ctx.createGain();
    const peak = opt.gain ?? 0.3;
    const atk = opt.attack ?? 0.006;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(opt.to ?? this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A filtered noise burst. */
  private noise(opt: {
    t: number;
    gain?: number;
    type?: BiquadFilterType;
    freq?: number;
    q?: number;
    sweepTo?: number;
    delay?: number;
    attack?: number;
  }) {
    const ctx = this.ensure();
    if (!ctx || this._muted) return;
    const t0 = this.now() + (opt.delay ?? 0);
    const dur = opt.t;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, Math.max(1, frames), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = opt.type ?? "bandpass";
    filt.frequency.setValueAtTime(opt.freq ?? 1200, t0);
    if (opt.sweepTo) filt.frequency.exponentialRampToValueAtTime(Math.max(60, opt.sweepTo), t0 + dur);
    filt.Q.value = opt.q ?? 1;
    const g = ctx.createGain();
    const peak = opt.gain ?? 0.25;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opt.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* ----------------------------- sound bank ---------------------------- */
  footstep() {
    this.noise({ t: 0.08, gain: 0.12, type: "lowpass", freq: 520, sweepTo: 180, q: 1 });
  }
  swing() {
    // a soft, almost-musical "looking around" chime — no longer a combat sound
    this.voice({ wave: "triangle", f0: 740, f1: 880, t: 0.18, gain: 0.06, glideShape: "lin" });
    this.voice({ wave: "sine", f0: 1480, t: 0.14, gain: 0.04, delay: 0.04 });
  }
  hit() {
    this.noise({ t: 0.12, gain: 0.3, type: "lowpass", freq: 1400, sweepTo: 220, q: 1 });
    this.voice({ wave: "square", f0: 200, f1: 70, t: 0.12, gain: 0.18 });
  }
  gloomHit() {
    this.voice({ wave: "sawtooth", f0: 380, f1: 140, t: 0.16, gain: 0.16 });
    this.voice({ wave: "square", f0: 760, f1: 200, t: 0.1, gain: 0.06, delay: 0.01 });
    this.noise({ t: 0.1, gain: 0.12, type: "highpass", freq: 1800 });
  }
  gloomDie() {
    this.voice({ wave: "sawtooth", f0: 300, f1: 60, t: 0.42, gain: 0.18, glideShape: "exp" });
    this.voice({ wave: "sine", f0: 900, f1: 180, t: 0.34, gain: 0.1, delay: 0.02 });
    this.noise({ t: 0.36, gain: 0.16, type: "lowpass", freq: 2200, sweepTo: 200 });
  }
  hurt() {
    this.voice({ wave: "square", f0: 320, f1: 110, t: 0.28, gain: 0.22 });
    this.voice({ wave: "sawtooth", f0: 160, f1: 80, t: 0.3, gain: 0.12, delay: 0.02 });
    this.noise({ t: 0.14, gain: 0.14, type: "lowpass", freq: 900, sweepTo: 200 });
  }
  dash() {
    this.noise({ t: 0.26, gain: 0.16, type: "bandpass", freq: 900, sweepTo: 2600, q: 0.6 });
    this.voice({ wave: "triangle", f0: 240, f1: 620, t: 0.22, gain: 0.07 });
  }
  coin() {
    this.voice({ wave: "square", f0: 980, t: 0.06, gain: 0.14 });
    this.voice({ wave: "square", f0: 1480, t: 0.12, gain: 0.14, delay: 0.05 });
  }
  heal() {
    this.voice({ wave: "sine", f0: 520, f1: 780, t: 0.18, gain: 0.14, glideShape: "lin" });
    this.voice({ wave: "sine", f0: 780, f1: 1180, t: 0.22, gain: 0.12, delay: 0.08, glideShape: "lin" });
    this.voice({ wave: "triangle", f0: 1180, t: 0.18, gain: 0.08, delay: 0.16 });
  }
  blip() {
    this.voice({ wave: "square", f0: 660, t: 0.05, gain: 0.08 });
  }
  select() {
    this.voice({ wave: "square", f0: 520, f1: 780, t: 0.08, gain: 0.1, glideShape: "lin" });
  }
  open() {
    this.voice({ wave: "triangle", f0: 300, f1: 520, t: 0.1, gain: 0.1, glideShape: "lin" });
    this.voice({ wave: "sine", f0: 720, t: 0.08, gain: 0.05, delay: 0.04 });
  }
  talk() {
    // a soft "blip" per glyph; randomise pitch a touch so it doesn't drone
    this.voice({ wave: "square", f0: 380 + Math.random() * 90, t: 0.03, gain: 0.04 });
  }
  close() {
    this.voice({ wave: "triangle", f0: 520, f1: 260, t: 0.1, gain: 0.09, glideShape: "lin" });
  }
  questUp() {
    const seq = [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) =>
      this.voice({ wave: "triangle", f0: f, t: 0.16 + (i === 3 ? 0.2 : 0), gain: 0.14, delay: i * 0.09 }),
    );
    this.voice({ wave: "sine", f0: 1046.5, f1: 1300, t: 0.4, gain: 0.08, delay: 0.4, glideShape: "lin" });
  }
  warden() {
    this.voice({ wave: "sawtooth", f0: 90, f1: 50, t: 1.1, gain: 0.22 });
    this.voice({ wave: "square", f0: 130, f1: 70, t: 0.9, gain: 0.12, delay: 0.05 });
    this.noise({ t: 1.0, gain: 0.18, type: "lowpass", freq: 600, sweepTo: 120, q: 1.4 });
  }
  death() {
    const seq = [440, 392, 311.13, 220];
    seq.forEach((f, i) =>
      this.voice({ wave: "triangle", f0: f, f1: f * 0.92, t: 0.3 + (i === 3 ? 0.5 : 0), gain: 0.16, delay: i * 0.18, glideShape: "lin" }),
    );
    this.noise({ t: 0.9, gain: 0.1, type: "lowpass", freq: 800, sweepTo: 120, delay: 0.5 });
  }
  thunderHint() {
    this.noise({ t: 0.8, gain: 0.14, type: "lowpass", freq: 380, sweepTo: 90, q: 1 });
  }
}

export const SFX = new Synth();
