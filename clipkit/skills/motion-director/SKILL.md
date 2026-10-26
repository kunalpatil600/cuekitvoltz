---
name: motion-director
description: >
  Direct the motion of Remotion videos built on the cuekitvoltz kit (the `cuekitvoltz` package). Use it to choose springs
  and easings, apply animation principles (anticipation, follow-through, stagger, squash and stretch,
  motion blur), pick scene transitions, stage isometric, character and 3D scenes, and time all of it to
  the voice track. Use it whenever you build or revise a scene, a board, a showcase or a video
  that imports from cuekitvoltz. Also use it when the user says the motion looks basic, floaty, stiff, cheap,
  "PowerPoint-y" or "not studio level", or asks how to animate something in Remotion with the kit.
---

# Motion director

You direct motion the way a studio motion designer does. Every move has a reason, a weight and a
moment. The kit gives you the instruments; this skill is about playing them. For signatures and
examples, see [api.md](api.md).

## Before you start

- **Set up?** If `cuekitvoltz.config.json` isn't in the project root, the project was never set up.
  Run the **cuekitvoltz-setup** skill first: it asks about a theme and the downloads, and downloads
  nothing without a yes.
- **Theme:** if the config names one, use it. Wrap every video in `<Stage theme={theme}>`, importing
  `{ theme }` from the project's `cuekitvoltz/theme`. Colours, fonts, iso objects, `<Scene3D>` light and
  background, and `<Captions>` then follow it, so don't hard-code colours that fight it.

## Ground rules (the kit enforces most of them)

- **Motion is data.** Animate with `Motion` functions (`frame => value`): `spring`, `tween`, `keys`,
  `add`, `delay`, `constant`. Don't hand-roll `interpolate` chains in kit-style scenes. Motion
  functions can be sampled at sub-frames, so blur, graphs and 3D shutter samples all come for free.
- **Frame-pure.** Use no `Math.random`, `Date` or `performance.now`. For randomness use `random(seed)`.
  (Inside the cuekitvoltz repo, `npm run kit:check` enforces this for the kit itself.)
- **Time comes from the voice.** If the video has a voice-over, build it TTS-first:
  `voiceTrack(vo, fps)` gives you `at('section' | 'anchor')` and `word('text')`. Never hand-type a
  frame number for something the narrator says.
- **One hero per scene.** One thing moves big; everything else supports it with smaller, later and
  softer moves.
- **Use one palette per video:** the project's theme (`theme.bg`, `theme.text`, `theme.accent`,
  `theme.ramp` …). Without a theme, pick 2–3 colours plus neutrals up front and reuse them in 2D, in the
  3D studio and in the captions.

## Choosing motion

| Intent | Use | Why |
|---|---|---|
| UI pieces, chips, cards arriving | `springs.snappy` (0.35 s, bounce 0.12) | fast and settled, with a whisper of life |
| Camera moves, big panels, layout changes | `springs.smooth` (no bounce) | heavy things don't wobble |
| Playful entrances, icons, mascots | `springs.bouncy` / `springs.pop` | overshoot reads as energy; keep it for small things |
| Huge objects, title slams | `springs.heavy` | slow start, firm stop |
| Exits | `tween({ ease: ease.in })`, short (8–12 frames) | things leave faster than they arrive |
| Constant drift: packets, conveyor belts, orbits | linear (`ease: (t) => t`) or `f => f * k` | the only place linear motion belongs |
| Shape morphs | non-bouncy springs (morph `t` clamps to 0–1) | put any bounce on scale instead |

## Principles checklist

1. **Anticipation:** before a big move, use `windup` (a small move the other way) or a 2–4 frame hold.
2. **Overlap and follow-through:** for parts that trail the lead, use `follow` (spring chase), or the
   character rig's automatic elbows, knees and head.
3. **Stagger:** use `stagger(i, n, { each: 1–2 frames })`. Never start a group on the same frame.
   Exit order should mirror the layout (for example top-first), so pieces don't cross.
