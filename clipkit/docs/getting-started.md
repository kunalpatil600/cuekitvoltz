# Getting started

This walks you from an empty Remotion project to a checked, rendered video built with cuekitvoltz.

## 1. Install

You need Node 20.11+, and a Remotion project on 4.0.535 or newer with React 19. To start one:

```bash
npx create-video@latest my-video && cd my-video
npm i cuekitvoltz @remotion/three @remotion/google-fonts @remotion/paths @remotion/shapes three @react-three/fiber
npm i -D @types/three
```

Until the first npm release, install the kit from GitHub instead: `npm i github:<owner>/cuekitvoltz`.

Optional extras:
- `lucide`, for `Icon3D` (it takes Lucide's icon nodes).
- ffmpeg on the PATH, for loudness-normalised renders and contact sheets.
- Python 3.11 or [uv](https://docs.astral.sh/uv/), for the voice director ([voice.md](voice.md)).

Then run the setup from the project's root:

```bash
npx cuekitvoltz init
```

It asks four things, each with a suggestion:
1. **A colour theme:** pick a suggested palette or enter your own colours. Fonts, 3D light, iso
   colours and captions are derived from it ([themes.md](themes.md)).
2. **Downloads:** it shows what it needs and how big it is (render browsers, voice models), and
   downloads only what you say yes to.
3. **A default voice:** with short samples to listen to first.
4. **A starter video:** a short on your theme and voice, registered in your Root as `starter`.

Everything lands in `cuekitvoltz.config.json` and `cuekitvoltz/`. Run it again any time, or use the
individual commands (`theme`, `download`, `config`, `starter`).

## 2. Wrap the video in `<Stage>`

`<Stage>` is the root of every kit video. It sets the theme and background, knows the platform's
safe area (Shorts and Reels, or 16:9), and switches on layout QA when you check stills with `--qa`.

```tsx
import { Stage } from 'cuekitvoltz';
import { theme } from '../cuekitvoltz/theme';   // the active theme from setup (path from your file)

export const MyVideo: React.FC = () => (
  <Stage theme={theme}>
    {/* scenes */}
  </Stage>
);
```

## 3. Animate with motions

A `Motion` is a function from frame to value. Springs, tweens and keyframes are all motions, and
they add up:

```tsx
import { useVideoConfig } from 'remotion';
import { Move, add, constant, ease, spring, springs, tween, windup } from 'cuekitvoltz';

const { fps } = useVideoConfig();
const x = spring({ at: 10, fps, from: 1200, to: 90, ...springs.snappy });
// sits at 600, winds up by 24 px at frame 90, then leaves upwards
const y = add(constant(600), windup({ at: 90, by: 24 }), tween({ at: 90, dur: 12, to: -1700, ease: ease.in }));

<Move x={x} y={y} stretch={0.0008}>
  <Card />
</Move>
```

`Move` reads the speed from the motions: it blurs along the direction of travel and stretches a
little while the card is fast, then settles sharp. That alone is most of the "studio" look. See
[motion.md](motion.md).

## 4. Cut between scenes

```tsx
import { Cut, Scene, Scenes, scenesLength, whip, zoomThrough } from 'cuekitvoltz';

export const LENGTH = scenesLength([90, 120, 90], [18, 16]);   // the composition's durationInFrames

<Scenes>
  <Scene duration={90}><Hook /></Scene>
  <Cut duration={18} kind={zoomThrough({ box: { x: 380, y: 820, w: 320, h: 120 } })} />
  <Scene duration={120}><Explain /></Scene>
  <Cut duration={16} kind={whip({ dir: 'left' })} />
  <Scene duration={90}><Outro /></Scene>
</Scenes>
```

Every scene paints its own background. See [transitions.md](transitions.md).

## 5. Check stills, then render

```bash
npx cuekitvoltz stills my-video 30 120 240 --sheet   # renders/_stills/my-video/ + sheet.jpg
npx cuekitvoltz stills my-video 120 240 --qa         # boxes over layout problems, exit 1 if any
npx cuekitvoltz render my-video                      # renders/my-video/my-video.mp4 at -14 LUFS
```

Look at the stills before rendering the whole thing: it costs seconds and catches most mistakes.
For heavy 3D, add `--gpu` ([rendering.md](rendering.md)).

## 6. Optional: a voice-over that drives the timing

Write `src/my-video/script.vo.md`:

```
---
voice: cb-heart
---
# hook
[surprised] You press @enter *Enter*. (pause 0.25) What actually happens?
# lookup
[narration] First, your laptop asks a @dns DNS server where the site lives.
```

```bash
npx cuekitvoltz download voice chatterbox            # once, if setup didn't
npx cuekitvoltz direct src/my-video/script.vo.md     # -> public/voice/my-video.wav + src/my-video/vo.json
```

```tsx
import vo from './vo.json';
const VO = voiceTrack(vo, 30);            // durationInFrames = VO.frames
VO.at('lookup')                           // the frame the "lookup" section starts
VO.at('enter')                            // the frame the narrator says "Enter"
<Audio src={staticFile(VO.data.audio)} />
<Captions track={VO} y={1330} accent="#c8792c" />
```

See [voice.md](voice.md).

## 7. Optional: let Claude Code drive

Install the skills (`/plugin marketplace add <owner>/cuekitvoltz`, then
`/plugin install cuekitvoltz@cuekitvoltz`, or `npx cuekitvoltz skills`). Then describe the video you
want. In a project that isn't set up yet, Claude runs the setup questions first. See
[skills.md](skills.md).
