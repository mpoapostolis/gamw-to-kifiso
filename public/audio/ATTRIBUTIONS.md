# Audio attributions

All audio in `public/audio/` is sourced from [OpenGameArt.org](https://opengameart.org/)
under permissive licenses (CC0 or CC-BY).

| File | Source | Author | License |
|---|---|---|---|
| `music_hope.mp3` | [At the End of Hope](https://opengameart.org/content/at-the-end-of-hope) | Emma_MA | CC0 — Public Domain |
| `sfx_footstep_wood_a.ogg` / `sfx_footstep_wood_b.ogg` | [Footsteps on different surfaces](https://opengameart.org/content/footsteps-on-different-surfaces) | congusbongus (mastered from freesound contributors, esp. swuing) | CC-BY 3.0 |
| `sfx_footstep_grass_a.ogg` / `sfx_footstep_grass_b.ogg` | [Footsteps on different surfaces](https://opengameart.org/content/footsteps-on-different-surfaces) | congusbongus | CC-BY 3.0 |
| `sfx_heartbeat_slow.wav` / `sfx_heartbeat_fast.wav` | [Heartbeat sounds](https://opengameart.org/content/heartbeat-sounds) | bart | CC0 — Public Domain |
| `sfx_chime.wav` / `sfx_chime_2.wav` | [Bell dings/chimes](https://opengameart.org/content/bell-dingschimes) | PWL | CC0 — Public Domain |

## CC-BY 3.0 attribution clauses

The footstep audio under CC-BY 3.0 requires attribution. The required notice is
embedded in this file and reproduced verbatim in the game's pause panel /
credits section:

> Footstep sounds: *Footsteps on different surfaces* by congusbongus,
> [opengameart.org/content/footsteps-on-different-surfaces](https://opengameart.org/content/footsteps-on-different-surfaces),
> licensed under [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/).
> Sources include audio mastered from freesound.org contributors.

## Procedurally-generated audio

All remaining audio in the game — UI clicks, the sword/horn/door SFX bank in
`src/sfx.ts`, the ambient procedural music in `src/music.ts`, and the drone
wind bed — is generated at runtime via the Web Audio API. No assets needed.
