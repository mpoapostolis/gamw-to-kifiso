/**
 * Phaser-managed audio singleton.
 *
 * Wraps `scene.sound` for the assets in `public/audio/`:
 *   • music_intro.ogg      — Title screen + the prologue in your bedroom
 *   • music_hope.mp3       — outdoor town theme (Emma_MA, CC0)
 *   • music_facility.ogg   — the basement under the hill
 *   • music_park.mp3       — the little park with the bench
 *   • music_lullaby.mp3    — Mrs. Despoina's house, a soft hum
 *   • music_cafe.mp3       — the café / shop
 *   • music_clinic.mp3     — Dr. Erin's clinic
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
  private bgmKey: string | null = null;
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
    // background tracks (one per location). Audio Bus.playMusic() falls back
    // to music_hope if a track isn't loaded — but we load them all here so
    // each location gets its own bed instead of every scene sounding like home.
    audio("music_intro", ["audio/music_intro.ogg", "audio/music_intro.mp3"]);
    audio("music_hope", ["audio/music_hope.mp3"]);
    audio("music_facility", ["audio/music_facility.ogg", "audio/music_facility.mp3"]);
    audio("music_park", ["audio/music_park.mp3", "audio/music_park.ogg"]);
    audio("music_lullaby", ["audio/music_lullaby.mp3", "audio/music_lullaby.ogg"]);
    audio("music_cafe", ["audio/music_cafe.mp3", "audio/music_cafe.ogg"]);
    audio("music_clinic", ["audio/music_clinic.mp3", "audio/music_clinic.ogg"]);
    // sfx
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
    this.playMusic(scene, "music_hope");
  }

  /**
   * Crossfade the background bed to a new track. Each scene calls this in
   * its create() with whatever fits the location. If the key is already
   * playing, this is a no-op. If a different key is playing, it fades out
   * and the new one fades in. If `key` isn't loaded yet (e.g. an optional
   * track the audio agent never managed to download), it falls back to
   * `music_hope` so something keeps playing.
   */
  playMusic(scene: Phaser.Scene, key: string, fade = 1400) {
    if (this._muted) return;
    if (this.bgmKey === key && this.bgm) return;
    let actualKey = key;
    if (!scene.cache.audio.exists(actualKey)) {
      if (!scene.cache.audio.exists("music_hope")) return;
      actualKey = "music_hope";
      if (this.bgmKey === actualKey) return;
    }
    // fade out anything currently playing
    if (this.bgm) {
      const old = this.bgm;
      scene.tweens.add({
        targets: old,
        volume: 0,
        duration: fade * 0.7,
        onComplete: () => old.stop(),
      });
    }
    const next = scene.sound.add(actualKey, { loop: true, volume: 0 });
    (next as Phaser.Sound.WebAudioSound).play();
    scene.tweens.add({ targets: next, volume: this.musicVolume, duration: fade });
    this.bgm = next;
    this.bgmKey = actualKey;
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
