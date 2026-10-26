# Module reference

Everything is exported from the package root:

```ts
import { spring, Move, Scenes, Scene3D, voiceTrack } from 'cuekitvoltz';
```

| Module | Exports | What it's for |
|---|---|---|
| `core/motion` | `Motion`, `sample`, `velocity`, `clamp`, `lerp` | motion as pure functions of the frame |
| `motion/ease`, `motion/tween` | `ease`, `tween`, `keys`, `add`, `delay`, `constant` | named curves, keyframes, layering moves |
| `motion/spring` | `spring`, `springs`, `springValue`, `springFrames` | closed-form springs (`duration` + `bounce`), exact at fractional frames |
| `motion/principles` | `windup`, `follow`, `stagger`, `stretchFor` | anticipation, follow-through/drag, staggering, squash and stretch |
| `motion/Move` | `Move` | moves anything with velocity-driven directional motion blur and stretch |
| `motion/MotionBlur` | `MotionBlur` | sub-frame motion blur for rotation, scaling, curved paths, whole scenes |
| `motion/Split` | `Split`, `Unit` | kinetic type: per-glyph or per-word motion, each with its own blur |
| `motion/smear` | `smear`, `Smear` | the directional blur behind `Move`, for whole scenes too |
| `shape` | `shapes`, `morph`, `Morph`, `pathPoints`, `blobPoints`, `smoothPath`, `roundRectPath` | outlines as point lists: presets, morphing any outline into any other, organic blobs |
| `transitions/Scenes` | `Scenes`, `Scene`, `Cut`, `scenesLength`, `TransitionKind` | frame-driven scene timeline with cuts (sub-frame blur works through them) |
| `transitions/kinds` | `push`, `whip`, `wipe`, `iris`, `shape`, `blob`, `zoomThrough`, `matchZoom`, `lightLeak`, `dip`, `crossfade` | the transition kinds |
| `transitions/box`, `Shared` | `Box`, `boxTrack`, `lerpBox`, `Shared` | Magic Move: one element travelling between layouts |
| `core/color` | `hexToRgb`, `mixColor`, `shade`, `withAlpha` | colour math for shading |
| `world/iso` | `isoView`, `project`, `IsoScene`, `IsoGrid`, `IsoBox`, `IsoCylinder`, `IsoSphere`, `IsoShadow`, `IsoQuad`, `onFace`, `faceRect`, `IsoLink`, `isoRoute` | isometric scenes: light-shaded faces, painter's-order depth, routes with packets |
| `world/iso/objects` | `Server`, `Database`, `Cloud`, `Laptop`, `Phone`, `Router`, `Gpu`, `IsoPerson`, `Platform`, `isoColors`, `useIsoColors` | ready-made tech objects with entrances (`rise`, `lift`) |
| `world/character` | `Character`, `characterLooks`, `poses`, `performance`, `gestures`, `withGestures`, `blinkAt` | a 2D character rig: poses on springs, automatic follow-through, blink, breath, talk, visemes |
| `world/character/Stick` | `Stick` | a stick-figure astronaut on the same pose rig |
| `world/space` | `Starfield`, `Nebula`, `PlanetRim`, `BlackHole` | science-explainer scenery |
| `world/look` | `Look`, `Grain`, `Paper`, `Vignette`, `Halftone`, `Duotone`, `Outline` | style packs, all procedural |
| `three/Scene3D` | `Scene3D`, `cocPx`, `Post3D`, `Dof3D`, `Backdrop3D` | a WebGL scene through the kit pipeline: sub-frame motion blur, bloom, depth of field, filmic finish |
| `three/camera` | `orbit`, `lookAt`, `dollyZoom`, `handheld`, `mixRigs`, `projectPoint` | the camera as a pure function of the frame |
| `three/studio`, `three/materials` | `Studio`, `studios`, `materials` | procedural light studios (no HDR files) and PBR material presets |
| `three/time`, `three/Anim` | `useMotion3D`, `Anim` | animating 3D objects so they take part in motion blur |
| `three/Icon3D`, `three/Type3D` | `Icon3D`, `Text3D`, `Extrude3D`, `loadFont3D` | Lucide icons as drawn-on tubes; extruded, bevelled type and SVG shapes |
| `three/devices`, `three/overlay` | `laptopRig`, `Laptop3D`, `phoneRig`, `Phone3D`, `ScreenOverlay`, `Pin3D` | generic device mockups with live React content on the glass; DOM pinned to 3D points |
| `three/Gem` | `Gem`, `roundBrilliant`, `convexSolid`, `jewelleryStudio`, `lightTent` | ray-traced cut stones: refraction, internal reflection, dispersion; their own animatable light studio |
| `voice` | `voiceTrack`, `voiceScenes`, `Captions`, `VoData`, `Viseme` | syncing a video to the voice director's output: sections, anchors, words, lip-sync, captions, music ducking |
| `theme` | `Theme`, `ink`, `makeTheme`, `ThemeProvider`, `useTheme`, `kitFonts` | design tokens plus the defaults for iso objects, 3D light and background, and captions; a brand swaps in one object ([themes.md](themes.md)) |
| `stage` | `Stage`, `Guides`, `safeAreaFor`, `SafeArea` | root of every kit video: theme, background, platform safe areas, the QA hook |
| `qa` | `Inspect`, `Issue` | layout QA on rendered frames |
| `lab` | `Compare`, `OnionSkin`, `onionFrames`, `MotionGraph` | judging motion from stills |

## Design rules

The kit follows four rules, and `npm run kit:check` enforces them in this repo:

1. **Self-contained.** Imports come from inside the kit or from its peer packages: `react`,
   `react-dom`, `remotion`, `@remotion/*`, `three`, `@react-three/*` and `lucide` (types only).
2. **Frame-pure.** Every frame renders the same on every machine: no `Math.random()` (use Remotion's
   `random(seed)`) and no wall-clock time. Your own scenes should follow this too.
3. **No project assets.** The kit never calls `staticFile()`; fonts, audio and images come in as
   props (for example `Text3D font={staticFile('fonts/X.ttf')}`).
4. **Motion is data.** Animate with `Motion` functions (`frame => value`). The lab can then graph and
   onion-skin them, and later layers read speed and direction from them (motion blur, stretch, 3D
   shutter samples).
