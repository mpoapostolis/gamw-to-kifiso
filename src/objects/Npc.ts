/** A villager: stands their ground, breathes with a soft bob, has something to say. */
import Phaser from "phaser";
import type { NpcSpawn } from "../types";

export class Npc extends Phaser.Physics.Arcade.Sprite {
  readonly spawn: NpcSpawn;
  private bob: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, spawn: NpcSpawn) {
    super(scene, spawn.x, spawn.y, spawn.key);
    this.spawn = spawn;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.92);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 12);
    body.setOffset((this.width - 18) / 2, this.height * 0.92 - 12);
    body.setImmovable(true);
    body.moves = false; // it's furniture with feelings — never integrate velocity
    this.setDepth(spawn.y);

    this.bob = scene.tweens.add({
      targets: this,
      y: spawn.y - 2.5,
      duration: 1250 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onYoyo: () => spawn.altKey && this.setTexture(spawn.altKey),
      onRepeat: () => this.setTexture(spawn.key),
    });
  }

  /** Pause the idle bob while in conversation, so they "stand at attention". */
  setTalking(on: boolean) {
    if (on) {
      this.bob.pause();
      this.setTexture(this.spawn.altKey ?? this.spawn.key);
    } else this.bob.resume();
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    // body.moves === false, so this just keeps depth in sync with the bob
    (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    this.setDepth(this.y + 0.0001); // tiny bias so the player draws over an NPC at the same y
  }
}
