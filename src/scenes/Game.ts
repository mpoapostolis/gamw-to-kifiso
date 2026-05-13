/**
 * Game — ο κόσμος σε κίνηση: terrain, ο Αθηναίος, οι οδηγοί-Gloom, οι γείτονες,
 * το lighting model του δρόμου, και όλο το wiring (κόρνα-vs-κίνηση, καφέδες,
 * διάλογοι, η quest με τις 5 κορνάρες, θάνατος & ξύπνημα δίπλα στο βαρέλι).
 */
import Phaser from "phaser";
import { DEPTH, VIEW_H, VIEW_W } from "../consts";
import { hex, mix, PAL } from "../palette";
import { SFX } from "../sfx";
import { MUSIC } from "../music";
import { Audio } from "../audio";
import { buildWorld, WORLD_H, WORLD_W } from "../map";
import { EPILOGUE_BURN, EPILOGUE_RETURN, PROLOGUE } from "../story";
import { activeQuest, QUESTS } from "../quests";
import type { Fx, GameCtx, World } from "../types";
import { Player } from "../objects/Player";
import { Gloom } from "../objects/Gloom";
import { Npc } from "../objects/Npc";
import { Pickup } from "../objects/Pickup";
import type { UIScene } from "./Ui";

/** A door / portal that the player can interact with to enter another scene. */
interface Door {
  x: number;
  y: number;
  label: string;
  gatedLabel?: string;
  act: () => void;
  gated?: () => boolean;
  marker?: Phaser.GameObjects.Image;
  beacon?: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
}

export class GameScene extends Phaser.Scene {
  ctx!: GameCtx;
  player!: Player;
  world!: World;
  fx!: Fx;
  /** UIScene reads this in its create() to know we're waiting on the prologue. */
  pendingPrologue = true;

  private ui!: UIScene;
  private gloomGroup!: Phaser.Physics.Arcade.Group;
  private npcGroup!: Phaser.Physics.Arcade.Group;
  private pickupGroup!: Phaser.Physics.Arcade.Group;

  // lighting
  private darkRT!: Phaser.GameObjects.RenderTexture;
  private glowStamp!: Phaser.GameObjects.Image;
  private blooms: { x: number; y: number; r: number; warm: boolean; flicker: number; img: Phaser.GameObjects.Image; phase: number }[] = [];
  private dark = 0.55;

  // particles
  private pAmbient!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pDust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pEmber!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pGloom!: Phaser.GameObjects.Particles.ParticleEmitter;

  // state
  private keyE!: Phaser.Input.Keyboard.Key;
  private inDialog = false;
  private inStory = false;
  private areaName = "";
  private hitStopUntil = 0;
  private deathHandled = false;

  // 11:55 cleaner phase state
  cleanerPhase = false;
  private cleaners: Phaser.Physics.Arcade.Sprite[] = [];
  private cleanerOverlap: Phaser.Physics.Arcade.Collider | null = null;
  private cleanerVignette: Phaser.GameObjects.Rectangle | null = null;
  private cleanerEndsAt = 0;

  // doors / portals — built once in create(), iterated in update()
  private doors: Door[] = [];

  constructor() {
    super("Game");
  }

