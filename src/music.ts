/**
 * Ambient procedural music.
 *
 * No audio files — pure Web Audio. A tiny scheduler ticks every 250ms, looking
 * ~1s ahead into the future and queueing oscillators with absolute start/stop
 * times. This way the audio thread stays glitch-free even when the JS main
 * thread stalls (e.g. during a Phaser scene swap).
 *
 * Mood: dusk-suburb, memory-loss melancholy. Slow piano-like plucks over a
 * detuned sine pad, ~78 BPM, mostly A-minor with a brief C-major resolution.
 * Hauntingly beautiful, never creepy: no dissonance, no sub-bass rumble, no
 * fast LFOs. The lowpass keeps everything soft, like sound through a window.
 *
 * One module-level singleton; safe to start() multiple times. setMuted ramps
 * the master gain, so it never clicks. stop() leaves the AudioContext alive —
 * the browser reclaims it.
 */

// ---------------------------------------------------------------------------
// Music theory tables
// ---------------------------------------------------------------------------

/** Equal-temperament frequency for a MIDI note number. A4 = 69 = 440Hz. */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Note name → MIDI number (octave 4 = middle). Just the white keys we use. */
const NOTE: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Build a MIDI number from a letter and octave, e.g. n("A", 3) = 57. */
function n(letter: keyof typeof NOTE, octave: number): number {
  return NOTE[letter] + (octave + 1) * 12;
}

interface Chord {
  /** Display name, e.g. "Am" — purely for debug. */
  readonly name: string;
  /** Root MIDI note (used by pad's root oscillator). */
  readonly root: number;
  /** Third MIDI note (chord quality lives here: m3 for minor, M3 for major). */
  readonly third: number;
  /** Fifth MIDI note. */
  readonly fifth: number;
  /** A scale to draw pluck notes from — six pitches spanning ~two octaves. */
  readonly scale: readonly number[];
}

/**
 * The progression: Am — F — C — G, repeated for 8 bars total.
 * Classic vi–IV–I–V in C-major; the A-minor start gives the melancholy, the
 * brief lift to C and G hints at a memory of something hopeful.
 */
function chord(name: string, root: number, third: number, fifth: number, scaleRoot: number): Chord {
  // A-natural-minor scale shape relative to root: 0, 2, 3, 5, 7, 10.
  // We pick a sparse set of "safe" notes from this scale across two octaves
  // so that any random pluck sounds consonant against the chord.
  const offsets = [0, 3, 5, 7, 10, 12, 15];
  const scale = offsets.map((o) => scaleRoot + o);
  return { name, root, third, fifth, scale };
}

const PROGRESSION: readonly Chord[] = [
  // Am: A3 + C4 + E4. Scale orbits the A-minor scale starting at A4.
  chord("Am", n("A", 3), n("C", 4), n("E", 4), n("A", 4)),
  chord("Am", n("A", 3), n("C", 4), n("E", 4), n("A", 4)),
  // F: F3 + A3 + C4. Scale tilts toward F-major shape (gentle warmth).
  chord("F", n("F", 3), n("A", 3), n("C", 4), n("F", 4)),
  chord("F", n("F", 3), n("A", 3), n("C", 4), n("F", 4)),
  // C: C4 + E4 + G4. The major resolution — the "she remembered" moment.
  chord("C", n("C", 4), n("E", 4), n("G", 4), n("C", 5)),
  chord("C", n("C", 4), n("E", 4), n("G", 4), n("C", 5)),
  // G: G3 + B3 + D4. Suspended, leading back to Am.
  chord("G", n("G", 3), n("B", 3), n("D", 4), n("G", 4)),
  chord("G", n("G", 3), n("B", 3), n("D", 4), n("G", 4)),
];

// ---------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------

const BPM = 78;
const SEC_PER_BEAT = 60 / BPM;       // ~0.769s per quarter note
const BEATS_PER_BAR = 4;
const SEC_PER_BAR = SEC_PER_BEAT * BEATS_PER_BAR; // ~3.08s per bar

/** Scheduler tick rate. Short enough to react quickly, long enough to be cheap. */
const SCHEDULER_INTERVAL_MS = 250;
/** How far ahead we queue notes. > tick interval, < bar length. */
const SCHEDULE_AHEAD_SEC = 1.0;

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

class Music {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private filter!: BiquadFilterNode;

