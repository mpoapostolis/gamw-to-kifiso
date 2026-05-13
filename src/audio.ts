/**
 * Phaser-managed audio singleton.
 *
 * Wraps `scene.sound` for the assets in `public/audio/`:
 *   • music_hope.mp3       — the looping ambient piano (Emma_MA, CC0)
 *   • sfx_footstep_wood_*  — wooden floor footstep variants (CC-BY 3.0)
 *   • sfx_footstep_grass_* — outdoor footstep variants     (CC-BY 3.0)
 *   • sfx_heartbeat_slow / _fast — used during the 11:55 cleaner phase (CC0)
 *   • sfx_chime / sfx_chime_2    — soft bells for note pickups + door interactions (CC0)
 *
 * Files are added to the loader in BootScene.preload(). All play methods are
 * defensive — if a key isn't loaded yet they no-op.
 */
import Phaser from "phaser";

class AudioBus {
  private bgm: Phaser.Sound.BaseSound | null = null;
  private hbt: Phaser.Sound.BaseSound | null = null;
  private _muted = false;
  private musicVolume = 0.32;
  private hbtVolume = 0.55;
  private sfxVolume = 0.6;
  private fsCooldownUntil = 0;

  /** Add load calls to a scene's loader. Call from BootScene.preload. */
  preload(scene: Phaser.Scene) {
    const audio = (key: string, files: string[]) => {
      if (scene.cache.audio.exists(key)) return;
      scene.load.audio(key, files);
    };
    audio("music_hope", ["audio/music_hope.mp3"]);
    audio("fs_wood_a", ["audio/sfx_footstep_wood_a.ogg"]);
    audio("fs_wood_b", ["audio/sfx_footstep_wood_b.ogg"]);
    audio("fs_grass_a", ["audio/sfx_footstep_grass_a.ogg"]);
    audio("fs_grass_b", ["audio/sfx_footstep_grass_b.ogg"]);
    audio("heartbeat_slow", ["audio/sfx_heartbeat_slow.wav"]);
    audio("heartbeat_fast", ["audio/sfx_heartbeat_fast.wav"]);
    audio("chime", ["audio/sfx_chime.wav"]);
    audio("chime2", ["audio/sfx_chime_2.wav"]);
  }

  /** Start the looping background music. Idempotent. */
  startMusic(scene: Phaser.Scene) {
    if (this.bgm || this._muted) return;
    if (!scene.cache.audio.exists("music_hope")) return;
    this.bgm = scene.sound.add("music_hope", { loop: true, volume: 0 });
    (this.bgm as Phaser.Sound.WebAudioSound).play();
    // gentle fade-in
    scene.tweens.add({
      targets: this.bgm,
      volume: this.musicVolume,
      duration: 1800,
    });
  }

  duckMusic(scene: Phaser.Scene, to = 0.08) {
    if (!this.bgm) return;
    scene.tweens.add({ targets: this.bgm, volume: to, duration: 600 });
  }
  unduckMusic(scene: Phaser.Scene) {
    if (!this.bgm) return;
    scene.tweens.add({ targets: this.bgm, volume: this.musicVolume, duration: 800 });
  }

  stopMusic(scene: Phaser.Scene) {
    if (!this.bgm) return;
    scene.tweens.add({ targets: this.bgm, volume: 0, duration: 600, onComplete: () => { this.bgm?.stop(); this.bgm = null; } });
  }

  /** Heartbeat loop — fast = panicky, slow = ambient dread. Idempotent per type. */
  startHeartbeat(scene: Phaser.Scene, fast = false) {
    this.stopHeartbeat();
    const key = fast ? "heartbeat_fast" : "heartbeat_slow";
    if (!scene.cache.audio.exists(key)) return;
    this.hbt = scene.sound.add(key, { loop: true, volume: 0 });
    (this.hbt as Phaser.Sound.WebAudioSound).play();
    scene.tweens.add({ targets: this.hbt, volume: this.hbtVolume, duration: 800 });
  }
  stopHeartbeat() {
    this.hbt?.stop();
    this.hbt = null;
  }

  footstep(scene: Phaser.Scene, surface: "wood" | "grass" = "grass") {
    const now = scene.time.now;
    if (now < this.fsCooldownUntil) return; // cheap rate-limiter so we don't spam
    this.fsCooldownUntil = now + 70;
    const a = surface === "wood" ? "fs_wood_a" : "fs_grass_a";
    const b = surface === "wood" ? "fs_wood_b" : "fs_grass_b";
    const key = Math.random() < 0.5 ? a : b;
    if (!scene.cache.audio.exists(key)) return;
    scene.sound.play(key, { volume: this.sfxVolume * 0.45, rate: 0.9 + Math.random() * 0.25 });
  }

  chime(scene: Phaser.Scene, soft = false) {
    const key = soft ? "chime2" : "chime";
    if (!scene.cache.audio.exists(key)) return;
    scene.sound.play(key, { volume: this.sfxVolume * 0.45 });
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.bgm) (this.bgm as Phaser.Sound.WebAudioSound).setVolume(m ? 0 : this.musicVolume);
    if (this.hbt) (this.hbt as Phaser.Sound.WebAudioSound).setVolume(m ? 0 : this.hbtVolume);
  }
  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }
  get muted() { return this._muted; }
}

export const Audio = new AudioBus();
