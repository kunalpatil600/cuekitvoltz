---
name: video-qa
description: >
  Quality-check Remotion videos before they are called done: layout QA on stills (safe areas,
  overlaps, small or clipped text), a frame-by-frame glitch scan of the final MP4, motion and sync
  spot-checks against the voice track, loudness and true-peak checks, and content rules (facts,
  palette, licences, logos). Use it after every render of a video, showcase or kit demo,
  and whenever the user asks to "check", "verify", "QA" or "review" a video or says something looks off
  (flicker, blank screens, cut-off text, bad audio, voice out of sync).
---

# Video QA

Nothing ships on "it rendered". You look at frames, you measure audio, and you report what you saw:
the numbers, and the files you checked.

## Before you start

If stills or renders fail because no browser is installed, run `npx cuekitvoltz download browser`
(~240 MB; add `gpu-browser`, ~400 MB, for `--gpu`). `npx cuekitvoltz doctor` shows what's missing.

## 1. Stills and layout (before the full render)

```bash
npx cuekitvoltz stills <id> <f1> <f2> … --sheet [--gpu]   # key frames + contact sheet (renders/_stills/<id>/)
npx cuekitvoltz stills <id> <settled frames> --qa [--gpu] # boxes over issues, qa.json, exit 1 on issues
```

- **Pick frames:** one settled frame per scene, plus each anchor or beat, plus the end card. Use
  `VO.at(...)` to find them. Judge settled frames only, because transitions overlap by design.
- **QA needs `<Stage>`:** the video must be wrapped in the kit's `<Stage>`, which reads the `qa` prop.
- **QA kinds:** `unsafe` (outside x 90–990 / y 240–1480 on shorts, or under the right button
  column), `overlap`, `small` (below 30 px on shorts, 24 px on 16:9), `clipped`.
- **Exceptions:** mark intentional ones with `data-qa-allow`. Device-screen UI (`ScreenOverlay`) is
  skipped automatically.
- **Read the sheet yourself:** empty areas, crowded areas, text on busy backgrounds, the palette
  (one palette per video, used consistently), and the hierarchy: one hero per scene.

## 2. Full-render scan (after the render)

Tile every Nth frame of the MP4 and look at all of it. Glitches hide between stills.

```bash
ffmpeg -v error -y -i out.mp4 -vf "select='not(mod(n\,3))',scale=120:-1,tile=19x5" -frames:v 1 scan.jpg
ffmpeg -v error -y -i out.mp4 -vf "select='between(n\,100\,120)',scale=180:-1,tile=7x3" -frames:v 1 zoom.jpg
```

| Signature | Cause | Fix |
|---|---|---|
| Device screens blank, partial or tiled on some frames | GPU render with concurrency > 1 (Chrome for Testing drops tiles of matrix3d layers) | `--concurrency=1` (`--gpu` sets it) |
| Whole frame repeated in horizontal strips | same multi-tab GPU compositor bug | `--concurrency=1` |
| 3D frame much darker than the stills | accumulation buffer wiped (renderer `autoClear` on) | the kit pipeline sets it off; check custom passes |
| Chrome or metal reads black | the studio has nothing to reflect | add or brighten panels, or pick another studio |
| Square halo around highlights | mirror-highlight spikes in bloom | already clamped; raise `threshold` or dim the hot panel |
| "No frame found at position" | OffthreadVideo cache too small | `--video-cache 512` |
| Render killed, exit 137 | OOM (sub-frame blur + grain, or 2 tabs) | `--concurrency 1`, clear leftover `remotion-*` bundles from the temp folder |

## 3. Motion and sync

- **Sync:** for each anchor, render the frame at `VO.at(anchor)` and the frame 3 later. The visual
  must be arriving or have arrived. Captions must show the word being spoken.
- **Lip-sync:** at a few spoken words, the mouth should be closed on m/b/p and open on vowels, and
  closed in pauses.
- **Motion:** use stills at a fast move for motion blur (smear direction = travel), and check that
  nothing jumps between consecutive frames. Lab tools: `MotionGraph`, `OnionSkin`, `Compare`.

## 4. Audio

```bash
ffmpeg -hide_banner -i out.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12   # target −14 LUFS, true peak ≤ −1 dBTP
ffprobe -v error -show_entries format=duration -of csv=p=0 out.mp4              # duration matches VO.frames / fps
```

- Listen to the hook and the payoff. The voice must sit clearly over the music, which should dip
  while the voice speaks (`VO.duck(...)`).
- No clipping, and no SFX louder than the voice.
- `npx cuekitvoltz render` loudness-normalises the mix. A raw `npx remotion render` doesn't, so
  normalise before upload.

## 5. Content rules

- **Facts** are correct, with sources noted next to the video (e.g. a `post.md`). Simplifications
  are noted.
- **No real logos** or trademarks unless you have the rights. Avoid maps and country outlines
  unless they're accurate and sourced. Check font licences cover video (e.g. SF Pro's doesn't).
- **Images** are CC0, public domain or CC BY, and credited.
- **Voices** are synthetic presets only. No cloned real voices.

## Report

Write a short report:
- what you rendered, and how (GPU or software, concurrency, time taken)
- the frames and scans you looked at, with paths
- QA issue counts
- loudness and true-peak numbers
- every problem found, with its fix or why it stays

Say plainly if something wasn't checked.
