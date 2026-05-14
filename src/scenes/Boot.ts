/** Boot: forge every procedural texture, define animations, wait for fonts, go. */
import Phaser from "phaser";
import { buildTextures, buildCursor } from "../textures";
import { Audio } from "../audio";
import { GameState } from "../state/gameState";

function anim(scene: Phaser.Scene, key: string, frames: string[], frameRate: number, repeat = -1) {
  if (scene.anims.exists(key)) return;
  scene.anims.create({ key, frames: frames.map((f) => ({ key: f })), frameRate, repeat });
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    Audio.preload(this);
    // hydrate persistent state from localStorage exactly once.
    GameState.load();
  }

  create() {
    this.cameras.main.setBackgroundColor("#07060d");
    buildTextures(this);

    // ---- animations ----------------------------------------------------
    anim(this, "wateranim", ["water0", "water1", "water2", "water1"], 5);
    anim(this, "fireflicker", ["fire0", "fire1", "fire2", "fire1"], 10);
    anim(this, "coinspin", ["coin_0", "coin_1", "coin_2", "coin_3"], 11);
    anim(this, "gloomidle", ["gloom_0", "gloom_1", "gloom_0", "gloom_2"], 4);
    for (const f of ["down", "up", "side"] as const) {
      anim(this, `idle_${f}`, [`player_${f}_0`], 1);
      anim(this, `walk_${f}`, [`player_${f}_0`, `player_${f}_1`, `player_${f}_0`, `player_${f}_2`], f === "side" ? 10 : 9);
    }

    // ---- cursor --------------------------------------------------------
    try {
      this.input.setDefaultCursor(buildCursor());
    } catch {
      /* canvas/data-url unavailable — fall back to default */
    }

    // ---- fonts, then title --------------------------------------------
    const fontsReady = Promise.all([
      document.fonts.load('400 16px "Spectral"'),
      document.fonts.load('600 16px "Spectral"'),
      document.fonts.load('italic 400 16px "Spectral"'),
      document.fonts.load('600 16px "Cinzel"'),
      document.fonts.load('800 16px "Cinzel"'),
    ]).catch(() => undefined);

    const hidePreload = () => {
      const el = document.getElementById("preload");
      if (el) {
        el.classList.add("hide");
        setTimeout(() => el.remove(), 700);
      }
    };

    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
      hidePreload();
      this.scene.start("Title");
    });
  }
}
