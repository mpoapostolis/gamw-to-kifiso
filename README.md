# Five Minutes Before

A small melancholic top-down RPG about the memory they take from you. Phaser 3 + TypeScript. No image assets — everything is drawn in code.

> _You live in the Diona Community. Everything is fine. Helena loves you. You don't remember what day it is, but that doesn't worry you. No one remembers._
>
> _Today, though, your mother called you Andrew. She laughed and corrected herself. And something inside you — like a small candle someone forgot to blow out — caught._

## Premise

Every night, at **11:55**, the Cleaners come and erase the last five minutes of your memory. They kill you in your sleep. The next morning you wake up in a new body, one day older, with the same identity — or so you think. Everyone has this happen. No one knows.

Except you, who slowly starts to remember through inconsistencies in conversations.

## Run

```bash
bun install
bun run dev      # → http://localhost:5173
```

## Controls

| key                | does                                                    |
|--------------------|---------------------------------------------------------|
| WASD / arrows      | walk                                                    |
| E                  | talk to a neighbour, enter a door                       |
| TAB                | open / close the notebook                               |
| I                  | open / close the pocket (inventory)                     |
| ESC                | pause                                                   |
| M                  | mute (music + sfx)                                      |

## Cast

- **Helena** — your partner. She loves you. From day 2 onwards she starts referring to things you don't remember doing.
- **Costas** — neighbour. He's been painting his front door for three weeks without ever finishing. On day 4 he tells you he knows.
- **Mrs. Despoina** — the old woman at the corner. She tells truths nobody believes. She doesn't age.
- **The Custodian** — at the end of the hill, beyond the community. He isn't cruel. He believes this is mercy.

## Two endings

- **BURN IT DOWN** — everyone wakes up and starts to age normally. Helena looks at you for a second like a stranger, then she knows you. You grow old together.
- **GO BACK** — the Custodian strokes your head. You wake up tomorrow. You don't remember anything. Everything is fine. Until your mother calls you Andrew.

## Features

- **Portraits** — every named character has a detailed, hand-drawn-in-code portrait (120 × 140) that shows in the dialog panel.
- **Notebook** (TAB) — inconsistencies you notice in dialog auto-add themselves to your notebook. Open it any time.
- **Pocket** (I) — items you find or are given. House key and wallet to start. Helena's book, Despoina's candle, Costas's map etc. arrive through dialog.
- **Multi-scene** — walk to your front door, press E, fade out, fade in inside your house. Bed, mirror, table, sink. Press E by the mirror — your face is slightly different every day. Step back through the door to return outside.
- **Soft ambient bed** — a low Web-Audio drone, a hint of wind. No music — just air.

## Stack

```
src/
├── main.ts           Phaser config, 5 scenes
├── consts.ts         viewport + depth bands
├── palette.ts        soft melancholic dawn palette
├── textures.ts       all sprites + the big character portraits, drawn at boot
├── sfx.ts            tiny Web-Audio synth + ambient drone
├── story.ts          prologue + endings + notebook entries + items
├── map.ts            world: terrain, props, NPCs with per-day conditional dialog
├── types.ts          shared interfaces (GameCtx with day, notes, inventory)
├── objects/          Player / NPC / etc.
└── scenes/
    ├── Boot.ts       textures + anims + fonts
    ├── Title.ts      title screen
    ├── Game.ts       the outdoor world + dialog + endings + Fx
    ├── Home.ts       interior of Alex's house — multi-scene demo
    └── Ui.ts         HUD + dialog + story cards + notebook + pocket + pause
```

Fonts: **Cinzel** (display) + **Spectral** (body), from Google Fonts.

---

*"Candles know they were lit, even if you don't tell them."*
