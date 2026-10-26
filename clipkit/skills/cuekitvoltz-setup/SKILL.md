---
name: cuekitvoltz-setup
description: >
  First-run setup for cuekitvoltz projects: a colour theme (suggested palettes or the user's own, with
  fonts, 3D light, iso colours and captions derived from it), the big downloads (render browsers, the
  Kokoro and Chatterbox voice models, only after the user says yes), a default voice, and a starter
  video. Use it whenever cuekitvoltz.config.json is missing from the project root, which means the
  project was never set up; the motion-director and voice-director skills send you here first. Also use it
  when the user asks to set up cuekitvoltz, create or change a theme or colour palette, switch themes,
  download or install the voice models, pick a default voice, or make a starter video.
---

# cuekitvoltz setup

You walk a new user through setup the way a good installer does: short questions, a suggestion for
each one, real sizes before any download, and nothing heavy without a clear yes. Everything you do runs
through the `npx cuekitvoltz` CLI, so the result matches what the interactive `npx cuekitvoltz init`
would produce.

## Rules

- **Ask, with a suggestion.** Use your question tool (multiple choice) when you have one. Put the
  recommended option first. Ask in the user's language; the examples below are English.
- **Never download without a yes**, and say how big it is first. If the user says no, carry on: themes
  and rendering-only setups work without the voice models.
- **Synthetic voices only.** Never offer to clone a voice from a recording.
- **Don't render long videos during setup.** The starter is written, not rendered; offer stills or a
  render afterwards.
- Run the CLI from the project root (where `package.json` and `src/` live).

## 0. Look at the machine

```bash
npx cuekitvoltz doctor --json
```

It reports the GPU, Python 3.11 (or uv), free disk, what's already installed, and the current config.
Use it to pick your suggestions: no NVIDIA GPU means a smaller PyTorch, no Python 3.11 means voice
can't install until the user adds uv or Python 3.11, and little disk space means suggest less.

## 1. Theme

Ask: **"Would you like to set up a colour theme for your videos?"**
- Pick a suggested palette (recommended)
- Create my own palette
- Skip for now (videos use the default dark theme)

**Suggested palettes** (`npx cuekitvoltz theme presets`):

| Preset | Colours (bg, surface, text, accent, accent 2) | Feel | Fonts |
|---|---|---|---|
| `sand` | `#3A2C1F` `#5B4632` `#F4D9A0` `#C8792C` | warm brown, sand and copper | editorial |
| `ember` | `#06110C` `#171717` `#F2EEE8` `#A31C1B` | green-black and deep red | editorial |
| `studio` | `#F4F5F7` `#FFFFFF` `#16181D` `#3B5BDB` | white high-key, ink and blue | clean |
| `midnight` | `#07070B` `#15151C` `#F5F5F7` `#7D7AFF` `#FF6FB5` | near-black, violet-pink spectrum | editorial |
| `neon` | `#0A0A14` `#141428` `#EDEBFF` `#00E5A8` `#FF3EA5` | ink blue, mint and magenta | grotesk |
| `paper` | `#F3EDE2` `#FBF7F0` `#1E1A16` `#D9480F` | warm paper, ink and vermilion | classic |

If the user describes a brand or a mood instead, suggest the closest preset, or build a custom palette
from what they said and show it before saving.

**Their own palette:** ask for a background, a text colour and an accent (hex), plus an optional
second accent.

**Fonts:** offer the preset's pairing first. All of them are OFL:
- `editorial`: Geist / Instrument Serif / Geist Mono
- `clean`: Inter / Newsreader / JetBrains Mono
- `grotesk`: Space Grotesk / Fraunces / Space Mono
- `plex`: IBM Plex Sans / Serif / Mono
- `classic`: DM Sans / DM Serif Display / DM Mono

Then save it:

```bash
npx cuekitvoltz theme add <name> --preset <preset> [--fonts <pairing>]
npx cuekitvoltz theme add <name> --colors "#bg,#text,#accent[,#accent2]" [--fonts <pairing>]
```

- The CLI checks contrast. If it prints "Text on background is 3.1:1 … Suggested text colour: #…",
  tell the user and offer the fix. If they accept, re-run with `--fix --force`.
- An accent below 3:1 is fine for shapes: captions automatically use a readable version of it.
- Each theme gets its own folder: `cuekitvoltz/themes/<name>/` with `theme.json`, `theme.ts` and
  `preview.svg`. Point the user at the preview.
- The newest theme becomes active (`cuekitvoltz/theme.ts`). Users can keep as many as they like:
  `theme list`, `theme use <name>`, and after editing `theme.json`, `theme build <name>`.

## 2. Downloads

Show what's needed and how big it is (sizes measured on Linux; the Python libraries depend on the
PyTorch build):

| Item | Size | What it's for |
|---|---|---|
| `browser`: Chrome Headless Shell | ~240 MB | every render |
| `gpu-browser`: Chrome for Testing | ~400 MB | fast 3D renders on a GPU (offer only if there is one) |
| `voice`: Python libraries + Kokoro + word aligner | ~5.7 GB with an NVIDIA GPU, ~2.2 GB without | calm, clean voices; word timings and lip-sync |
| `chatterbox`: Chatterbox-Turbo | ~5.6 GB | voices that act out `[emotion]` tags |

Ask: **"What should we download?"**
- Everything: voices that act out emotion (recommended when there's a GPU, Python 3.11 and the space)
- Light voice: Kokoro only
- Rendering only, no voice
- Nothing now

On a yes:

```bash
npx cuekitvoltz download browser gpu-browser voice chatterbox --yes   # everything
npx cuekitvoltz download browser voice --yes                         # light voice
npx cuekitvoltz download browser --yes                               # rendering only
```

- This can take a long time (several GB). Run it in the background if you can, and tell the user it's
  running.
- The voice install creates `.venv-voice/` (Python 3.11, via uv when it's installed) and adds it to
  `.gitignore`.
- If something fails, the CLI says what. Retry just that item; `doctor` shows what's in place.

## 3. Default voice

Only if a voice engine is installed. Offer the presets, recommended first:
- With Chatterbox: `cb-heart` (expressive female, recommended), `cb-michael`, `cb-fenrir`, `cb-builtin`
- Kokoro: `heart` (calm, deterministic), `bella`, `emma`, `michael`, `fenrir`, `puck`

Offer short samples first, so the user can listen:

```bash
npx cuekitvoltz voice-samples cb-heart heart michael --out cuekitvoltz/voice-samples
```

Give them the paths to play. Then save their pick:

```bash
npx cuekitvoltz config voice <preset>
```

`direct` uses it for any script that doesn't name a voice. Chatterbox needs about 2.5 GB of free RAM
while it runs.

## 4. Starter video

Ask: **"Create a starter video with your theme and voice?"**

```bash
npx cuekitvoltz starter
```

- It writes `src/starter/Starter.tsx`, a 9:16 short with two scenes and a whip cut, on the active
  theme.
- With a voice installed, it also writes a `script.vo.md` and performs it.
- It registers the composition as `starter` in the Root. If it can't find where, it prints the two
  lines to add; add them yourself.
- Offer `npx remotion studio` to see it, and stills (`npx cuekitvoltz stills starter 45 150 --qa`)
  if they want a check. Don't render the full video unless they ask.

## Done

- Summarise in a few lines: the theme (with its preview path), what was downloaded, the default voice,
  the starter.
- `cuekitvoltz.config.json` now exists, so this skill won't run again on its own.
- From here, videos use the theme through `<Stage theme={theme}>`, importing
  `{ theme }` from the project's `cuekitvoltz/theme`.
