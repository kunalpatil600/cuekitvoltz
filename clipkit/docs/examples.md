# Examples

Every example is a composition in [`examples/`](../examples/), registered in
[`examples/Root.tsx`](../examples/Root.tsx). Open them all with `npm run dev`.

The examples import the kit by its package name (`from 'cuekitvoltz'`), exactly as your project
would. Inside this repo, `remotion.config.ts` points that name at `src/`.

## Showcases

| Id | Format | What it shows | Render with |
|---|---|---|---|
| `showcase-enter` | 1080×1920, 21 s | "What happens when you press Enter?": a lip-synced host, a zoom-through into an isometric network whose packets land on the narrator's anchors, word captions. Warm palette. | software |
| `showcase-product` | 1080×1920, 17 s | a 3D product shot: the laptop opens on "laptop", the app boots on "glass", the phone flies in on "phone". Dark palette. | `--gpu` |
| `showcase-kit` | 1920×1080, 20 s | the kit reel: one scene per feature, cut on the voice's sections | `--gpu` |
| `bh-fall` | 1080×1920, 40 s | "What if you fell into a black hole?": a stick-figure astronaut, a lensed black hole, spaghettification, time dilation | software |
| `ring-ad` | 1080×1920 at 24 fps, 30 s | a luxury ring commercial in a white studio: one continuous camera move in six shots, a ray-traced diamond with fire, a 360° turn with motion blur | `--gpu` |

The four voiced examples are TTS-first: each folder has the `script.vo.md` the voice was performed
from and the `vo.json` the video syncs to. Their voice tracks (in `public/voice/`) were made with the
`cb-heart` preset.

## Boards and reels

| Id | Format | What it shows |
|---|---|---|
| `kit-lab` | 16:9 | a plain-Remotion scene next to the same scene on the kit, with position and speed graphs and an onion skin |
| `lab-baseline`, `lab-after` | 9:16 | those two scenes at full size |
| `kit-motion` | 16:9 | every spring preset with its speed graph, rotation with and without `MotionBlur` |
| `kit-transitions` | 16:9 | every transition kind, plus morph and Magic Move |
| `kit-reel-transitions` | 9:16 | transitions in a short story |
| `kit-iso` | 16:9 | the isometric objects and links |
| `kit-characters` | 16:9 | character poses, gestures and looks |
| `kit-looks`, `kit-look-print` | 16:9 | the style packs |
| `kit-reel-world` | 9:16 | the "press Enter" explainer built from the visual world |
| `kit-3d-materials` | 16:9 | studios and material presets (warm palette) |
| `kit-3d-type` | 16:9 | extruded type and icons (dark palette); the `blur` prop sets the samples |
| `kit-reel-3d` | 9:16 | a laptop with a live dashboard, a phone fly-in, a focus rack |
| `kit-gem` | 16:9 | the ray-traced diamond alone in a white light tent |
| `qa-fixture` | still | a deliberately broken layout that must report exactly 5 QA issues |
| `gl-probe` | still | reports which WebGL implementation the render browser got |

The 3D boards and reels render much faster with `--gpu` ([rendering.md](rendering.md)).

## Assets

- `public/fonts/`: Geist ExtraBold and Instrument Serif Italic, under the SIL Open Font License
  (`public/fonts/OFL.txt`), for `Text3D`.
- `public/sfx/`, `public/music/`: generated procedurally for this project; covered by the repo's MIT
  license.
- `public/voice/`: synthetic voice tracks made with Kokoro and Chatterbox-Turbo (see
  [voice.md](voice.md)).
