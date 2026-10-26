# Visual world

Ready-made scenery so explainers don't fall back to text on a gradient: an isometric tech world, a
character host, a stick-figure astronaut with space scenery, and style packs.

## Isometric kit

```tsx
const view = isoView({ origin: [540, 800], unit: 105 });   // where world (0,0,0) lands, px per unit
<IsoScene view={view}>
  <IsoLink path={isoRoute([4.6, 5], [3.3, 4.6])} draw={tween({ at: 10, dur: 12 })} packets={[{ at: tween({ at: 14, dur: 24 }) }]} />
  <Laptop x={4.4} y={4.6} rise={tween({ at: 4, dur: 10 })} open={spring({ at: 6, fps, ...springs.smooth })} />
  <Server x={4.2} y={1.4} rise={spring({ at: 8, fps, ...springs.bouncy })} />
  <Database x={6.4} y={3.4} />
</IsoScene>
// HTML labels: const [sx, sy] = project(view, [x, y, z])
```

- **Axes:** x runs right-down, y left-down and z up.
- **Faces** shade from `view.light`, so tops come out lighter.
- **Depth:** objects sort by x + y. Floor pieces (`Platform`) always draw under objects.
- **Objects:** `Server`, `Database`, `Cloud`, `Laptop`, `Phone`, `Router`, `Gpu`, `IsoPerson` and
  `Platform`, with entrances and colours from `isoColors`. `rise` grows an object up out of the floor
  (on `Laptop` it only fades in; open its lid with `open`), and `lift` moves it vertically.
- **Links:** packets leave a trail whose length follows their speed. Time the packet's `at` tween so
  it *arrives* on the narrator's anchor word.
- **Your own objects:** build them from `IsoBox`, `IsoCylinder` and `IsoSphere`. Put details on faces
  with `faceRect(box, 'left' | 'right' | 'top', u0, v0, u1, v1)`.

## Character rig

```tsx
const perf = performance([{ at: 0, pose: 'idle' }, { at: 20, pose: 'wave' }, { at: 90, pose: 'present' }], fps);
const pose = withGestures(perf.pose, gestures.wave({ from: 26, to: 86 }));
<Character pose={pose} face={perf.face} look={characterLooks.dev} size={640} x={() => 540} y={() => 1440}
  talk={VO.mouth} viseme={VO.viseme} />
```

- **Poses:** `idle`, `wave`, `point`, `think`, `type`, `shrug`, `cheer`, `present`, or your own `Pose`.
  Angles are outward-positive, so poses mirror cleanly. Poses move on springs.
- **Follow-through:** elbows, knees and the head trail behind each move automatically.
- **Gestures:** `wave`, `typing`, `walk` and `nod` add on top of the pose.
- **Life:** it blinks on a seeded schedule and breathes.
- **Lip-sync:** `talk` is mouth openness (0–1) and `viseme` the mouth shape, both straight from the
  voice track: closed on m/b/p, round on o, wide on e.
- **Looks:** generic looks with different hair styles and glasses (`characterLooks`). No real people.

## Stick figure and space

```tsx
<Starfield count={260} drift={[0, 0.4]} zoom={tween({ at: 0, dur: 300, from: 1, to: 1.2 })} />
<BlackHole cx={540} cy={760} r={150} disk={tween({ at: 20, dur: 40 })} tilt={0.16} />
<Stick pose={perf.pose} x={() => 540} y={() => 1200} size={260} color="#3BA8FF" helmet backpack
  stretch={tween({ at: 120, dur: 60, from: 1, to: 3 })} glow={0.6} />
```

- **`Starfield`:** seeded stars in three depth layers. Near ones are bigger, brighter and drift faster.
- **`Nebula`:** a soft band of coloured haze. **`PlanetRim`:** the lit edge of a planet.
- **`BlackHole`:** the shadow, a thin photon ring and an optional accretion disk lensed over the top
  (`disk` brightness, `tilt`, `spin`, `orbits`).
- **`Stick`:** a stick-figure astronaut on the character pose rig, so the same poses, gestures and
  springs work. It takes `stretch` (spaghettification), `tumble`, an animatable `color` (a red-shift)
  and a `glow`.

The `bh-fall` example is a 40 s explainer built from these.

## Style packs

Wrap a scene in `<Look pack="film" | "print" | "duotone">` (`flat`, the default, leaves it as
drawn), or put `<Outline>` around objects for a sticker look.
- `film`: a soft vignette and grain. The grain is re-seeded every frame, so it boils like film.
- `print`: halftone dots, paper fibre and light grain.
- `duotone`: two-colour mapping (`duotone={[dark, light]}`) plus grain.

Halftone and Duotone recolour what's under them, so the scene needs an opaque background. The outline
skips soft shadows (alpha under 50%).

The `kit-iso`, `kit-characters` and `kit-looks` examples are boards, and `kit-reel-world` is a
short explainer using all of it.
