/**
 * The Wanderer — top-down, four-facing, lantern-bearing. Moves, swings a blade
 * in a short arc, and rolls (with i-frames). Owns its lantern glow + the light
 * radius the darkness mask reads each frame.
 */
import Phaser from "phaser";
import { PAL } from "../palette";
import { SFX } from "../sfx";
import type { Fx, GameCtx } from "../types";

type Facing = "down" | "up" | "side";

const SPEED = 132;
const ROLL_SPEED = 330;
const ROLL_TIME = 240;
const ROLL_CD = 620;
const ATTACK_CD = 320;
const ATTACK_WINDUP = 55; // ms before the hit window opens
const ATTACK_ACTIVE = 130; // ms the hit window stays open
const ATTACK_PLANT = 175; // ms the player is "planted" (slowed) while swinging
const HURT_LOCK = 240; // ms input is overridden by knockback
const IFRAMES = 950;

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: Facing = "down";
  private flip = false;
  private ctx: GameCtx;
  private fx: Fx;

  // timers (ms remaining / cooldown stamps via scene time)
  private attackUntil = 0; // time when current swing fully ends
  private attackHitOpenAt = 0;
  private attackHitCloseAt = 0;
  private attackReadyAt = 0;
  swingId = 0;
  private rollUntil = 0;
  private rollReadyAt = 0;
  private rollDirX = 0;
  private rollDirY = 1;
  private hurtUntil = 0;
  private iframesUntil = 0;
  dead = false;

  private stepAccum = 0;
  private flickerT = 0;
  /** GameScene raises this during dialog / death so movement & attacks freeze. */
  controlsLocked = false;

  // lantern
  lanternGlow!: Phaser.GameObjects.Image;
  private lanternCore!: Phaser.GameObjects.Image;
  lanternRadius = 150; // px — read by the darkness mask
  private lanternBase = 150;

  // input
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    attack: Phaser.Input.Keyboard.Key;
    roll: Phaser.Input.Keyboard.Key;
    attack2: Phaser.Input.Keyboard.Key; // Enter (alt)
  };
  private pointerAttack = false;

  constructor(scene: Phaser.Scene, x: number, y: number, ctx: GameCtx, fx: Fx) {
    super(scene, x, y, "player_down_0");
    this.ctx = ctx;
    this.fx = fx;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.9);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 14);
    body.setOffset((34 - 16) / 2, 26);
    body.setDrag(900, 900);
    body.setMaxVelocity(420, 420);
    this.setCollideWorldBounds(true);
    this.setDepth(y);

    // lantern visuals (separate objects, kept just above the player)
    this.lanternGlow = scene.add
      .image(x, y, "glow_warm")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 1.5);
    this.lanternCore = scene.add
      .image(x, y, "soft")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(PAL.emberHot)
      .setDepth(y + 1.6)
      .setScale(0.7);
    this.setLanternRadius(150);

    const kb = scene.input.keyboard!;
    this.keys = {
      up: kb.addKey("UP"),
      down: kb.addKey("DOWN"),
      left: kb.addKey("LEFT"),
      right: kb.addKey("RIGHT"),
      w: kb.addKey("W"),
      a: kb.addKey("A"),
      s: kb.addKey("S"),
      d: kb.addKey("D"),
      attack: kb.addKey("SPACE"),
      attack2: kb.addKey("ENTER"),
      roll: kb.addKey("SHIFT"),
    };
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      // ignore clicks on the HUD-less world only — UIScene swallows its own
      if (p.leftButtonDown()) this.pointerAttack = true;
    });

    this.play("idle_down");
  }

  /** Adjust lantern reach (used by area transitions / pickups). */
  setLanternRadius(r: number) {
    this.lanternBase = r;
    this.lanternRadius = r;
    const s = (r * 2) / 256; // glow_warm texture is 256px
    this.lanternGlow.setScale(s * 1.05);
    this.lanternCore.setScale((r / 256) * 1.2);
  }

  private setFacingFromVec(vx: number, vy: number) {
    if (vx === 0 && vy === 0) return;
    if (Math.abs(vx) > Math.abs(vy) * 1.05) {
      this.facing = "side";
      this.flip = vx < 0;
    } else {
      this.facing = vy < 0 ? "up" : "down";
    }
  }

  private playAnim(moving: boolean) {
    const key = (moving ? "walk_" : "idle_") + this.facing;
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
    this.setFlipX(this.facing === "side" && this.flip);
  }

  private aimVec(): { x: number; y: number } {
    if (this.facing === "up") return { x: 0, y: -1 };
    if (this.facing === "down") return { x: 0, y: 1 };
    return { x: this.flip ? -1 : 1, y: 0 };
  }

  get invulnerable() {
    return this.scene.time.now < this.iframesUntil;
  }
  get rolling() {
    return this.scene.time.now < this.rollUntil;
  }
  get attacking() {
    return this.scene.time.now < this.attackUntil;
  }
  /** true only during the brief connect window of a swing */
  get attackActive() {
    const t = this.scene.time.now;
    return t >= this.attackHitOpenAt && t <= this.attackHitCloseAt;
  }
  get attackDamage() {
    return this.ctx.attackBonus ? 2 : 1;
  }
  /** rectangle in front of the player while the hit window is open (else null) */
  get attackArea(): Phaser.Geom.Rectangle | null {
    if (!this.attackActive) return null;
    const a = this.aimVec();
    const reach = 30;
    const w = a.x !== 0 ? 38 : 44;
    const h = a.y !== 0 ? 38 : 44;
    const cx = this.x + a.x * reach;
    const cy = this.y - 6 + a.y * reach; // -6 ~ torso height
    return new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
  }

  tryAttack() {
    const t = this.scene.time.now;
    if (t < this.attackReadyAt || this.rolling || this.dead) return;
    this.attackReadyAt = t + ATTACK_CD;
    this.attackUntil = t + ATTACK_PLANT + 60;
    this.attackHitOpenAt = t + ATTACK_WINDUP;
    this.attackHitCloseAt = t + ATTACK_WINDUP + ATTACK_ACTIVE;
    this.swingId++;
    const a = this.aimVec();
    const ang = Math.atan2(a.y, a.x);
    this.fx.slashArc(this.x + a.x * 18, this.y - 8 + a.y * 16, ang, PAL.emberSoft);
    SFX.swing();
    // a hair of forward weight
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.setVelocity(a.x * 90, a.y * 90);
  }

  tryRoll(inX: number, inY: number) {
    const t = this.scene.time.now;
    if (t < this.rollReadyAt || this.rolling || this.dead) return;
    let dx = inX,
      dy = inY;
    if (dx === 0 && dy === 0) {
      const a = this.aimVec();
      dx = a.x;
      dy = a.y;
    }
    const len = Math.hypot(dx, dy) || 1;
    this.rollDirX = dx / len;
    this.rollDirY = dy / len;
    this.rollUntil = t + ROLL_TIME;
    this.rollReadyAt = t + ROLL_CD;
    this.iframesUntil = Math.max(this.iframesUntil, t + ROLL_TIME + 70);
    this.setFacingFromVec(this.rollDirX, this.rollDirY);
    SFX.dash();
    this.fx.dust(this.x, this.y + 2, 7);
    this.fx.dashTrail(this);
    this.scene.tweens.add({ targets: this, scaleX: 1.18, scaleY: 0.82, yoyo: true, duration: ROLL_TIME / 2, ease: "Sine.easeInOut" });
  }

  /** Apply damage from a source point. Returns true if it actually landed. */
  hurt(amount: number, fromX: number, fromY: number): boolean {
    if (this.invulnerable || this.dead) return false;
    const t = this.scene.time.now;
    this.ctx.hp = Math.max(0, this.ctx.hp - amount);
    this.iframesUntil = t + IFRAMES;
    this.hurtUntil = t + HURT_LOCK;
    const ang = Math.atan2(this.y - fromY, this.x - fromX);
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.setVelocity(Math.cos(ang) * 280, Math.sin(ang) * 280);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.clearTint());
    SFX.hurt();
    this.fx.shake(0.012, 220);
    this.fx.hitSpark(this.x, this.y - 8, PAL.hpRim, 8);
    if (this.ctx.hp <= 0) this.die();
    return true;
  }

  private die() {
    if (this.dead) return;
    this.dead = true;
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.setVelocity(0, 0);
    b.enable = false;
    this.setTint(0x6a5a7a);
    SFX.death();
    this.fx.embers(this.x, this.y - 6, 14, PAL.gloomGlow);
    this.scene.tweens.add({ targets: [this.lanternGlow, this.lanternCore], alpha: 0, scale: 0, duration: 600 });
    this.scene.tweens.add({ targets: this, angle: this.facing === "side" && this.flip ? 80 : -80, y: this.y + 4, duration: 600, ease: "Quad.easeIn" });
    this.scene.events.emit("player-died");
  }

  /** Bring the player back at a safe spot (called by GameScene on respawn). */
  revive(x: number, y: number) {
    this.dead = false;
    this.setActive(true).setVisible(true);
    this.setPosition(x, y);
    this.setAngle(0).setScale(1).clearTint();
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.enable = true;
    b.reset(x, y);
    this.iframesUntil = this.scene.time.now + 1500;
    this.lanternGlow.setAlpha(1);
    this.lanternCore.setAlpha(1);
    this.setLanternRadius(this.lanternBase);
    this.play("idle_" + this.facing);
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (this.dead) {
      this.lanternGlow.setPosition(this.x, this.y);
      this.lanternCore.setPosition(this.x, this.y);
      return;
    }
    const b = this.body as Phaser.Physics.Arcade.Body;
    const t = this.scene.time.now;

    let ix = 0,
      iy = 0,
      moving = false;

    if (this.controlsLocked) {
      this.pointerAttack = false;
      if (!this.rolling) b.setVelocity(0, 0);
      else b.setVelocity(this.rollDirX * ROLL_SPEED, this.rollDirY * ROLL_SPEED);
    } else {
      // ---- input -------------------------------------------------------
      if (this.keys.left.isDown || this.keys.a.isDown) ix -= 1;
      if (this.keys.right.isDown || this.keys.d.isDown) ix += 1;
      if (this.keys.up.isDown || this.keys.w.isDown) iy -= 1;
      if (this.keys.down.isDown || this.keys.s.isDown) iy += 1;
      const len = Math.hypot(ix, iy);
      if (len > 0) {
        ix /= len;
        iy /= len;
      }

      const wantAttack = Phaser.Input.Keyboard.JustDown(this.keys.attack) || Phaser.Input.Keyboard.JustDown(this.keys.attack2) || this.pointerAttack;
      this.pointerAttack = false;
      if (Phaser.Input.Keyboard.JustDown(this.keys.roll)) this.tryRoll(ix, iy);
      if (wantAttack) this.tryAttack();

      // ---- locomotion --------------------------------------------------
      if (this.rolling) {
        b.setVelocity(this.rollDirX * ROLL_SPEED, this.rollDirY * ROLL_SPEED);
      } else if (t < this.hurtUntil) {
        // knockback owns velocity; leave it be
      } else {
        const sp = SPEED * (this.attacking ? 0.32 : 1);
        if (len > 0) {
          b.setVelocity(ix * sp, iy * sp);
          if (!this.attacking) this.setFacingFromVec(ix, iy);
        } else if (b.velocity.lengthSq() < 9) {
          b.setVelocity(0, 0);
        }
      }

      moving = b.velocity.lengthSq() > 64 && !this.attacking && t >= this.hurtUntil;

      // ---- footsteps ---------------------------------------------------
      if (moving && !this.rolling) {
        this.stepAccum += b.velocity.length() * (delta / 1000);
        if (this.stepAccum > 26) {
          this.stepAccum = 0;
          SFX.footstep();
          this.fx.dust(this.x + Phaser.Math.Between(-3, 3), this.y + 1, 1);
        }
      } else this.stepAccum = Math.min(this.stepAccum, 20);
    }

    // ---- animation -----------------------------------------------------
    this.playAnim(moving || this.rolling);
    if (this.rolling) this.anims.pause();
    else this.anims.resume();

    // ---- invuln flicker ------------------------------------------------
    if (this.invulnerable && !this.dead) {
      this.flickerT += delta;
      this.setAlpha(Math.sin(this.flickerT * 0.05) > 0 ? 1 : 0.35);
    } else {
      this.setAlpha(1);
      this.flickerT = 0;
    }

    // ---- lantern flicker + follow --------------------------------------
    const fl = 1 + Math.sin(t * 0.013) * 0.05 + (Math.random() - 0.5) * 0.06;
    this.lanternRadius = this.lanternBase * fl;
    const baseS = (this.lanternBase * 2) / 256;
    this.lanternGlow.setScale(baseS * 1.05 * fl).setAlpha(0.85 + (fl - 1) * 1.4);
    this.lanternCore.setScale((this.lanternBase / 256) * 1.2 * fl).setAlpha(0.9);
    const lx = this.x;
    const ly = this.y - 10;
    this.lanternGlow.setPosition(lx, ly).setDepth(this.y + 1.5);
    this.lanternCore.setPosition(lx, ly).setDepth(this.y + 1.6);

    // ---- depth sort ----------------------------------------------------
    this.setDepth(this.y);
  }

  destroy(fromScene?: boolean) {
    this.lanternGlow?.destroy();
    this.lanternCore?.destroy();
    super.destroy(fromScene);
  }
}
