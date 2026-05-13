/** Background music — a single looping track, started on the first user gesture. */
let audio: HTMLAudioElement | null = null;
let started = false;
let muted = false;

function ensure(): HTMLAudioElement | null {
  if (audio) return audio;
  if (typeof Audio === "undefined") return null;
  audio = new Audio("/bg-music.mp3");
  audio.loop = true;
  audio.volume = 0;
  audio.preload = "auto";
  return audio;
}

export const BGM = {
  /** Call after any user gesture; browsers gate audio playback. */
  start(targetVolume = 0.35) {
    const a = ensure();
    if (!a || started) return;
    started = true;
    a.play().then(
      () => {
        // gentle fade-in
        const start = performance.now();
        const dur = 1600;
        const step = () => {
          if (!audio || muted) return;
          const t = Math.min(1, (performance.now() - start) / dur);
          audio.volume = targetVolume * t;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      () => {
        // playback blocked — we'll retry on the next unlock attempt
        started = false;
      },
    );
  },
  setMuted(m: boolean) {
    muted = m;
    if (audio) audio.volume = m ? 0 : 0.35;
  },
  toggleMute() {
    this.setMuted(!muted);
    return muted;
  },
  get muted() {
    return muted;
  },
};
