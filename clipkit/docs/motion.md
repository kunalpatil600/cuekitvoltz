# Motion

Motion is the difference between a slideshow and a film. The kit models every animated value as a
**`Motion`**, a pure function from frame to value, so the same move can be rendered, sampled between
frames for motion blur, graphed, and read for speed and direction.

```tsx
const { fps } = useVideoConfig();
// enters already moving, settles with a small overshoot, blurs while fast, leaves with a wind-up
const x = spring({ at: 34, fps, from: 1180, to: 90, duration: 0.62, bounce: 0.25, velocity: 2.2 });
const y = add(constant(660), windup({ at: 99, by: 26 }), tween({ at: 99, dur: 12, to: -1700, ease: ease.in }));
const trail = follow(x, { fps });            // contents lag behind the card, then catch up

<Move x={x} y={y} stretch={0.0008}>
  <Card>
    <Move layout="inline" shutter={0} x={(f) => (trail(f) - x(f)) * 0.35}>…contents…</Move>
  </Card>
</Move>

<Split text="One request," unit={(i, n) => {
  const at = 10 + stagger(i, n, { each: 1.1 });
  return { y: spring({ at, fps, from: 62, to: 0, ...springs.snappy }), opacity: tween({ at, dur: 5 }), weight: tween({ at, dur: 16, from: 300, to: 760 }) };
}} />
```

## Building blocks

| Function | What it gives you |
|---|---|
| `spring({ at, fps, from, to, duration, bounce, velocity })` | a closed-form spring, exact at fractional frames. `duration` (seconds) and `bounce` (0 = none, 0.3 = lively) are easier to direct than stiffness and damping. `velocity` makes it enter already moving. |
| `springs.*` | presets: `snappy`, `smooth`, `gentle`, `bouncy`, `wobbly`, `heavy`, `pop`. Spread them into `spring()`. `springFrames(cfg, fps)` says when one settles. |
| `tween({ at, dur, from, to, ease })` | a timed move on a curve from `ease` (`out`, `in`, `inOut`, `expoOut`, `backOut` …) |
| `keys([[frame, value, ease?], …])` | keyframes |
| `add(a, b, …)`, `delay(m, n)`, `constant(v)` | layering: a base position plus a wind-up plus an exit |
| `windup({ at, by })` | anticipation: a small move the other way just before `at`, as an offset to `add()` |
| `follow(target, { fps, duration, bounce })` | follow-through: a spring that chases another motion |
| `stagger(i, n, { each, from })` | start offsets for a group; `from` is `'start'`, `'end'`, `'center'`, `'edges'` or `'random'` |
| `velocity(m, frame)`, `sample(m, from, to)` | read speed and values, for graphs and your own effects |

## Motion blur

- **`<Move>`** blurs along the direction of travel by the distance covered while the shutter is open
  (`shutter` 0.5 = a 180° shutter, like film). It costs one SVG blur per moving element, and settled
  elements stay sharp. `stretch` adds squash and stretch along the velocity. Its children stay in
  normal flow; position them with `x` and `y`.
- **`<MotionBlur samples shutter active>`** renders its subtree `samples` times across the shutter and
  averages them, for rotation, scaling, curved paths or whole scenes. It costs N× the render time, so
  switch it on only while things move fast (`active={(f) => f > 10 && f < 40}`).
- **`<Split>`** moves each glyph or word with its own motion and its own blur. `unit(i, n)` returns
  motions for `x`, `y`, `opacity`, `scale`, `rotate`, variable-font `weight`, and a `style`.

In practice, motion blur adds about 15% to the render time of a typical scene.

## Directing it

| Intent | Use |
|---|---|
| UI pieces, chips, cards arriving | `springs.snappy`: fast and settled, with a whisper of life |
| Camera moves, big panels, layout changes | `springs.smooth`: heavy things don't wobble |
| Playful entrances, icons, mascots | `springs.bouncy` or `springs.pop`; keep overshoot for small things |
| Huge objects, title slams | `springs.heavy` |
| Exits | a short `tween` with `ease.in` (8–12 frames): things leave faster than they arrive |
| Constant drift (packets, orbits) | linear: the only place linear motion belongs |

- Give big moves anticipation (`windup`) and let trailing parts follow through (`follow`).
- Never start a group on the same frame: stagger by 1–2 frames.
- Combine x and y springs of different durations for arcs, instead of straight lines.
- Hold text still for at least ~12 frames per line before moving it again.

## Lab instruments

To judge motion from stills, use the lab components:
- `<MotionGraph>` plots position and speed. Dots mark whole frames, so their spacing shows the easing.
- `<OnionSkin>` overlays several frames of one element.
- `<Compare>` puts a before and an after side by side.

The `kit-motion` and `kit-lab` examples use them.
