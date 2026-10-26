# QA

Nothing ships on "it rendered". There are two passes: layout QA on stills before the full render,
and a scan of the final MP4 after it.

## Layout QA on stills

Wrap the video in `<Stage>`, then:

```bash
npx cuekitvoltz stills <id> <frames...> --qa --sheet
```

Each frame is rendered with the safe area drawn on it and numbered boxes over problems. Issues are
printed and saved to `qa.json`, and the exit code is 1 if any were found, so it works in CI.

| Issue | What it catches |
|---|---|
| `unsafe` | text outside the platform-safe area, or under the Shorts/Reels button column |
| `overlap` | two separate pieces of text on top of each other |
| `small` | text below the platform minimum (30 px for shorts, 24 px for 16:9) |
| `clipped` | text cut off by an `overflow: hidden` box |

- Mark intentional exceptions with `data-qa-allow="unsafe overlap small clipped"` on the element or
  an ancestor, and dev-only UI with `data-qa-ignore`. Device-screen UI (`ScreenOverlay`) is skipped
  automatically.
- Judge settled frames: transitions overlap by design.
- The safe area for 1080×1920 is x 90–990, y 240–1480: platform UI covers the top bar, the bottom
  ~440 px and a right-side button column. `<Stage safe>` picks the preset (`auto` by default).
- The `qa-fixture` example is a deliberately broken still that must report exactly 5 issues.

`--sheet` also writes a contact sheet. Read it yourself for what a checker can't judge: empty or
crowded areas, text on busy backgrounds, palette, and one hero per scene.

## Full-render scan

Glitches hide between stills, so tile every Nth frame of the MP4 and look at all of it:

```bash
ffmpeg -v error -y -i out.mp4 -vf "select='not(mod(n\,3))',scale=120:-1,tile=19x5" -frames:v 1 scan.jpg
```

| Signature | Cause | Fix |
|---|---|---|
| Device screens blank, partial or tiled on some frames | GPU render with concurrency > 1 | `--gpu` (it forces concurrency 1) |
| Whole frame repeated in horizontal strips | the same multi-tab GPU compositor bug | concurrency 1 |
| 3D frame much darker than the stills | an accumulation buffer wiped by `autoClear` | the kit pipeline keeps it off; check custom passes |
| Chrome or metal reads black | the studio has nothing to reflect | add or brighten panels, or pick another studio |
| "No frame found at position" | `OffthreadVideo` cache too small | `--video-cache 512` |
| Render killed (exit 137) | out of memory | lower concurrency; sub-frame blur plus full-frame grain is heavy |

## Audio

```bash
ffmpeg -hide_banner -i out.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12   # target −14 LUFS, true peak ≤ −1 dBTP
```

`npx cuekitvoltz render` normalises to −14 LUFS / −1 dBTP (two-pass EBU R128). A raw
`npx remotion render` doesn't, so normalise before uploading.

The **video-qa** Claude skill runs all of this and writes a short report ([skills.md](skills.md)).
