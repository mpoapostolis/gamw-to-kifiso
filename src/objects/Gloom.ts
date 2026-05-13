/**
 * Gloom — drifting wisps of the dark wood. They wander near home until the
 * Wanderer's lantern strays close, then list toward it, hungry for warmth. The
 * Warden is a bigger, meaner one that holds the Sunken Shrine.
 */
import Phaser from "phaser";
import { PAL } from "../palette";
import { SFX } from "../sfx";
import type { Fx } from "../types";
import type { Player } from "./Player";

enum St {
  Idle,
  Chase,
  Hurt,
  Dead,
}

export class Gloom extends Phaser.Physics.Arcade.Sprite {
  readonly warden: boolean;
  private hp: number;
  private mode: St = St.Idle;
  private home: Phaser.Math.Vector2;
  private range: number;
  private aggro: number;
  private speed: number;
  private wobble = Math.random() * Math.PI * 2;
  private wanderTo: Phaser.Math.Vector2;
  private nextWanderAt = 0;
  private hurtUntil = 0;
  private roared = false;
  lastHitSwing = -1;
  private glow!: Phaser.GameObjects.Image;
  private player: Player;
  private fx: Fx;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: { warden?: boolean; range?: number }, player: Player, fx: Fx) {
    super(scene, x, y, opts.warden ? "warden_0" : "gloom_0");
    this.warden = !!opts.warden;
    this.player = player;
    this.fx = fx;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = this.warden ? 7 : 3;
    this.range = opts.range ?? 100;
    this.aggro = this.warden ? 260 : 195;
    this.speed = this.warden ? 60 : 78;
    this.home = new Phaser.Math.Vector2(x, y);
    this.wanderTo = this.home.clone();

    this.setOrigin(0.5, 0.86);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const r = this.warden ? 22 : 15;
    body.setCircle(r, this.width / 2 - r, this.height * 0.86 - r * 2 + 2);
    body.setBounce(0.4, 0.4);
    body.setDrag(420, 420);
    body.setMaxVelocity(260, 260);
    body.setCollideWorldBounds(true);
    this.setDepth(y);

    this.glow = scene.add
      .image(x, y, "glow_violet")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 0.5)
      .setScale(((this.warden ? 150 : 95) * 2) / 256)
      .setAlpha(0.7);

    if (this.warden) {
      scene.tweens.add({ targets: this, scaleX: 1.06, scaleY: 0.95, yoyo: true, repeat: -1, duration: 900, ease: "Sine.easeInOut" });
    } else {
      this.play("gloomidle");
      this.anims.setProgress(Math.random());
    }
  }

  get alive() {
    return this.mode !== St.Dead;
  }
  get contactDamage() {
    return this.warden ? 2 : 1;
  }

  takeHit(dmg: number, fromX: number, fromY: number) {
    if (this.mode === St.Dead) return;
    this.hp -= dmg;
    const ang = Math.atan2(this.y - fromY, this.x - fromX);
    const kb = this.warden ? 120 : 230;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * kb, Math.sin(ang) * kb);
    this.hurtUntil = this.scene.time.now + (this.warden ? 140 : 200);
    this.mode = St.Hurt;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.alive && this.clearTint());
    SFX.gloomHit();
    this.fx.hitSpark(this.x, this.y - 8, PAL.gloomGlow, this.warden ? 9 : 6);
    this.fx.shake(this.warden ? 0.01 : 0.006, 130);
    this.fx.hitStop(this.warden ? 60 : 40);
    // a quick squash
    this.scene.tweens.add({ targets: this, scaleX: 0.78, scaleY: 1.2, yoyo: true, duration: 110, ease: "Quad.easeOut" });
    if (this.hp <= 0) this.die(ang);
  }

  private die(awayAng: number) {
    if (this.mode === St.Dead) return;
    this.mode = St.Dead;
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.enable = false;
    this.fx.gloomBurst(this.x, this.y - 6);
    if (this.warden) {
      SFX.warden();
      this.fx.shake(0.02, 420);
      this.fx.embers(this.x, this.y - 6, 22, PAL.gloomGlow);
      this.fx.ringPulse(this.x, this.y - 6, PAL.gloomGlow, 160, 520);
    } else {
      SFX.gloomDie();
    }
    this.scene.tweens.add({
      targets: [this, this.glow],
      alpha: 0,
      scaleX: 1.6,
      scaleY: 0.2,
      x: this.x + Math.cos(awayAng) * 10,
      duration: this.warden ? 480 : 280,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.glow.destroy();
        this.destroy();
      },
    });
    this.scene.events.emit("gloom-killed", { x: this.x, y: this.y, warden: this.warden });
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (this.mode === St.Dead) return;
    const b = this.body as Phaser.Physics.Arcade.Body;
    const t = this.scene.time.now;
    this.wobble += delta * 0.006;

    if (this.mode === St.Hurt) {
      if (t >= this.hurtUntil) this.mode = St.Idle;
    } else {
      const pd = this.player.dead ? Infinity : Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
      if (this.mode === St.Chase) {
        if (pd > this.aggro * 1.9) this.mode = St.Idle;
      } else if (pd < this.aggro) {
        this.mode = St.Chase;
        if (this.warden && !this.roared) {
          this.roared = true;
          SFX.warden();
          this.fx.shake(0.012, 360);
          this.fx.floatText(this.x, this.y - 36, "Ο ΧΟΥΛΙΓΚΑΝ ΣΗΚΩΘΗΚΕ", PAL.gloomGlow);
        }
      }

      if (this.mode === St.Chase) {
        const ang = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y) + Math.sin(this.wobble) * 0.5;
        b.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
      } else {
        // wander near home
        if (t > this.nextWanderAt || Phaser.Math.Distance.Between(this.x, this.y, this.wanderTo.x, this.wanderTo.y) < 14) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * this.range;
          this.wanderTo.set(this.home.x + Math.cos(a) * r, this.home.y + Math.sin(a) * r * 0.8);
          this.nextWanderAt = t + 1200 + Math.random() * 2200;
        }
        const ang = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTo.x, this.wanderTo.y) + Math.sin(this.wobble * 0.7) * 0.4;
        const sp = this.speed * 0.42;
        // ease toward target velocity for floatiness
        b.velocity.x = Phaser.Math.Linear(b.velocity.x, Math.cos(ang) * sp, 0.05);
        b.velocity.y = Phaser.Math.Linear(b.velocity.y, Math.sin(ang) * sp, 0.05);
      }
    }

    // a gentle vertical bob (visual only)
    const bob = Math.sin(this.wobble * 1.6) * (this.warden ? 2 : 1.4);
    this.glow
      .setPosition(this.x, this.y - 6 + bob * 0.5)
      .setDepth(this.y - 0.5)
      .setAlpha(0.6 + Math.sin(this.wobble * 2.3) * 0.15 + (this.mode === St.Chase ? 0.15 : 0));
    this.setDepth(this.y);
    // keep wisps from clumping perfectly on the player while chasing — tiny orbit jitter handled by wobble in angle
  }

  destroy(fromScene?: boolean) {
    this.glow?.destroy();
    super.destroy(fromScene);
  }
}
