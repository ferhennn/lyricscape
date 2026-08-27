# LYRICSCAPE

**Music, but visual.** An immersive cinematic lyrics experience — Apple Music
playback, time-synced lyrics, editorial typography, and a reactive WebGL world
combined into one interactive music film.

Not a lyrics viewer. Not a music player. A place a song lives inside.

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000  →  "Try Demo"
```

The app runs fully without any credentials in **demo mode** (see below).

## Music sources

LYRICSCAPE plays audio from whichever of these is available, in priority order:

| Source | Setup | Playback |
| --- | --- | --- |
| **Apple Music** (MusicKit) | paid Apple Developer account → `.env.local` (below) | full catalog, DRM stream |
| **Jamendo** | free client ID at [devportal.jamendo.com](https://devportal.jamendo.com) → `JAMENDO_CLIENT_ID` in `.env.local` | ~600k Creative-Commons tracks, full-length legal streams |
| **Your tracks** | drop audio files in `public/tracks/` | a persistent local library; lyrics auto-fetched from LRCLIB |
| **Local files** | none — always on | one-off: pick any audio file from search or the home screen |
| **Demo** | none — always on | original *Afterlight*, generative Web Audio score |

Only the Jamendo **Client ID** is needed (it is public — sent with every API
request). Do **not** add the Client Secret; this app does not use OAuth.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## Demo mode

If Apple Music is not configured, LYRICSCAPE serves a complete built-in
experience with **no copyrighted material**:

- **Song:** _Afterlight_ by _LYRICSCAPE_ — original lyrics written for the demo
  (`public/demo/afterlight.lrc`).
- **Audio:** an original ambient score **synthesized live in the browser** with
  the Web Audio API (`src/lib/audio/synthetic.ts`). There is no audio file — the
  chord progression, filter movement, reverb and noise bed are generated from a
  recipe, which gives sample-accurate lyric timing.
- **Artwork:** a procedural SVG (`public/demo/afterlight.svg`).
- **Scene metadata:** hand-authored sections, intensities and animation presets
  in `src/data/demo.ts`.

Enter it at `/experience/afterlight` or via **Try Demo** on the landing page.

---

## Apple Music setup

Playback of the Apple Music catalog requires MusicKit, which needs a
server-signed **developer token** (ES256 JWT). The private key never reaches the
browser — it is signed in `src/app/api/apple-developer-token/route.ts`.

1. In the [Apple Developer](https://developer.apple.com/account) portal create a
   **MusicKit identifier** and a **MusicKit private key**. Download the `.p8`.
2. Note your **Team ID** (Membership) and the **Key ID** of that key.
3. Copy `.env.example` → `.env.local` and fill in:

   ```env
   APPLE_TEAM_ID=XXXXXXXXXX
   APPLE_MUSIC_KEY_ID=YYYYYYYYYY
   APPLE_MUSIC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   ...
   -----END PRIVATE KEY-----"
   ```

4. Restart `npm run dev`. The landing page will show **Apple Music ready** and
   **Connect Apple Music** performs the MusicKit authorization popup.

Full-length playback additionally requires the signed-in user to have an active
Apple Music subscription. Without one, MusicKit falls back to 30-second
previews and the experience still runs.

### What the integration does

`src/lib/apple-music/service.ts` is the single boundary to MusicKit:

- loads `musickit.js` from Apple's CDN and `MusicKit.configure(...)`
- `authorize()` / `unauthorize()`
- catalog `search()` and `getSong()`
- `AppleMusicAudioProvider` — wraps the MusicKit instance behind the same
  `AudioProvider` interface used by the demo, so the UI is source-agnostic
  (`setQueue`, `play`, `pause`, `seekToTime`, `playbackStateDidChange`,
  `playbackTimeDidChange`).

**No audio is downloaded, cached or redistributed.** MusicKit streams under
Apple's DRM; LYRICSCAPE only reads playback position and metadata.

---

## Lyrics

Synced lyrics for catalog songs come from [LRCLIB](https://lrclib.net) — a
community lyric database with no auth and permissive usage. Requests go through
`/api/lyrics` (server-side, cached).

- `src/lib/lyrics/lrc.ts` — LRC parser. Handles `[mm:ss.xx]`, `[mm:ss.xxx]`,
  multiple timestamps per line, `[offset]`, and enhanced word-level `<mm:ss.xx>`
  tags.
- If the source is **line-level only**, word timing is **estimated** from word
  length (`estimateWords`). Estimated words are flagged `estimated: true` — the
  app never claims exact word sync it doesn't have.
- `src/lib/lyrics/engine.ts` — `LyricsEngine` resolves the active line for a
  playback time using binary search + thresholds, so it survives seeking,
  pausing, buffering and skipped sections.

If no lyrics are found the experience shows **LYRICS UNAVAILABLE →
CONTINUE WITHOUT LYRICS** and keeps running on the visual timeline.

---

## How the visual system works

Everything downstream consumes one normalized object, `TimelineState`
(`src/types/index.ts`), produced each frame by `Timeline`
(`src/lib/visuals/timeline.ts`):

```ts
{ progress, currentTime, duration, lyricIndex, lyricProgress,
  section, scene, intensity, transitionPulse, isPlaying }
