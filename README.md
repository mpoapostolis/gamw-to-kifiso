# Yesterday Echoes

A small existential top-down RPG about who you are after the night takes the rest. Phaser 3 + TypeScript. No image assets — everything is drawn in code.

> _You wake up. Your name is Alex. You know this the way you know which side of the bed is yours: by the shape of the wear._
>
> _Helena is humming in the kitchen. Outside, the sky is the colour it always is. You don't remember yesterday. Nobody does. That's the way it is here._
>
> _Today, though — your mother, in the kitchen, looking right at you — said Andrew. She laughed. She said sorry. She said she didn't know why._
>
> _And something inside you, in the small dark place under the place a person usually thinks from, opened an eye._

## What it's about

Every night at **11:55**, the Cleaners come. They take the last five minutes of memory and pour the rest of you into a new body — one day older. Nobody knows this happens. Everybody thinks they just sleep.

You are Alex this morning. You were Alex yesterday too. But the body that kissed Helena yesterday is dead and you are wearing its name. Your mother slipped and called you Andrew once. There are one hundred and twenty-four of you in glass tubes under the hill.

The game's question is not "what is happening?" It is: *if you don't remember being yesterday, are you the same person? whose love is Helena receiving? what is one extra body? would you trade pain for continuity if you could?*

There are two endings. Neither is wrong.

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

## The cast

- **Mom** — in the kitchen. She loves you. She doesn't see herself slipping. She is the most loved character.
- **Helena** — your partner. She suspects something even before she has the words. By Day 4 she names the discontinuity.
- **Costas** — neighbour, awake. He has twenty-two days. He has been painting his front door for three weeks.
- **Mrs. Despoina** — the old woman at the corner who has been awake sixty years and does not grow old. She speaks in aphorisms because she has had time to.
- **The Mailman** — fading. Days 2-3 confused. By Day 4 he can't finish a sentence.
- **Eli the kid** — innocent prophet, six years old, the most clear-eyed character in the game.
- **The Custodian** — beneath the hill, beside the tubes. He is not the villain. His argument is almost convincing.

## Two endings

- **BURN IT DOWN** — you light the lights. One hundred and twenty-four tubes go dark. Everyone wakes up to the lives they had lost track of. They grow old, slowly. It hurts. It is real.
- **GO BACK** — you take the Custodian's hand. He says it isn't a worse choice, just a different one. Tomorrow you wake up. It's Monday. The sky is the colour it always is. Mom calls you Andrew. And, somewhere small and dark and almost too far down to hear, an eye that was just learning to open closes again.

## Features

- **Portraits** — every named character has a detailed, hand-drawn-in-code portrait (120 × 140) that shows during dialog.
- **Notebook** (TAB) — inconsistencies you notice in conversation auto-add themselves. *Today my mother called me Andrew. She laughed and corrected herself. My name is Alex.*
- **Pocket** (I) — items you find or are given. Helena's book, Mrs Despoina's candle, Costas's map, a wallet, a ring you don't remember owning, a song someone says you wrote.
- **Sleep loop** — Press E on your bed to sleep. A black-out cinematic with text beats. From Day 3 onwards, a Cleaner sprite drifts through your bedroom while you "sleep". On Day 4 something inside you stays awake during it.
- **Multi-scene** — Outside (the community + hill), inside your home (kitchen + bedroom + mirror + sink), and underneath (the Facility — six glass tubes, a Custodian, a console with green-lit screens).
- **Ambient procedural music** — a pure Web Audio piece. A-minor / F / C / G at 78 BPM, three voices: a detuned sine pad with a 0.15Hz LFO on the filter (the "breathing"), sparse triangle+sine piano plucks with timing jitter, and a rare high bell every 4-8 bars.

## Stack

```
src/
├── main.ts           Phaser config, 6 scenes
├── consts.ts         viewport + depth bands
├── palette.ts        soft melancholic dawn palette
├── textures.ts       all sprites + character portraits, drawn at boot
├── sfx.ts            tiny Web-Audio synth + ambient drone bed
├── music.ts          procedural ambient piano/pad/bell
├── story.ts          prologue + endings + notebook entries + items
├── dialogues.ts      ~115 dialog pages across 7 NPCs and 5 days
├── map.ts            world: terrain, props, NPCs with per-day branching
├── types.ts          shared interfaces (GameCtx with day, notes, inventory)
├── objects/          Player / Npc / Pickup / Gloom (kept for the 11:55 hook)
└── scenes/
    ├── Boot.ts       textures + anims + fonts
    ├── Title.ts      title screen
    ├── Game.ts       outdoor world + dialog + endings + Fx
    ├── Home.ts       interior of Alex's house + Mom + bed sleep loop
    ├── Facility.ts   underground room with the tubes + the Custodian
    └── Ui.ts         HUD + dialog + story cards + notebook + pocket + pause
```

Fonts: **Cinzel** (display) + **Spectral** (body), from Google Fonts.

---

*"The hardest thing isn't forgetting, child. It's knowing your love is being delivered by a stranger every morning, in your name."* — Mrs. Despoina
