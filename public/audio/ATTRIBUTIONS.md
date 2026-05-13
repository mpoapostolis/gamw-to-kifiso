# Audio attributions

All audio in `public/audio/` is sourced from [OpenGameArt.org](https://opengameart.org/)
under permissive licenses (CC0 or CC-BY).

| File | Source | Author | License |
|---|---|---|---|
| `music_hope.mp3` | [At the End of Hope](https://opengameart.org/content/at-the-end-of-hope) | Emma_MA | CC0 — Public Domain |
| `music_facility.ogg` | [Drifting Through the Nebula (Ambient)](https://opengameart.org/content/drifting-through-the-nebula-ambient) | HitCtrl | CC-BY 3.0 |
| `music_park.mp3` | [Calm](https://opengameart.org/content/calm) | elerya (Audibert jd) | CC-BY 3.0 |
| `music_lullaby.mp3` | [Forgotten Lullaby — Music Box Loop](https://opengameart.org/content/forgotten-lullaby) | Mega Pixel Music Lab | CC-BY 4.0 |
| `music_cafe.mp3` | [Late Night Jazz Cafe](https://opengameart.org/content/late-night-jazz-cafe) | benjobanjo | CC-BY 3.0 |
| `music_clinic.mp3` | [Uneasy Anticipation_v001 (Looping)](https://opengameart.org/content/uneasy-anticipationv001-%E2%80%93-looping) | Eric Matyas | CC-BY 3.0 |
| `music_intro.ogg` | [Emotional Piano](https://opengameart.org/content/emotional-piano-0) | Centurion_of_war | CC0 — Public Domain |
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

> Facility/lab music: *Drifting Through the Nebula (Ambient)* by HitCtrl,
> [opengameart.org/content/drifting-through-the-nebula-ambient](https://opengameart.org/content/drifting-through-the-nebula-ambient),
> licensed under [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/).

> Park music: *Calm* by elerya (Audibert jd),
> [opengameart.org/content/calm](https://opengameart.org/content/calm),
> licensed under [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/).

> Lullaby music: *Forgotten Lullaby — Music Box Loop* by Mega Pixel Music Lab
> ([megapixelmusiclab.com](https://megapixelmusiclab.com)),
> [opengameart.org/content/forgotten-lullaby](https://opengameart.org/content/forgotten-lullaby),
> licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).

> Cafe music: *Late Night Jazz Cafe* by benjobanjo,
> [opengameart.org/content/late-night-jazz-cafe](https://opengameart.org/content/late-night-jazz-cafe),
> licensed under [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/).

> Clinic music: *Uneasy Anticipation_v001 (Looping)* by Eric Matyas
> ([soundimage.org](https://soundimage.org)),
> [opengameart.org/content/uneasy-anticipationv001-%E2%80%93-looping](https://opengameart.org/content/uneasy-anticipationv001-%E2%80%93-looping),
> licensed under [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/).

> Intro/title music: *Emotional Piano* by Centurion_of_war,
> [opengameart.org/content/emotional-piano-0](https://opengameart.org/content/emotional-piano-0),
> released under CC0 — Public Domain (attribution not required, but acknowledged).

## Procedurally-generated audio

All remaining audio in the game — UI clicks, the sword/horn/door SFX bank in
`src/sfx.ts`, the ambient procedural music in `src/music.ts`, and the drone
wind bed — is generated at runtime via the Web Audio API. No assets needed.
