# Transitions

```tsx
<Scenes>
  <Scene duration={80}><Click /></Scene>
  <Cut duration={20} kind={zoomThrough({ box: HERO })} />
  <Scene duration={70}><Api /></Scene>
  <Cut duration={24} kind={blob({ x: 0, y: 1, color: '#7D7AFF' })} />
  <Scene duration={60}><Db /></Scene>
</Scenes>
// composition length: scenesLength([80, 70, 60], [20, 24])
```

`<Scenes>` works like Remotion's `TransitionSeries`, with one difference: each cut reads its progress
from the frame. That lets `MotionBlur`'s sub-frame samples run through a cut, so a zoom-through gets a
real zoom blur. A cut overlaps the scenes on both sides of it, so the composition is
`scenesLength(scenes, cuts)` frames long.

**Every scene paints its own background.** A transparent scene would show the previous one during a
cut.

## Kinds

Positions (`x`, `y`) are fractions of the frame; `zoomThrough`'s `box` is in px.

| Kind | What it does |
|---|---|
| `push({ dir, parallax })` / `whip({ dir })` | travel with a smear |
| `wipe({ angle, feather, glow })` | soft edge, optional glowing edge |
| `iris()` | soft circle |
| `shape({ path, rim })` | any outline grows and unspins |
| `blob({ x, y, color })` | liquid, led by a coloured wave |
| `zoomThrough({ box, blur })` | the camera flies into a box in the old scene |
| `matchZoom({ x, y })` | match cut: both scenes zoom around the matched point |
| `lightLeak()` | warm light floods across |
| `dip()`, `crossfade()` | the plain ones |

A zoom-through into a box of a different aspect needs the next scene's background overscanned
(scaled past the frame), or its edges show during the zoom.

To write your own kind, implement `TransitionKind.render({ p, dp, side, width, height, children })`.
`p` is the cut's progress, `dp` its speed (for blur), and `side` says whether you're rendering the
outgoing or the incoming scene.

## Picking one

| Intent | Kind |
|---|---|
| Diving into a detail (a key, a tile, a screen) | `zoomThrough`; use 12 blur samples for deep zooms |
| The same object continues across the cut | Magic Move (`<Shared>`) or `matchZoom` |
| Energetic topic change | `whip`, `push` |
| Organic, playful change | `blob`, `shape` |
| Calm chapter change | `dip`, `crossfade`, `lightLeak` |
| Reveal along a direction | `wipe`, `iris` |

Cuts are usually 12–24 frames. With a voice-over, centre each cut on the section boundary;
`voiceScenes()` does that for you ([voice.md](voice.md)).

## Magic Move

A `<Shared box={boxTrack(keys, fps)}>` element sits above the scenes it connects and travels between
layouts, while the scenes leave a gap where it is.
- `fit="size"` lays it out at the box size (cards, tiles).
- `fit="scale"` with `base={{ w, h }}` (the content's own layout size) scales its content to the
  box width (text, icons).
- Its children can be a function of the current box.

## Morph

`<Morph paths={[shapes.circle(), shapes.star(), …]} at={motion} width={200} height={200} />` matches
outlines point for point, aligning the start point and direction. Drive it with non-bouncy springs and put any bounce on scale
instead. `blobPoints()` makes organic outlines; `pathPoints()` samples any SVG path.

The `kit-transitions` example (16:9) shows every kind plus morph and Magic Move, and
`kit-reel-transitions` uses them in a short.
