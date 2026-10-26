# cuekitvoltz API cheat sheet

Everything is exported from the package root: `import { … } from 'cuekitvoltz'`.

## Motion core

```ts
spring({ at, fps, from = 0, to = 1, duration, bounce, velocity }) // or ...springs.snappy
springs: snappy | smooth | gentle | bouncy | wobbly | heavy | pop
tween({ at, dur, from = 0, to = 1, ease })      ease.out | in | inOut | expoOut | backOut …
keys([[frame, value, ease?], …], ease?)          add(a, b, …)   delay(m, n)   constant(v)
windup({ at, by, frames?, release? })  // an offset motion: add() it to a position
follow(m, { fps, duration, bounce })   stagger(i, n, { each, from?, ease? })
velocity(m, frame)   sample(m, from, to)
```

## Moving things

```tsx
<Move x={spring(...)} y={constant(320)} opacity={tween(...)} scale={…} rotate={…} stretch={0.002} shutter={0.5}>…</Move>
<MotionBlur samples={8} shutter={0.5} active={(f) => f > 10 && f < 40}>…</MotionBlur>
<Split text="Headline" unit={(i, n) => ({ y, opacity, weight, scale, rotate, style })} />   // per glyph
```

## Scenes and transitions

```tsx
<Scenes>
  <Scene duration={90}>…</Scene>
  <Cut duration={18} kind={zoomThrough({ box, blur: 12 })} />
  <Scene duration={120}>…</Scene>
</Scenes>
// composition length: scenesLength([90, 120], [18])
push({ dir, parallax }) whip({ dir }) wipe({ angle, feather }) iris() shape({ path }) blob({ x, y, color })
zoomThrough({ box }) matchZoom({ x, y }) lightLeak() dip() crossfade()
<Shared box={boxTrack([{ at, box }, { at, box, spring }], fps)}>{(b) => …}</Shared>
<Morph paths={[a, b]} at={spring(...)} width={200} height={200} />   shapes.star(...)  blobPoints(...)
```

## Isometric world

```tsx
const view = isoView({ origin: [540, 700], unit: 104 });
<IsoScene view={view}>
  <IsoLink path={[[x, y, z], …]} draw={tween(...)} packets={[{ at: tween(...), color, size }]} />
  <Laptop x y rise open shown color screen glow /> <Server … accent /> <Database /> <Cloud /> <Router /> <Phone /> <Gpu />
  <Platform x y w d />  <IsoBox …/> <IsoCylinder …/> <IsoSphere …/>
</IsoScene>
project(view, [x, y, z]) // → [px, py] for HTML labels
```

## Character

```tsx
const perf = performance([{ at: 0, pose: 'idle' }, { at: 20, pose: 'point', face: { mouth: 'grin' } }], fps);
const pose = withGestures(perf.pose, gestures.wave({ from, to }), gestures.typing({ from, to }), gestures.nod({ at }));
<Character pose={pose} face={perf.face} look={characterLooks.dev} size={620} x={() => 540} y={() => 1450}
  talk={VO.mouth} viseme={VO.viseme} gaze={…} />
// poses: idle wave point think type shrug cheer present · looks: dev designer founder student ops
```

## Voice sync

```ts
import vo from './vo.json';            // written by npx cuekitvoltz direct
const VO = voiceTrack(vo, 30);
VO.frames  VO.at('section' | 'anchor')  VO.word('Enter', nth)  VO.mouth  VO.viseme  VO.lineAt(f)
<Captions track={VO} y={1330} size={58} color active accent mode="pop" | "karaoke" hidden={(f) => …} />
<Audio src={staticFile(VO.data.audio)} />
```

## 3D

```tsx
const cam = handheld(orbit({ target: [0, 1, 0], az, el, dist, fov, focus }), { amount: 0.5 });
<Scene3D camera={cam} studio="warm" | "ember" | "product" | "spectrum" | "sunset" | "noir" | "clay"
  background={{ top, bottom, glow, glowAt, glowSize }} | '#hex' | 'transparent'
  blur={{ samples: 8, shutter: 0.5 }} floor={0} shadow={0.5}
  post={{ bloom: { strength, radius, threshold }, dof: { aperture, focus, maxBlur }, aberration, vignette, exposure }}>
  <Anim position={[x, spring(...), z]} rotation={[0, (f) => f * 2, 0]} scale={…}>…</Anim>
  <Icon3D icon={Zap} size={1} stroke={2.2} draw={tween(...)} material={materials.neon('#A31C1B', 5)} />
  <Text3D font={staticFile('fonts/Geist-ExtraBold.ttf')} text={[{ text: 'cue' }, { text: 'kit', font: serif, material }]}
    size={1} depth={0.3} bevel={0.02} glyph={(i, n) => ({ position, rotation, scale, visible })} />
  <Extrude3D d={svgPath} size={1} depth={0.2} />
  <Laptop3D rig={mac} finish="silver" | "space" | "midnight" | "sky" | materialParams screen glow />
  <Phone3D rig={phone} finish=… />
</Scene3D>
const mac = laptopRig({ position, rotation, scale, open: spring(...), angle: 110 });
const phone = phoneRig({ position, rotation });
<ScreenOverlay camera={cam} quad={mac.screen} width={1280} height={800} radius={14} dof={dof} occluders={[phone.outline]}>…React…</ScreenOverlay>
<Pin3D camera={cam} at={[x, y, z]}>label</Pin3D>
materials.clay | plastic | glossy | rubber | ceramic | metal | anodized | chrome | gold | iridescent | glass | frosted | neon
orbit · lookAt · dollyZoom · handheld · mixRigs · projectPoint
```

## Look and QA

```tsx
<Stage background="#000">…</Stage>        // root: theme, safe areas; layout QA with input props { qa: true } (`npx cuekitvoltz stills --qa`)
<Look pack="flat" | "film" | "print" | "duotone">…</Look>   <Outline width color>…</Outline>
data-qa-allow="unsafe overlap small clipped"   data-qa-ignore
```
