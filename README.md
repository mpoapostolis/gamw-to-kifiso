# Emberwilds

A moody top-down action-RPG built in [Phaser 3](https://phaser.io/) +
TypeScript. Every tile, creature, prop, particle, UI panel and sound is
generated procedurally — there are **no image assets** in `src/`, only code
that draws them at boot. The only binary in the repo is the background music.

> _Long before the maps, the world had an edge — and past the edge, an old dark,
> patient as stone. Lumin held the line with lanterns. The lanterns are dying
> now._

## Run it

```bash
bun install
bun run dev      # → http://localhost:5173
```

(Or `bun run build` for a production bundle.)

## Controls

| key                | does                                          |
|--------------------|-----------------------------------------------|
| WASD / arrows      | move                                          |
| SPACE / left-click | strike (lantern-arc swing)                    |
| SHIFT              | roll (brief i-frames)                         |
| E                  | talk to a villager you're standing next to    |
| ESC                | pause                                         |
| M                  | mute                                          |

## The story (no spoilers — just the setup)

You arrive in **Lumin Village** at dusk with a lantern of the old craft still
bright on your belt. Lumin used to ring itself with a hundred lanterns; most
have gone out. Past the Wood Gate to the east lies the **Gloomwood**, and past
that, the **Sunken Shrine** — where something older waits.

* **Elder Maro** at the well will ask you to thin five Gloom from the wood.
* **Garrick** the smith will sharpen your edge once you've taken a few.
* **Bree** the merchant has flavour and a hint.
* **Pip** the child knows where there's a shiny bottle hidden behind a mossy
  rock past the gate.
* Defeating the **Gloom Warden** in the shrine triggers the epilogue.

## What's in the code

```
src/
├── main.ts           game config, scene list
├── consts.ts         viewport + depth bands
├── palette.ts        the colour language (twilight indigo, ember, gloom-violet)
├── textures.ts       every sprite, drawn at boot via Graphics + Canvas
├── sfx.ts            a tiny Web-Audio synth (no audio files)
├── bgm.ts            background music loader
├── story.ts          prologue / epilogue text
├── map.ts            the world: terrain, props, lights, NPCs, spawns, dialog
├── types.ts          shared interfaces
├── objects/
│   ├── Player.ts     wanderer — movement, attack, roll, lantern
│   ├── Gloom.ts      enemy — wander / chase / hit / die; Warden variant
│   ├── Npc.ts        villager — stands, bobs, talks
│   └── Pickup.ts     coin / heart / potion with magnet + pop FX
└── scenes/
    ├── Boot.ts       forge textures + anims + cursor, wait for fonts
    ├── Title.ts      animated title, embers, drifting motes
    ├── Game.ts       world build, combat, lighting model, FX, quest flow
    └── Ui.ts         HUD, banners, prompts, toasts, dialog, story, death, pause
```

The lighting model is fun: a screen-space `RenderTexture` filled with a dim
overlay, then `erase()`d at each light position (player lantern, lamp posts,
campfires, the shrine brazier) using a radial alpha gradient — so light pools
"cut holes" out of the dark. Warm/violet bloom sprites are drawn additively on
top of those holes, and a vignette closes the corners.

Fonts: Cinzel (display) + Spectral (body), loaded from Google Fonts.