  create() {
    this.deathHandled = false;
    this.pendingPrologue = true;
    this.inDialog = false;
    this.inStory = false;
    this.cameras.main.setBackgroundColor(hex(PAL.night));

    // ---- run-state -----------------------------------------------------
    const startHp = 10;
    this.ctx = {
      hp: startHp,
      maxHp: startHp,
      gold: 0,
      gloomKilled: 0,
      questState: 0,
      wardenDown: false,
      attackBonus: false,
      flags: {},
      day: 1,
      time: 7 * 60, // wake up at 07:00
      notes: {},
      inventory: { house_key: true, wallet: true },
      dayStartNotes: {},
      dayStartInventory: { house_key: true, wallet: true },
      giveGold: (n) => {
        this.ctx.gold += n;
        this.ui?.setGold(this.ctx.gold);
      },
      takeGold: (n) => {
        this.ctx.gold = Math.max(0, this.ctx.gold - n);
        this.ui?.setGold(this.ctx.gold);
      },
      giveHeartContainer: () => {
        this.ctx.maxHp += 2;
        this.ctx.hp = Math.min(this.ctx.maxHp, this.ctx.hp + 2);
        this.ui?.setHearts(this.ctx.hp, this.ctx.maxHp, true);
      },
      healFull: () => {
        this.ctx.hp = this.ctx.maxHp;
        this.ui?.setHearts(this.ctx.hp, this.ctx.maxHp);
      },
      heal: (n) => {
        this.ctx.hp = Math.min(this.ctx.maxHp, this.ctx.hp + n);
        this.ui?.setHearts(this.ctx.hp, this.ctx.maxHp);
      },
      toast: (t, tint) => this.ui?.toast(t, tint),
      addNote: (id) => {
        if (this.ctx.notes[id]) return;
        this.ctx.notes[id] = true;
        this.ui?.addNote(id);
      },
      addItem: (id) => {
        if (this.ctx.inventory[id]) return;
        this.ctx.inventory[id] = true;
        this.ui?.addItem(id);
      },
    };

    this.scene.launch("UI");
    this.ui = this.scene.get("UI") as unknown as UIScene;

    // ---- world ---------------------------------------------------------
    this.world = buildWorld(this);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // ---- fx ------------------------------------------------------------
    this.makeFx();

    // ---- player + camera ----------------------------------------------
    this.player = new Player(this, this.world.playerStart.x, this.world.playerStart.y, this.ctx, this.fx);
    this.cameras.main.startFollow(this.player, true, 0.13, 0.13);
    this.cameras.main.setDeadzone(140, 96);
    this.cameras.main.centerOn(this.player.x, this.player.y);

    // ---- actors --------------------------------------------------------
    this.gloomGroup = this.physics.add.group();
    this.npcGroup = this.physics.add.group();
    this.pickupGroup = this.physics.add.group();
    for (const g of this.world.gloom) this.gloomGroup.add(new Gloom(this, g.x, g.y, { warden: g.warden, range: g.range }, this.player, this.fx));
    for (const n of this.world.npcs) this.npcGroup.add(new Npc(this, n));
    for (const p of this.world.pickups) this.pickupGroup.add(new Pickup(this, p.x, p.y, p.kind, p.value ?? 1, this.player));

    // ---- physics -------------------------------------------------------
    const solids = this.world.solids;
    this.physics.add.collider(this.player, solids);
    this.physics.add.collider(this.gloomGroup, solids);
    this.physics.add.collider(this.npcGroup, solids);
    this.physics.add.collider(this.gloomGroup, this.gloomGroup);
    this.physics.add.collider(this.player, this.npcGroup);
    this.physics.add.overlap(this.player, this.gloomGroup, (_p, g) => {
      const gl = g as Gloom;
      if (!gl.alive || this.player.dead) return;
      if (this.player.hurt(gl.contactDamage, gl.x, gl.y)) {
        this.ui?.setHearts(this.ctx.hp, this.ctx.maxHp);
        const a = Phaser.Math.Angle.Between(gl.x, gl.y, this.player.x, this.player.y);
        (gl.body as Phaser.Physics.Arcade.Body).setVelocity(-Math.cos(a) * 150, -Math.sin(a) * 150);
      }
    });
    this.physics.add.overlap(this.player, this.pickupGroup, (_p, pk) => (pk as Pickup).collect(this.ctx, this.fx));

    // ---- lighting ------------------------------------------------------
    this.setupLighting();

    // ---- input ---------------------------------------------------------
    this.keyE = this.input.keyboard!.addKey("E");
    this.input.keyboard!.on("keydown-M", () => {
      const m = SFX.toggleMute();
      MUSIC.setMuted(m);
      Audio.setMuted(m);
      this.ui?.toast(m ? "sound off" : "sound on", PAL.inkDim);
    });
    SFX.unlock();
    MUSIC.start();
    Audio.startMusic(this);

    // ---- doors / portals + their visible beacons -----------------------
    this.buildDoors();

    // ---- events --------------------------------------------------------
    this.events.on("gloom-killed", this.onGloomKilled, this);
    this.events.on("player-died", this.onPlayerDied, this);
    this.events.on("home-exit", (pt: { x: number; y: number }) => {
      this.player.setPosition(pt.x, pt.y);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(pt.x, pt.y);
      this.cameras.main.fadeIn(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
      this.player.controlsLocked = false;
    });
    this.events.on("facility-exit", (pt: { x: number; y: number }) => {
      this.player.setPosition(pt.x, pt.y);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(pt.x, pt.y);
      this.cameras.main.fadeIn(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
      this.player.controlsLocked = false;
      Audio.playMusic(this, "music_hope");
    });
    this.events.on("facility-offer-ending", () => this.offerEnding());
    this.events.on("park-exit", (pt: { x: number; y: number }) => {
      this.player.setPosition(pt.x, pt.y);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(pt.x, pt.y);
      this.cameras.main.fadeIn(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
      this.player.controlsLocked = false;
      Audio.playMusic(this, "music_hope");
    });
    this.events.on("despoina-exit", (pt: { x: number; y: number }) => {
      this.player.setPosition(pt.x, pt.y);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(pt.x, pt.y);
      this.cameras.main.fadeIn(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
      this.player.controlsLocked = false;
      Audio.playMusic(this, "music_hope");
    });
    this.events.on("cafe-exit", (pt: { x: number; y: number }) => {
      this.player.setPosition(pt.x, pt.y);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(pt.x, pt.y);
      this.cameras.main.fadeIn(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
      this.player.controlsLocked = false;
      Audio.playMusic(this, "music_hope");
    });
    this.events.on("clinic-exit", (pt: { x: number; y: number }) => {
      this.player.setPosition(pt.x, pt.y);
      (this.player.body as Phaser.Physics.Arcade.Body).reset(pt.x, pt.y);
      this.cameras.main.fadeIn(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
      this.player.controlsLocked = false;
      Audio.playMusic(this, "music_hope");
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off("gloom-killed", this.onGloomKilled, this);
      this.events.off("player-died", this.onPlayerDied, this);
    });

    // ---- open on the prologue -----------------------------------------
    this.player.controlsLocked = true;
    this.inStory = true;
    this.cameras.main.fadeIn(800, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
  }

  /** Called by UIScene once its HUD exists, to run the opening crawl. */
  startPrologue() {
    this.pendingPrologue = false;
    this.ui.showStory("YESTERDAY ECHOES", PROLOGUE, () => {
      this.inStory = false;
      this.player.controlsLocked = false;
      this.ui.showAreaBanner("ACT I · Awakening");
      this.time.delayedCall(3200, () => this.ui.showAreaBanner("Diona Community · Day 1"));
      this.ui.toast("E talk · TAB notebook · I pocket", PAL.inkDim);
    });
  }

  /* ===================================================================== *
   * UPDATE                                                                *
   * ===================================================================== */
  update(time: number, _delta: number) {
    // hit-stop release
    if (this.physics.world.isPaused && time >= this.hitStopUntil) this.physics.world.resume();

    // ---- time-of-day advance -------------------------------------------
    if (!this.inDialog && !this.inStory && !this.player.dead && !this.cleanerPhase) {
      const TIME_RATE = 5.5; // in-game minutes per real second
      this.ctx.time += (_delta / 1000) * TIME_RATE;
      const t = Math.floor(this.ctx.time);
      const dangerSoon = t >= 23 * 60 + 30 && t < 23 * 60 + 55;
      const danger = t >= 23 * 60 + 55;
      this.ui?.setClock(t, this.ctx.day, danger || dangerSoon);
      if (dangerSoon && !this.ctx.flags.latenightWarned) {
        this.ctx.flags.latenightWarned = true;
        this.ui?.toast("the night is getting close. go home.", PAL.gloomGlow);
      }
      if (danger && !this.cleanerPhase && this.ctx.day >= 3) {
        this.startCleanerPhase();
      } else if (danger && this.ctx.day < 3) {
        // before day 3 the night still ends, just without cleaners
        this.advanceDay(false);
      }
    }
    // keep the clock UI in sync even during pauses
    if ((this.inDialog || this.inStory) && this.ui) {
      this.ui.setClock(Math.floor(this.ctx.time), this.ctx.day);
    }

    // ---- attack hits ---------------------------------------------------
    if (this.player.attackActive) {
      const area = this.player.attackArea!;
      for (const g of this.gloomGroup.getChildren()) {
        const gl = g as Gloom;
        if (!gl.alive || gl.lastHitSwing === this.player.swingId) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(area, gl.getBounds())) {
          gl.lastHitSwing = this.player.swingId;
          gl.takeHit(this.player.attackDamage, this.player.x, this.player.y);
        }
      }
    }

    // ---- nearby NPC / door interaction --------------------------------
    if (!this.inDialog && !this.inStory && !this.player.dead) {
      // NPC nearest within 58px
      let best: Npc | null = null;
      let bestD = 58;
      for (const n of this.npcGroup.getChildren()) {
        const npc = n as Npc;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
        if (d < bestD) {
          bestD = d;
          best = npc;
        }
      }
      // closest door from the pre-built list
      let bestDoor: Door | null = null;
      let bestDoorD = 64;
      for (const d of this.doors) {
        const dd = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.x, d.y);
        if (dd < bestDoorD) {
          bestDoorD = dd;
          bestDoor = d;
        }
      }
      if (best) {
        this.ui?.showPrompt(`E  ·  ${best.spawn.name}`, best.x - this.cameras.main.worldView.x, best.y - this.cameras.main.worldView.y - 56);
      } else if (bestDoor) {
        const open = bestDoor.gated ? bestDoor.gated() : true;
        const text = open ? bestDoor.label : bestDoor.gatedLabel ?? bestDoor.label;
        this.ui?.showPrompt(text, bestDoor.x - this.cameras.main.worldView.x, bestDoor.y - this.cameras.main.worldView.y - 30);
      } else this.ui?.hidePrompt();
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
        if (best) this.startDialog(best);
        else if (bestDoor && (bestDoor.gated ? bestDoor.gated() : true)) bestDoor.act();
      }
      // tone the locked-door beacons down
      for (const d of this.doors) {
        if (d.beacon && d.gated) {
          d.beacon.setAlpha(d.gated() ? 1 : 0.25);
        }
      }
    } else this.ui?.hidePrompt();

    // ---- area banners --------------------------------------------------
    this.updateArea();

    // ---- lighting ------------------------------------------------------
    this.updateLighting(_delta);

    // ---- ambient emitter follows player --------------------------------
    this.pAmbient.setPosition(this.player.x, this.player.y);

    // ---- HUD: active quest + mini-map ----------------------------------
    if (this.ui) {
      const q = activeQuest(this.ctx);
      this.ui.setActiveQuest(q ? q.title : "—", q ? q.hint : "");
      const doorsForMap = this.doors.map((d) => ({ x: d.x, y: d.y, open: d.gated ? d.gated() : true }));
      const npcsForMap = this.npcGroup.getChildren().map((n) => ({ x: (n as Npc).x, y: (n as Npc).y }));
      this.ui.setMinimap(this.player.x, this.player.y, WORLD_W, WORLD_H, doorsForMap, npcsForMap);
    }

    // ---- automatic quest reward checks ---------------------------------
    for (const def of QUESTS) {
      const flagKey = "_rewarded_" + def.id;
      if (this.ctx.flags[flagKey]) continue;
      if (!def.isComplete(this.ctx)) continue;
      this.ctx.flags[flagKey] = true;
      if (def.reward?.memories) {
        this.ctx.giveGold(def.reward.memories);
        this.ui?.toast(`+${def.reward.memories} memories  ·  ${def.title}`, PAL.emberHot);
      } else {
        this.ui?.toast(`✓  ${def.title}`, PAL.emberHot);
      }
      if (def.reward?.note) this.ctx.addNote(def.reward.note);
      if (def.reward?.item) this.ctx.addItem(def.reward.item);
      if (def.reward?.unlocks) this.ctx.flags[def.reward.unlocks] = true;
    }

    // ---- cleaner phase chase -------------------------------------------
    if (this.cleanerPhase) this.updateCleaners(_delta);
  }

  /* ===================================================================== *
   * DIALOG                                                                *
   * ===================================================================== */
  private startDialog(npc: Npc) {
    if (this.inDialog) return;
    this.inDialog = true;
    this.player.controlsLocked = true;
    npc.setTalking(true);
    SFX.open();
    this.ui.hidePrompt();
    const pages = npc.spawn.dialog(this.ctx);
    this.ui.showDialog(pages, () => {
      this.inDialog = false;
      npc.setTalking(false);
      this.player.controlsLocked = false;
      this.ui.setHearts(this.ctx.hp, this.ctx.maxHp);
      this.ui.setGold(this.ctx.gold);
      this.ui.setKills(this.ctx.gloomKilled);
      // post-dialog hook: if the Επιστάτης has just made the offer, present
      // the binary ending choice
      if (npc.spawn.id === "epistatis" && this.ctx.flags.endingAvailable && !this.ctx.flags.endingChosen) {
        this.offerEnding();
      }
    });
  }

  /** Descend the stairwell into the underground facility. */
  private enterFacility(at: { x: number; y: number }) {
    this.player.controlsLocked = true;
    this.ui.hidePrompt();
    SFX.open();
    this.cameras.main.fadeOut(620, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.sleep();
      this.scene.launch("Facility", { returnAt: at });
    });
  }

  /** Build every interactable portal once + paint its persistent beacon. */
  private buildDoors() {
    const defs: Door[] = [
      { x: 13 * 48 + 24, y: 18 * 48 + 4, label: "E  ·  inside", act: () => this.enterHome({ x: 13 * 48 + 24, y: 18 * 48 + 4 }) },
      {
        x: 50.5 * 48,
        y: 22 * 48,
        label: "E  ·  descend",
        gated: () => !!this.ctx.flags.kostasReveal && !this.ctx.flags.endingChosen,
        gatedLabel: "the way isn't ready yet",
        act: () => this.enterFacility({ x: 50.5 * 48, y: 22 * 48 }),
      },
      { x: 8 * 48 + 24, y: 16 * 48, label: "E  ·  Mrs. Despoina's", act: () => this.enterDespoina({ x: 8 * 48 + 24, y: 16 * 48 }) },
      { x: 16 * 48, y: 34 * 48, label: "E  ·  to the park", act: () => this.enterPark({ x: 16 * 48, y: 34 * 48 - 4 }) },
      { x: 10 * 48 + 24, y: 22 * 48 + 14, label: "E  ·  the café", act: () => this.enterCafe({ x: 10 * 48 + 24, y: 22 * 48 + 14 }) },
      { x: 27 * 48 + 24, y: 14 * 48 - 4, label: "E  ·  the clinic", act: () => this.enterClinic({ x: 27 * 48 + 24, y: 14 * 48 - 4 }) },
    ];
    this.doors = defs;
    for (const d of this.doors) {
      // a warm ground-glow so the door reads as walkable
      const glow = this.add
        .image(d.x, d.y, "glow_warm")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.05)
        .setAlpha(0.55)
        .setDepth(d.y - 2);
      this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 0.7 }, scale: { from: 1.0, to: 1.15 }, yoyo: true, repeat: -1, duration: 1700, ease: "Sine.easeInOut" });
      d.glow = glow;
      // a chevron floating above the door — bobs up and down
      const beacon = this.add
        .image(d.x, d.y - 60, "chevron")
        .setOrigin(0.5)
        .setScale(2.4)
        .setTint(PAL.emberHot)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(d.y + 200);
      this.tweens.add({ targets: beacon, y: d.y - 72, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: beacon, alpha: { from: 0.85, to: 1 }, yoyo: true, repeat: -1, duration: 700, ease: "Sine.easeInOut" });
      d.beacon = beacon;
    }
  }

  private enterPark(at: { x: number; y: number }) {
    this.player.controlsLocked = true;
    this.ui.hidePrompt();
    SFX.open();
    this.cameras.main.fadeOut(420, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.sleep();
      this.scene.launch("Park", { returnAt: at });
    });
  }

  private enterCafe(at: { x: number; y: number }) {
    this.player.controlsLocked = true;
    this.ui.hidePrompt();
    SFX.open();
    this.cameras.main.fadeOut(420, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.sleep();
      this.scene.launch("Cafe", { returnAt: at });
    });
  }

  private enterClinic(at: { x: number; y: number }) {
    this.player.controlsLocked = true;
    this.ui.hidePrompt();
    SFX.open();
    this.cameras.main.fadeOut(420, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.sleep();
      this.scene.launch("Clinic", { returnAt: at });
    });
  }

  private enterDespoina(at: { x: number; y: number }) {
    this.player.controlsLocked = true;
    this.ui.hidePrompt();
    SFX.open();
    this.cameras.main.fadeOut(420, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.sleep();
      this.scene.launch("Despoina", { returnAt: at });
    });
  }

  /** Step into Helena's home — fade out, sleep this scene, launch HomeScene. */
  private enterHome(door: { x: number; y: number }) {
    this.player.controlsLocked = true;
    this.ui.hidePrompt();
    SFX.open();
    // entering home during the cleaner phase escapes it (no wipe)
    if (this.cleanerPhase) this.escapeCleanerPhase();
    this.cameras.main.fadeOut(380, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.sleep();
      this.scene.launch("Home", { returnAt: door });
    });
  }

  /* ===================================================================== *
   * CLEANER PHASE — the 11:55 hide-or-be-wiped loop                       *
   * ===================================================================== */
  private startCleanerPhase() {
    this.cleanerPhase = true;
    this.cleanerEndsAt = this.time.now + 30_000; // 30s grace to reach home
    Audio.duckMusic(this, 0.05);
    Audio.startHeartbeat(this, false);
    SFX.thunderHint();
    this.cameras.main.shake(220, 0.006);
    // freeze NPC bobs
    for (const n of this.npcGroup.getChildren()) (n as Npc).setTalking(true);
    // big toast
    this.ui?.toast("THEY ARE HERE.  RUN HOME.", PAL.gloomGlow);
    // a desaturating overlay
    this.cleanerVignette = this.add
      .rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x100c1a, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.darkness - 1);
    this.tweens.add({ targets: this.cleanerVignette, fillAlpha: 0.45, duration: 800 });
    // spawn 3 cleaners around the player
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2 + Math.random() * 0.4;
      const r = 220 + Math.random() * 80;
      const x = Phaser.Math.Clamp(this.player.x + Math.cos(ang) * r, 200, WORLD_W - 200);
      const y = Phaser.Math.Clamp(this.player.y + Math.sin(ang) * r, 200, WORLD_H - 200);
      const c = this.physics.add.sprite(x, y, "npc_cleaner").setOrigin(0.5, 0.92).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0).setDepth(y);
      const body = c.body as Phaser.Physics.Arcade.Body;
      body.setSize(16, 14);
      body.setOffset((c.width - 16) / 2, c.height * 0.92 - 14);
      body.setMaxVelocity(80, 80);
      this.tweens.add({ targets: c, alpha: 0.95, duration: 600 });
      // halo
      const halo = this.add.image(x, y - 18, "glow_violet").setBlendMode(Phaser.BlendModes.ADD).setDepth(y - 0.5).setScale(1.1).setAlpha(0);
      this.tweens.add({ targets: halo, alpha: 0.5, duration: 600 });
      c.setData("halo", halo);
      this.cleaners.push(c);
    }
    // contact = caught
    this.cleanerOverlap = this.physics.add.overlap(this.player, this.cleaners, () => this.onCaughtByCleaner());
  }

  private updateCleaners(_delta: number) {
    if (!this.cleanerPhase) return;
    for (const c of this.cleaners) {
      const ang = Phaser.Math.Angle.Between(c.x, c.y, this.player.x, this.player.y);
      const speed = 38; // slow drift — outrunnable but inexorable
      (c.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
      c.setDepth(c.y);
      const halo = c.getData("halo") as Phaser.GameObjects.Image;
      if (halo) halo.setPosition(c.x, c.y - 18).setDepth(c.y - 0.5);
    }
    // safety net: if the phase has been running 60s past the deadline
    if (this.time.now > this.cleanerEndsAt + 30_000) this.onCaughtByCleaner();
  }

  /** Called when a cleaner overlaps the player, or when time runs out outside. */
  private onCaughtByCleaner() {
    if (!this.cleanerPhase || this.ctx.flags.endingChosen) return;
    this.endCleanerPhase(true /* wiped */);
  }

  /** Called from enterHome — the player escaped, no wipe. */
  escapeCleanerPhase() {
    if (this.cleanerPhase) this.endCleanerPhase(false);
  }

  private endCleanerPhase(wiped: boolean) {
    this.cleanerPhase = false;
    Audio.stopHeartbeat();
    Audio.unduckMusic(this);
    if (this.cleanerOverlap) {
      this.cleanerOverlap.destroy();
      this.cleanerOverlap = null;
    }
    for (const c of this.cleaners) {
      const halo = c.getData("halo") as Phaser.GameObjects.Image | null;
      this.tweens.add({ targets: [c, halo].filter(Boolean), alpha: 0, duration: 500, onComplete: () => { c.destroy(); halo?.destroy(); } });
    }
    this.cleaners = [];
    if (this.cleanerVignette) {
      const v = this.cleanerVignette;
      this.cleanerVignette = null;
      this.tweens.add({ targets: v, fillAlpha: 0, duration: 700, onComplete: () => v.destroy() });
    }
    // un-freeze NPCs
    for (const n of this.npcGroup.getChildren()) (n as Npc).setTalking(false);
    this.advanceDay(wiped);
  }

  /** Advance the in-game day. If `wiped`, roll back today's notes + items. */
  advanceDay(wiped: boolean) {
    if (wiped) {
      this.ctx.notes = { ...this.ctx.dayStartNotes };
      this.ctx.inventory = { ...this.ctx.dayStartInventory };
      this.ui?.refreshAll();
      this.ui?.toast("you didn't make it. the morning takes some of you with it.", PAL.gloomGlow);
    } else {
      this.ui?.toast("you woke up.", PAL.inkDim);
    }
    this.ctx.day++;
    this.ctx.time = 7 * 60;
    this.ctx.dayStartNotes = { ...this.ctx.notes };
    this.ctx.dayStartInventory = { ...this.ctx.inventory };
    if (this.ctx.day >= 4 && !this.ctx.flags.awake) {
      this.ctx.flags.awake = true;
      this.ui?.toast("something inside you is awake", PAL.gloomGlow);
    }
    // ---- act transitions ---------------------------------------------
    if (this.ctx.day === 3 && !this.ctx.flags._actII) {
      this.ctx.flags._actII = true;
      this.time.delayedCall(900, () => this.ui?.showAreaBanner("ACT II · Investigation"));
    } else if (this.ctx.day === 5 && !this.ctx.flags._actIII) {
      this.ctx.flags._actIII = true;
      this.time.delayedCall(900, () => this.ui?.showAreaBanner("ACT III · Discovery"));
    }
    // teleport player home (front door, the next morning)
    const door = { x: 13 * 48 + 24, y: 18 * 48 + 4 };
    this.player.setPosition(door.x, door.y);
    (this.player.body as Phaser.Physics.Arcade.Body).reset(door.x, door.y);
    this.cameras.main.centerOn(door.x, door.y);
    this.cameras.main.fadeIn(620, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
    this.ui?.showAreaBanner(`Day ${this.ctx.day} · morning`);
    this.ui?.setClock(this.ctx.time, this.ctx.day);
  }

  /** Final choice — pressing 1 burns the facility (EPILOGUE_BURN), 2 returns. */
  private offerEnding() {
    this.player.controlsLocked = true;
    this.inStory = true;
    this.ui.toast("press  1  to BURN IT DOWN   ·   2  to GO BACK", PAL.gloomGlow);
    const kb = this.input.keyboard!;
    const choose = (burn: boolean) => {
      if (this.ctx.flags.endingChosen) return;
      this.ctx.flags.endingChosen = true;
      kb.off("keydown-ONE", onOne);
      kb.off("keydown-TWO", onTwo);
      this.ui.showStory(burn ? "THE HILL" : "ANOTHER DAY", burn ? EPILOGUE_BURN : EPILOGUE_RETURN, () => {
        this.inStory = false;
        this.player.controlsLocked = false;
      });
    };
    const onOne = () => choose(true);
    const onTwo = () => choose(false);
    kb.once("keydown-ONE", onOne);
    kb.once("keydown-TWO", onTwo);
  }

  /* ===================================================================== *
   * EVENTS                                                                *
   * ===================================================================== */
  private onGloomKilled(info: { x: number; y: number; warden: boolean }) {
    this.ctx.gloomKilled++;
    this.ui?.setKills(this.ctx.gloomKilled);

    // gold scatter (+ the occasional heart)
    const total = info.warden ? 46 : Phaser.Math.Between(2, 6);
    const n = info.warden ? 6 : Phaser.Math.Between(1, 2);
    for (let i = 0; i < n; i++) {
      const v = Math.max(1, Math.round(total / n) + (i === 0 ? total % n : 0));
      this.pickupGroup.add(new Pickup(this, info.x, info.y - 4, "coin", v, this.player, { scatter: info.warden ? 130 : 95, settleDelay: 260 }));
    }
    if (info.warden) {
      this.pickupGroup.add(new Pickup(this, info.x + 14, info.y - 4, "heart", 0, this.player, { scatter: 70, settleDelay: 280 }));
      this.pickupGroup.add(new Pickup(this, info.x - 14, info.y - 4, "potion", 0, this.player, { scatter: 70, settleDelay: 280 }));
    } else if (Math.random() < 0.14) {
      this.pickupGroup.add(new Pickup(this, info.x, info.y - 4, "heart", 0, this.player, { scatter: 60, settleDelay: 250 }));
    }

    if (info.warden) {
      this.ctx.wardenDown = true;
      this.fx.shake(0.02, 600);
      this.time.delayedCall(1700, () => {
        if (this.player.dead) return;
        this.player.controlsLocked = true;
        this.inStory = true;
        this.ui.showStory("EPILOGUE", EPILOGUE_BURN, () => {
          this.inStory = false;
          this.player.controlsLocked = false;
          this.lightenWorld();
          this.ui.showAreaBanner("Diona Community · again");
        });
      });
    } else if (this.ctx.gloomKilled === 5 && this.ctx.questState === 1) {
      this.ui?.toast("five quiet ones unmade — return", PAL.emberSoft);
    }
  }

  private onPlayerDied() {
    if (this.deathHandled) return;
    this.deathHandled = true;
    this.inDialog = true; // suppress interaction
    this.fx.shake(0.02, 450);
    this.ui?.hidePrompt();
    this.time.delayedCall(1500, () => {
      this.ui.showDeath(() => {
        this.cameras.main.fadeOut(320, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          const lost = Math.round(this.ctx.gold * 0.25);
          if (lost > 0) {
            this.ctx.gold -= lost;
            this.ui.setGold(this.ctx.gold);
          }
          this.ctx.hp = Math.max(2, Math.ceil((this.ctx.maxHp * 0.6) / 2) * 2);
          this.ui.setHearts(this.ctx.hp, this.ctx.maxHp);
          // wake by the village campfire
          const wakeX = 25 * 48 + 24;
          const wakeY = 26 * 48 + 36;
          this.player.revive(wakeX, wakeY);
          this.cameras.main.centerOn(wakeX, wakeY);
          this.deathHandled = false;
          this.inDialog = false;
          this.cameras.main.fadeIn(420, PAL.void >> 16, (PAL.void >> 8) & 0xff, PAL.void & 0xff);
          if (lost > 0) this.ui.toast(`you lost ${lost} on the road`, PAL.gloomGlow);
          this.ui.showAreaBanner("Diona Community");
        });
      });
    });
  }

  private lightenWorld() {
    for (const a of this.world.areas) a.darkness = Math.max(0.28, a.darkness - 0.16);
  }

  /* ===================================================================== *
   * AREAS                                                                 *
   * ===================================================================== */
  private updateArea() {
    let found = this.world.areas[this.world.areas.length - 1];
    for (const a of this.world.areas) {
      if (a.rect.contains(this.player.x, this.player.y)) {
        found = a;
        break;
      }
    }
    // ease darkness toward the area's level
    this.dark = Phaser.Math.Linear(this.dark, found.darkness, 0.04);
    if (found.name !== this.areaName) {
      const first = this.areaName === "";
      this.areaName = found.name;
      if (!first && !this.player.dead) {
        this.ui?.showAreaBanner(found.name);
        if (found.name === "The Edge Road" && !this.ctx.flags.metEdge) {
          this.ctx.flags.metEdge = true;
          this.ui?.toast("the community ends here. the hill isn't far.", PAL.inkDim);
        }
        if (found.name === "The Little Park" && !this.ctx.flags.enteredPark) {
          this.ctx.flags.enteredPark = true;
          this.ctx.addNote("parkBench");
          // a faded letter someone tucked into the bench frame
          this.ctx.addItem("faded_letter");
        }
        if (found.name === "Beyond the Community" && !this.ctx.flags.enteredOutside) {
          this.ctx.flags.enteredOutside = true;
          SFX.thunderHint();
          this.ui?.toast("something is different here. the air tastes salt.", PAL.gloomGlow);
        }
      }
    }
  }

  /* ===================================================================== *
   * LIGHTING                                                              *
   * ===================================================================== */
  private setupLighting() {
    this.darkRT = this.add
      .renderTexture(0, 0, VIEW_W, VIEW_H)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.darkness);
    this.glowStamp = this.add.image(0, 0, "glow_mask").setVisible(false);

    // a vignette over the world
    this.add.image(VIEW_W / 2, VIEW_H / 2, "vignette").setScrollFactor(0).setDisplaySize(VIEW_W, VIEW_H).setDepth(DEPTH.vignette).setAlpha(0.92);

    // bloom sprite per light + spark emitters at campfires
    for (const l of this.world.lights) {
      const img = this.add
        .image(l.x, l.y, l.warm ? "glow_warm" : "glow_violet")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.bloom)
        .setScale((l.radius * 2) / 256)
        .setAlpha(l.warm ? 0.5 : 0.45);
      this.blooms.push({ x: l.x, y: l.y, r: l.radius, warm: l.warm, flicker: l.flicker, img, phase: Math.random() * Math.PI * 2 });
      if (l.campfire) {
        this.add.particles(l.x, l.y - 6, "dot", {
          speedY: { min: -42, max: -16 },
          speedX: { min: -12, max: 12 },
          accelerationY: -10,
          lifespan: { min: 600, max: 1300 },
          scale: { start: 0.7, end: 0 },
          alpha: { start: 0.95, end: 0 },
          tint: l.warm ? [PAL.emberHot, PAL.ember, PAL.emberSoft] : [PAL.gloomGlow, PAL.gloomHi, PAL.gloomEye],
          frequency: 90,
          quantity: 1,
          blendMode: Phaser.BlendModes.ADD,
        });
      }
    }
  }

  private updateLighting(delta: number) {
    const cam = this.cameras.main;
    const vx = cam.worldView.x;
    const vy = cam.worldView.y;
    const rt = this.darkRT;
    rt.clear();
    rt.fill(PAL.void, this.dark);

    // each light cuts a soft hole + a flicker on its bloom
    for (const b of this.blooms) {
      b.phase += delta * 0.012;
      const fl = 1 + Math.sin(b.phase) * b.flicker + (Math.random() - 0.5) * b.flicker * 0.8;
      const r = b.r * fl;
      b.img.setScale((r * 2) / 256).setAlpha((b.warm ? 0.5 : 0.42) * (0.85 + 0.3 * fl));
      // skip the erase if the light is far off-screen
      if (b.x < vx - r - 40 || b.x > vx + VIEW_W + r + 40 || b.y < vy - r - 40 || b.y > vy + VIEW_H + r + 40) continue;
      this.glowStamp.setPosition(b.x - vx, b.y - vy).setScale((r * 2) / 256);
      rt.erase(this.glowStamp);
    }
    // the player's lantern
    if (!this.player.dead) {
      const r = this.player.lanternRadius;
      this.glowStamp.setPosition(this.player.x - vx, this.player.y - 8 - vy).setScale((r * 1.5 * 2) / 256);
      rt.erase(this.glowStamp);
    }
  }

  /* ===================================================================== *
   * FX                                                                    *
   * ===================================================================== */
  private makeFx() {
    this.pSpark = this.add.particles(0, 0, "spark", {
      lifespan: { min: 180, max: 420 },
      speed: { min: 80, max: 280 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0xffffff, PAL.emberHot, PAL.emberSoft],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.pDust = this.add.particles(0, 0, "soft", {
      lifespan: { min: 280, max: 560 },
      speed: { min: 8, max: 40 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: [PAL.dirt, PAL.dirtHi, mix(PAL.dirt, PAL.grassDeep, 0.4)],
      emitting: false,
    });
    this.pEmber = this.add.particles(0, 0, "dot", {
      lifespan: { min: 700, max: 1600 },
      speedY: { min: -60, max: -16 },
      speedX: { min: -22, max: 22 },
      accelerationY: -12,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [PAL.emberHot, PAL.ember, PAL.emberSoft, PAL.goldHi],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.pGloom = this.add.particles(0, 0, "soft", {
      lifespan: { min: 350, max: 800 },
      speed: { min: 30, max: 200 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.85, end: 0 },
      tint: [PAL.gloomGlow, PAL.gloomHi, PAL.gloomEye, PAL.gloom],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    // ambient: a few warm motes that drift around wherever the player is,
    // fading in then out across their life so they "appear and vanish"
    this.pAmbient = this.add.particles(0, 0, "dot", {
      lifespan: { min: 2200, max: 4200 },
      speed: { min: 4, max: 22 },
      angle: { min: 0, max: 360 },
      x: { min: -240, max: 240 },
      y: { min: -150, max: 150 },
      accelerationY: -4,
      scale: { start: 0.5, end: 0.18 },
      alpha: { onEmit: () => 0, onUpdate: (_p, _k, t) => Math.sin(t * Math.PI) * 0.5 },
      tint: [PAL.emberSoft, PAL.ember, PAL.goldHi, PAL.gloomGlow],
      frequency: 340,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
    });

    const mkText = (x: number, y: number, text: string, color: number) => {
      const t = this.add
        .text(x, y, text, { fontFamily: '"Spectral", Georgia, serif', fontSize: "17px", color: hex(color), fontStyle: "600" })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.floatText)
        .setStroke("#0a0810", 4)
        .setShadow(0, 2, "rgba(0,0,0,0.6)", 3);
      this.tweens.add({ targets: t, y: y - 30, alpha: { from: 1, to: 0 }, x: x + Phaser.Math.Between(-8, 8), duration: 900, ease: "Quad.easeOut", onComplete: () => t.destroy() });
      return t;
    };

    this.fx = {
      dust: (x, y, n = 2) => this.pDust.emitParticleAt(x, y, n),
      slashArc: (x, y, ang, tint) => {
        const s = this.add
          .image(x, y, "slash")
          .setOrigin(0.19, 0.5)
          .setRotation(ang)
          .setTint(tint)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(this.player.depth + 2)
          .setScale(0.85)
          .setAlpha(0.95);
        this.tweens.add({ targets: s, scale: 1.45, alpha: 0, rotation: ang + 0.5, duration: 200, ease: "Quad.easeOut", onComplete: () => s.destroy() });
      },
      hitSpark: (x, y, tint, n = 6) => {
        this.pSpark.emitParticleAt(x, y, n);
        const ring = this.add.image(x, y, "ring").setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floatText - 1).setScale(0.25).setAlpha(0.9);
        this.tweens.add({ targets: ring, scale: 1.1, alpha: 0, duration: 230, ease: "Quad.easeOut", onComplete: () => ring.destroy() });
      },
      dashTrail: (sprite) => {
        for (let i = 0; i < 3; i++) {
          const g = this.add
            .image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
            .setOrigin(sprite.originX, sprite.originY)
            .setFlipX(sprite.flipX)
            .setScale(sprite.scaleX, sprite.scaleY)
            .setTint(mix(PAL.cloak, PAL.ember, 0.3))
            .setAlpha(0.5)
            .setDepth(sprite.depth - 1 - i);
          this.tweens.add({ targets: g, alpha: 0, scale: g.scaleX * 0.9, duration: 220 + i * 60, delay: i * 35, onComplete: () => g.destroy() });
        }
      },
      embers: (x, y, n, tint) => {
        if (tint !== undefined) {
          // a one-off coloured burst via the gloom emitter when violet, else warm
          (tint === PAL.gloomGlow ? this.pGloom : this.pEmber).emitParticleAt(x, y, n);
        } else this.pEmber.emitParticleAt(x, y, n);
      },
      ringPulse: (x, y, color, toRadius, dur = 360) => {
        const ring = this.add.image(x, y, "ring").setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floatText - 1).setScale(0.15).setAlpha(0.85);
        this.tweens.add({ targets: ring, scale: toRadius / 28, alpha: 0, duration: dur, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
      },
      gloomBurst: (x, y) => {
        this.pGloom.emitParticleAt(x, y, 16);
        const ring = this.add.image(x, y, "ring").setTint(PAL.gloomGlow).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floatText - 1).setScale(0.2).setAlpha(0.9);
        this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 360, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
      },
      pop: (x, y, tint) => {
        this.pSpark.emitParticleAt(x, y, 5);
        const ring = this.add.image(x, y, "ring").setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floatText - 1).setScale(0.2).setAlpha(0.9);
        this.tweens.add({ targets: ring, scale: 1.0, alpha: 0, duration: 240, ease: "Quad.easeOut", onComplete: () => ring.destroy() });
      },
      shake: (intensity, durationMs) => this.cameras.main.shake(durationMs, intensity, false),
      hitStop: (ms) => {
        this.physics.world.pause();
        this.hitStopUntil = Math.max(this.hitStopUntil, this.time.now + ms);
      },
      floatText: (x, y, text, color) => void mkText(x, y, text, color),
    };
  }
}