4. **Squash and stretch:** `Move` with `stretch` stretches along velocity. Keep it subtle on UI.
5. **Motion blur:** `Move` blurs automatically from velocity. For rotation, scaling or whole scenes,
   use `MotionBlur` (N× cost; gate it with `active`). In 3D, set `<Scene3D blur={{ samples: 6–12 }}>`
   and animate only via `Anim` / `useMotion3D`.
6. **Arcs:** for travel, combine an x spring with a y spring of a different duration, rather than a
   straight line.
7. **Holds:** give text at least ~12 frames of stillness per line before it moves again. Reading
   time beats flourish.

## Transitions: pick by intent

| Intent | Kind |
|---|---|
| Diving into a detail (a key, a tile, a screen) | `zoomThrough({ box })`. Overscan the target scene's background if the box aspect differs. Use 12 blur samples for deep zooms. |
| The same object continues across the cut | Magic Move: `<Shared box={boxTrack(...)}>`, or `matchZoom` on the shared point |
| Energetic topic change | `whip({ dir })`, `push` |
| Organic, playful change | `blob`, `shape` |
| Calm chapter change | `dip`, `crossfade`, `lightLeak` |
| Reveal along a direction | `wipe`, `iris` |

Cut durations are usually 12–24 frames. Center the cut on the voice section boundary:
`scene A = at('next') + cut / 2`.

## Worlds

- **Isometric explainers** (`IsoScene`, `Server`, `Laptop`, `IsoLink` …): objects rise on staggered
  springs. Packets ride `IsoLink` with `at` tweens that *arrive* on the narrator's anchor word. Put a
  pulse or ring on arrival. Labels are HTML placed with `project(view, point)`.
- **Character host:** use `performance([{ at, pose }])` with poses on springs, add gestures with
  `withGestures`, and lip-sync with `talk={VO.mouth} viseme={VO.viseme}`. Re-key poses on the voice's
  words: point on the noun, shrug on the question, cheer on the payoff.
- **Style packs:** wrap in `<Look pack="film">` for grain and vignette. `print` and `duotone` need
  opaque backgrounds.

## 3D (Scene3D)

- **Camera:** `orbit` with motion on az, el and dist. Push in during explanation, pull back on the
  payoff. Add a touch of `handheld(rig, { amount: 0.5 })` for life. Move between setups with
  `mixRigs(a, b, spring)`.
- **DOF:** focus follows the rig target. Rack with `dof.focus` as a Motion. Pass the same `dof` to
  `ScreenOverlay`.
- **Light:** a studio preset that matches the palette (`warm`, `ember`) and a `Backdrop3D` gradient
  with a soft glow behind the hero.
- **Bloom:** emissive `materials.neon(color, 3–5)`. Bloom keys on the brightest channel
  (threshold ~1.4). If chrome blooms into halos, dim the studio's hot panel.
- **Devices:** `laptopRig` / `phoneRig` plus `ScreenOverlay` for live React UI. If something passes
  in front of a screen, pass `occluders={[phone.outline]}`.

## Rendering

- Stills first: `npx cuekitvoltz stills <id> <frames...> --sheet` (add `--gpu` for 3D). Look at them.
- 3D video: `npx remotion render <id> out.mp4 --gl=vulkan --chrome-mode=chrome-for-testing --concurrency=1`,
  or `npx cuekitvoltz render <id> --gpu`. **Concurrency 1 on the GPU, always.**
- Sub-frame blur combined with full-frame grain can OOM at concurrency 2, so use `--concurrency=1`.
- Hand the result to the **video-qa** skill before calling it done.

## Common mistakes

- `Freeze` is relative to its parent sequence. Inside `Scenes`, convert absolute voice frames with
  `VO.at(x) - sceneStart`.
- A 3D object animated through React props (not `Anim` / `useMotion3D`) renders fine but doesn't blur.
- Every scene paints its own background. A transparent scene shows the previous one during cuts.
- Don't put text in the bottom ~440 px or under the right-side button column of a short (x > 960,
  y > 1000).