```

- **Sections** (`intro | verse | pre_chorus | chorus | bridge | outro`) map to a
  **scene** and an **intensity** (0..1). For the demo these are authored; for
  catalog songs `src/lib/visuals/auto-sections.ts` synthesizes a plausible map
  from duration + lyric density (explicitly an approximation).
- **intensity** drives particle density, camera movement, light, type scale and
  post-processing.
- **transitionPulse** spikes on each lyric change and briefly bursts particles /
  adds chromatic aberration.

The frame is sampled render-free (`src/lib/experience/frame.ts`) — playback time
is read straight off the provider, never stored in React state per frame.

### Scenes

`src/components/three/scenes.tsx` — six procedural scenes: `stars`, `void`,
`room`, `hallway`, `ocean`, `smoke`. `SceneManager` cross-fades between them when
`timeline.scene` changes.

**Add a scene:**

1. Add the name to `VisualSceneType` in `src/types/index.ts`.
2. Write a `function MyScene({ opacity, palette, reduced, detail }: SceneProps)`
   in `scenes.tsx` and register it in `SCENE_COMPONENTS`.
3. Reference it from a section's `scene` field (demo: `src/data/demo.ts`;
   catalog: `SCENE_FOR` in `auto-sections.ts`).

### Lyric animation presets

`src/lib/visuals/presets.ts` — `fade, slide, scale, blur, whisper, scream, echo,
explode, float, typewriter, glitch, cinematic`, each with `initial / active /
exit` states.

**Add a preset:** add the name to `LyricPresetName`, add an entry to
`LYRIC_PRESETS`, optionally reference it per-line in `DEMO_LINE_ANNOTATIONS` or
let `resolvePreset()` pick it by section/emphasis.

### Camera

`src/components/three/CameraController.tsx` — section-driven dolly / zoom / orbit
/ shake, damped, with pointer parallax. Respects reduced motion.

### Quality

`src/lib/visuals/quality.ts` — `auto | high | medium | low`. `auto` inspects
DPR, cores, memory and screen size. `AdaptivePerf` can suggest a downgrade after
sustained low FPS. `AdaptiveDpr` (drei) is wired into the canvas.

### WebGL fallback

If WebGL is unavailable the experience swaps the `<Canvas>` for a gradient +
2D `ParticleCanvas` and keeps lyrics, timeline and controls fully functional.

---

## Visual modes

`Cinematic` · `3D` · `Minimal` (no WebGL, typography + 2D field) ·
`Lyric only` (pure reading view). Switch in the player, in Settings, or with `V`.

**Scroll mode** turns the wheel into a scrubber — scroll position maps to song
position and the world moves through it.

---

## Adding your own tracks

Drop audio files (`mp3 · m4a · aac · ogg · opus · wav · flac`) into
`public/tracks/`. `npm run tracks` (which also runs on every `npm run dev` /
`npm run build`) reads their ID3 / Vorbis tags, extracts embedded cover art to
`public/tracks/.covers/`, and (re)writes `public/tracks/manifest.json`.

- A filename like `Artist - Title.mp3` is parsed for artist + title when tags
  are missing; download-site cruft (`_`, `(mp3.pm)`, `[official video]`, …) is
  stripped.
- Time-synced lyrics come from **LRCLIB** by title + artist + duration.
- Drop a sidecar `.lrc` with the **same base name** to override LRCLIB.
- Hand edits to `title` / `artist` / `album` / `lrc` / `scene` in
  `manifest.json` are preserved across regenerations (matched by `file`).
- Optional per-track `"scene"`: `room · hallway · void · ocean · stars · smoke`.

Audio files and extracted covers are git-ignored; `manifest.json` is committed.
See `public/tracks/README.md`.

## Adding a demo song

1. Add an entry to `RECIPES` in `src/lib/audio/synthetic.ts` (duration, bpm,
   root, chord events) — or point at a royalty-free file via `LocalAudioProvider`.
2. Write an `.lrc` in `public/demo/`.
3. Create a `DemoSongConfig` like `DEMO_CONFIG` in `src/data/demo.ts` with its
   sections, palette and per-line annotations.
4. Route it: `/experience/<your-id>` — `prepare()` in
   `src/stores/experience.ts` branches on the demo id.

---

## Keyboard

`Space` play/pause · `← / →` seek 5s · `L` lyrics · `M` mute · `F` fullscreen ·
`V` visual mode · `Esc` exit · `/` search

---

## Project structure

```
src/
  app/                     routes + API (apple-developer-token, lyrics)
  components/
    landing/  library/  settings/  shell/
    music/                 search, artwork
    lyrics/                LyricsView
    experience/            root, chrome, timeline, end card, scroll mode
    three/                 canvas, scenes, camera, particles, post fx
    ui/                    button, cursor, grain, particle canvas
  lib/
    apple-music/           MusicKit service + provider + types
    audio/                 AudioProvider interface, synthetic, local
    lyrics/                LRC parser, engine, LRCLIB client
    visuals/               timeline, presets, color extraction, quality, auto-sections
    experience/            per-frame sampler, pointer
  stores/                  settings, experience, search, history  (Zustand)
  types/                   domain models
  data/                    demo config
