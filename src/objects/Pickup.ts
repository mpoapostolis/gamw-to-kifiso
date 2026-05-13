/** A floaty collectible — coins (mostly from Gloom), heart charms, vials. */
import Phaser from "phaser";
import { PAL } from "../palette";
import { SFX } from "../sfx";
import type { Fx, GameCtx, PickupKind } from "../types";
import type { Player } from "./Player";

const TEX: Record<PickupKind, string> = { coin: "coin_0", heart: "heart_pickup", potion: "potion" };

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  readonly kind: PickupKind;
  readonly value: number;
  private collected = false;
  private magnetAt: number;
  private player: Player;
  private glow: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: PickupKind,
    value: number,
    player: Player,
    opts?: { scatter?: number; settleDelay?: number },
  ) {
    super(scene, x, y, TEX[kind]);
    this.kind = kind;
    this.value = value;
    this.player = player;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.85);
    this.setDepth(y);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(8, this.width / 2 - 8, this.height / 2 - 6);
    body.setDrag(360, 360);
    body.setBounce(0.35, 0.35);
    body.setCollideWorldBounds(true);
    this.magnetAt = scene.time.now + (opts?.settleDelay ?? 0);

    if (opts?.scatter) {
      const a = Math.random() * Math.PI * 2;
      const sp = opts.scatter * (0.5 + Math.random() * 0.5);
      body.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
    }

    // pop-in
    this.setScale(0);
    scene.tweens.add({ targets: this, scale: 1, duration: 220, ease: "Back.easeOut" });

    if (kind === "coin") {
      this.play("coinspin");
      this.anims.setProgress(Math.random());
    } else {
      scene.tweens.add({ targets: this, scaleX: { from: 1, to: 0.82 }, yoyo: true, repeat: -1, duration: 700, ease: "Sine.easeInOut", delay: 220 });
    }

    const glowTint = kind === "heart" ? PAL.heartHi : kind === "potion" ? PAL.potionHi : PAL.goldHi;
    this.glow = scene.add
      .image(x, y + 4, "soft")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(glowTint)
      .setScale(0.95)
      .setAlpha(0.5)
      .setDepth(y - 0.5);
    scene.tweens.add({ targets: this.glow, alpha: { from: 0.35, to: 0.65 }, scale: { from: 0.85, to: 1.1 }, yoyo: true, repeat: -1, duration: 900 });
  }

  collect(ctx: GameCtx, fx: Fx) {
    if (this.collected) return;
    this.collected = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    if (this.kind === "coin") {
      ctx.giveGold(this.value);
      SFX.coin();
      fx.pop(this.x, this.y, PAL.goldHi);
      fx.floatText(this.x, this.y - 10, `+${this.value}`, PAL.gold);
    } else if (this.kind === "heart") {
      ctx.heal(2);
      SFX.heal();
      fx.pop(this.x, this.y, PAL.heartHi);
      fx.ringPulse(this.x, this.y, PAL.heart, 40, 360);
      fx.floatText(this.x, this.y - 10, "+ heart", PAL.heartHi);
    } else {
      ctx.healFull();
      SFX.heal();
      fx.pop(this.x, this.y, PAL.potionHi);
      fx.ringPulse(this.x, this.y, PAL.potion, 48, 420);
      fx.floatText(this.x, this.y - 10, "restored!", PAL.potionHi);
    }
    this.glow.destroy();
    this.scene.tweens.add({ targets: this, y: this.y - 16, scale: 1.7, alpha: 0, duration: 240, ease: "Quad.easeOut", onComplete: () => this.destroy() });
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (this.collected) return;
    const b = this.body as Phaser.Physics.Arcade.Body;
    if (!this.player.dead && this.scene.time.now > this.magnetAt) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
      if (d < 90) {
        const ang = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        const pull = Phaser.Math.Linear(70, 340, Phaser.Math.Clamp(1 - d / 90, 0, 1));
        b.velocity.x = Phaser.Math.Linear(b.velocity.x, Math.cos(ang) * pull, 0.22);
        b.velocity.y = Phaser.Math.Linear(b.velocity.y, Math.sin(ang) * pull, 0.22);
      } else if (b.velocity.lengthSq() < 25) b.setVelocity(0, 0);
    } else if (b.velocity.lengthSq() < 25) b.setVelocity(0, 0);
    this.glow.setPosition(this.x, this.y + 4).setDepth(this.y - 0.5);
    this.setDepth(this.y);
  }

  destroy(fromScene?: boolean) {
    this.glow?.destroy();
    super.destroy(fromScene);
  }
}