  /** Base level for the master gain when un-muted. Quiet on purpose — SFX wins. */
  private readonly baseGain = 0.18;

  private _muted = false;
  private ready = false;

  /** When does the next bar begin, in AudioContext time? */
  private nextBarTime = 0;
  /** Which slot in PROGRESSION are we about to schedule? */
  private barIndex = 0;
  /** Used to thin out bell hits — counts bars since the last bell. */
  private barsSinceBell = 99;

  private intervalId: number | null = null;
  private started = false;

  // -------------------------------------------------------------------------
  // Init / teardown
  // -------------------------------------------------------------------------

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
    // master → lowpass → destination. The lowpass is what makes the whole
    // thing feel "behind glass" — no high frequencies make it out clean.
    this.master = this.ctx.createGain();
    this.master.gain.value = this._muted ? 0 : this.baseGain;
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 2400;
    this.filter.Q.value = 0.5;
    this.master.connect(this.filter);
    this.filter.connect(this.ctx.destination);
    this.ready = true;
    return this.ctx;
  }

  /**
   * Begin playing. Idempotent — calling twice is a no-op. Safe to call before
   * any user gesture: if the context is suspended we politely ask it to resume,
   * which works once a gesture has happened (the call itself is harmless).
   */
  start() {
    if (this.started) return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    this.started = true;

    // Start the first bar a hair in the future so we never schedule in the past.
    this.nextBarTime = ctx.currentTime + 0.1;
    this.barIndex = 0;
    this.barsSinceBell = 99;

    // setInterval returns a number in browser-DOM lib (vs NodeJS.Timeout in node).
    this.intervalId = window.setInterval(() => this.tick(), SCHEDULER_INTERVAL_MS);
    // Tick once immediately so the first bar is queued before the next interval.
    this.tick();
  }

  /** Stop scheduling and fade out. Doesn't tear down the AudioContext. */
  stop() {
    if (!this.started) return;
    this.started = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ready && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    }
  }

  // -------------------------------------------------------------------------
  // Mute
  // -------------------------------------------------------------------------

  /** Ramp the master gain to 0 (muted) or back to baseGain over 200ms. */
  setMuted(m: boolean) {
    this._muted = m;
    if (!this.ready || !this.ctx) return;
    const t = this.ctx.currentTime;
    const target = m ? 0.0001 : this.baseGain;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(target, t + 0.2);
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  get muted(): boolean {
    return this._muted;
  }

  // -------------------------------------------------------------------------
  // Scheduler
  // -------------------------------------------------------------------------

  /**
   * Called every SCHEDULER_INTERVAL_MS. Walks forward bar by bar until we've
   * queued every bar whose start time falls within the look-ahead window.
   * Each bar's notes are scheduled with absolute AudioContext times so the
   * audio thread can play them precisely even if this tick is late.
   */
  private tick() {
    if (!this.ctx || !this.started) return;
    const horizon = this.ctx.currentTime + SCHEDULE_AHEAD_SEC;
    while (this.nextBarTime < horizon) {
      const chord = PROGRESSION[this.barIndex % PROGRESSION.length];
      this.scheduleBar(this.nextBarTime, chord);
      this.nextBarTime += SEC_PER_BAR;
      this.barIndex++;
    }
  }

  /** Queue every voice for a single bar starting at AudioContext time `t0`. */
  private scheduleBar(t0: number, chord: Chord) {
    this.schedulePad(t0, chord);
    this.schedulePlucks(t0, chord);
    this.scheduleBell(t0, chord);
  }

  // -------------------------------------------------------------------------
  // Voices
  // -------------------------------------------------------------------------

  /**
   * The pad: three sustained sines (root + third + fifth) that swell in over
   * ~1s and fade out over ~3s, overlapping with the next bar's pad. Detune so
   * the chord shimmers instead of sitting still. A slow LFO sweeps the local
   * lowpass cutoff up and down — that's the "breathing" you hear underneath.
   */
  private schedulePad(t0: number, chord: Chord) {
    const ctx = this.ctx;
    if (!ctx) return;

    // Per-bar lowpass + LFO. Centered at 800Hz, modulated ±200Hz at 0.15Hz.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 800;
    padFilter.Q.value = 0.6;
    padFilter.connect(this.master);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start(t0);
    // The LFO lives just long enough to cover this bar's tail.
    lfo.stop(t0 + SEC_PER_BAR + 3.5);

    const attack = 1.0;
    const sustain = SEC_PER_BAR;          // hold through the bar
    const release = 3.0;                  // long tail that bleeds into next bar
    const peak = 0.05;                    // each voice is whisper-quiet
    const total = attack + sustain + release;

    // Mild detune cents per voice — perfectly tuned sines beat unpleasantly.
    const tones: Array<{ midi: number; detune: number }> = [
      { midi: chord.root, detune: -4 },
      { midi: chord.third, detune: +3 },
      { midi: chord.fifth, detune: -2 },
    ];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = midiToFreq(tone.midi);
      osc.detune.value = tone.detune;

      const g = ctx.createGain();
      // ADSR-ish envelope drawn with linear ramps (smooth on sines).
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + attack);
      g.gain.setValueAtTime(peak, t0 + attack + sustain);
      g.gain.linearRampToValueAtTime(0.0001, t0 + attack + sustain + release);

      osc.connect(g);
      g.connect(padFilter);
      osc.start(t0);
      osc.stop(t0 + total + 0.05);
    }
  }

  /**
   * The piano-ish plucks: triangle + sine summed, with a sharp attack and a
   * fast exponential decay over ~0.8s. We roll the dice per beat (~40%) so
   * the melody feels like rain on a window — sparse, never on the grid.
   */
  private schedulePlucks(t0: number, chord: Chord) {
    const ctx = this.ctx;
    if (!ctx) return;

    for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
      if (Math.random() > 0.4) continue;

      // Pick a note from the chord's scale, biased toward the lower half so
      // the melody mostly stays in a small register and only occasionally
      // jumps up to a "memory" high note.
      const idx = Math.random() < 0.7
        ? Math.floor(Math.random() * 4)
        : 3 + Math.floor(Math.random() * (chord.scale.length - 3));
      const midi = chord.scale[idx];
      // Small humanising offset within the beat — never quantized perfectly.
      const jitter = (Math.random() - 0.5) * 0.06;
      const tNote = t0 + beat * SEC_PER_BEAT + jitter;

      this.pluck(tNote, midi);
    }
  }

  /** One piano-like note. Triangle gives the body, sine gives the bell-tip. */
  private pluck(when: number, midi: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const freq = midiToFreq(midi);

    const peak = 0.08;
    const attack = 0.005;   // 5ms — sharp, but no click
    const decay = 0.8;      // ~0.8s tail

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    g.connect(this.master);

    // Body: triangle at fundamental.
    const o1 = ctx.createOscillator();
    o1.type = "triangle";
    o1.frequency.value = freq;
    o1.connect(g);
    o1.start(when);
    o1.stop(when + attack + decay + 0.05);

    // Shimmer: sine an octave up at a third the level, mixed in via its own gain.
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.35;
    shimmerGain.connect(g);
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2;
    o2.connect(shimmerGain);
    o2.start(when);
    o2.stop(when + attack + decay + 0.05);
  }

  /**
   * The bell: occasional high single note, every 4–8 bars. C6 or E6 depending
   * on whether we're in a minor or major-leaning chord. Randomly placed inside
   * the bar so it never lines up with the plucks.
   */
  private scheduleBell(t0: number, chord: Chord) {
    const ctx = this.ctx;
    if (!ctx) return;

    this.barsSinceBell++;
    // Need at least 4 bars between bells; then probability climbs to ~1 by 8.
    if (this.barsSinceBell < 4) return;
    const p = (this.barsSinceBell - 3) / 5; // 0.2 at bar 4, 1.0 at bar 8
    if (Math.random() > p) return;
    this.barsSinceBell = 0;

    // Choose a note in the chord at C6 register — E6 over a major-ish chord,
    // C6 over a minor-ish one. We detect by comparing the third's interval.
    const thirdInterval = (chord.third - chord.root + 12) % 12;
    const isMinor = thirdInterval === 3;
    const bellMidi = isMinor ? n("C", 6) : n("E", 6);

    const when = t0 + Math.random() * (SEC_PER_BAR - 0.5);
    const freq = midiToFreq(bellMidi);

    const peak = 0.04;
    const attack = 0.01;
    const decay = 2.0;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    g.connect(this.master);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(g);
    osc.start(when);
    osc.stop(when + attack + decay + 0.05);
  }
}

export const MUSIC = new Music();