public/
  demo/                    afterlight.lrc, afterlight.svg
  textures/                grain.svg
```

---

## Deployment

Standard Next.js. On Vercel:

1. Import the repo.
2. Add `APPLE_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_PRIVATE_KEY` as
   environment variables (leave unset to ship demo-only).
3. Deploy. `/api/apple-developer-token` runs on the Node.js runtime.

For MusicKit authorization to work in production the deployed origin must be
listed in your MusicKit identifier configuration in the Apple Developer portal.

---

## Copyright

LYRICSCAPE never downloads, scrapes, caches or redistributes copyrighted audio
or lyrics. Apple Music content is streamed by MusicKit under Apple's terms.
Lyrics come from LRCLIB under its terms. The demo song, score and artwork are
original works created for this project.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Landing shows "Demo mode" with creds set | Restart dev server; check `.env.local` key names; the `.p8` must be the full PEM. |
| "Developer token unavailable" | The private key failed to parse — ensure newlines are real or escaped as `\n`. |
| MusicKit popup blocked | Trigger `Connect` from a direct click; some browsers block programmatic popups. |
| No lyrics for a song | LRCLIB may not have it — the experience continues without lyrics. |
| Choppy on a laptop | Settings → Quality → Medium/Low, or Motion → Reduced. |
| Black canvas | WebGL disabled/unavailable — the app falls back automatically; check `chrome://gpu`. |
