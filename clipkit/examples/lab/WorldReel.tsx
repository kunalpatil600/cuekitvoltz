import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Atmosphere } from '../shared/Atmosphere';
import type { PaletteKey } from '../shared/Atmosphere';
import { FONT, M, S, rampAt } from '../shared/type';
import {
  Character, Cloud, Cut, Database, IsoLink, IsoScene, Laptop, Look, Move, Router, Scene, Scenes, Server, Split, Stage, characterLooks, constant, gestures,
  isoView, performance, project, scenesLength, spring, springs, stagger, tween, whip, withGestures, zoomThrough,
} from 'cuekitvoltz';
import type { Box, Motion, Pose, Unit, V3 } from 'cuekitvoltz';

// cuekitvoltz visual world in use (shorts): "What happens when you press Enter?"
//   A  a character types and narrates, presses Enter; the camera dives into the key
//   B  an iso network: the request hops router → DNS → API servers → database, the answer comes home
//   C  whip to the payoff
// The whole reel runs through the film look (vignette + grain).
export const WORLD_REEL_SCENES = [100, 170, 80];
export const WORLD_REEL_CUTS = [20, 12];
export const WORLD_REEL_DURATION = scenesLength(WORLD_REEL_SCENES, WORLD_REEL_CUTS);
const KEY: Box = { x: 420, y: 1215, w: 240, h: 110, r: 26 };
const view = isoView({ origin: [540, 800], unit: 105 });

const Bg: React.FC<{ palette: PaletteKey; overscan?: number; children: React.ReactNode }> = ({ palette, overscan = 1, children }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ background: '#000', transform: `scale(${overscan})` }}><Atmosphere palette={palette} /></AbsoluteFill>
    {children}
  </AbsoluteFill>
);

const useRise = () => {
  const { fps } = useVideoConfig();
  return (from: number) => (i: number, n: number): Unit => {
    const at = from + stagger(i, n, { each: 1.1 });
    return { y: spring({ at, fps, from: 60, to: 0, ...springs.snappy }), opacity: tween({ at, dur: 5 }), weight: tween({ at, dur: 16, from: 300, to: 760 }) };
  };
};

const pointUp: Pose = { armL: [8, -8], armR: [148, 6], legL: [3, -2], legR: [3, -2], lean: 2, head: -6, lift: 0, shrug: 0 };

const Press: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = useRise();
  const perf = performance([{ at: 0, pose: 'idle' }, { at: 8, pose: 'type' }, { at: 66, pose: pointUp, face: { eyes: 'open', mouth: 'grin', brows: 0.6 } }], fps);
  const pose = withGestures(perf.pose, gestures.typing({ from: 14, to: 56 }));
  const talk: Motion = (f) => (f > 18 && f < 54 ? Math.max(0, Math.sin(f * 0.85) * Math.sin(f * 0.31 + 1)) : 0);
  const press = tween({ at: 58, dur: 3 })(frame) - tween({ at: 62, dur: 5 })(frame);
  const ring = tween({ at: 60, dur: 16 })(frame);
  return (
    <Bg palette="indigo">
      <div style={{ position: 'absolute', left: 90, top: 250, ...M(30, 500, { color: '#C9C7D6', letterSpacing: '0.14em' }) }}>How the web works · 01</div>
      <div style={{ position: 'absolute', left: 90, top: 320, ...S(108, 760) }}><Split text="What happens" unit={rise(4)} /></div>
      <div style={{ position: 'absolute', left: 90, top: 432, ...S(108, 760) }}><Split text="when you press" unit={rise(12)} /></div>
      <div style={{ position: 'absolute', left: 90, top: 544, ...S(108, 760) }}>
        <Split text="Enter?" unit={(i, n) => ({ ...rise(20)(i, n), weight: undefined, style: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: '1.14em', color: rampAt('spectrum', i / 5) } })} />
      </div>
      <Character pose={pose} face={perf.face} look={characterLooks.dev} size={640} x={() => 540} y={() => 1440} talk={talk} seed="press" />
      <div style={{
        position: 'absolute', left: KEY.x + KEY.w / 2 - 170 * ring, top: KEY.y + KEY.h / 2 - 170 * ring, width: 340 * ring, height: 340 * ring, borderRadius: '50%',
        border: `${6 * (1 - ring)}px solid #5AC8FA`, opacity: ring > 0 && ring < 1 ? 1 - ring : 0,
      }} />
      <div style={{
        position: 'absolute', left: KEY.x, top: KEY.y + press * 10, width: KEY.w, height: KEY.h, borderRadius: KEY.r, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #F5F5F7, #C9CCD8)', boxShadow: `0 ${14 - press * 10}px 0 #8E91A3, 0 ${30 - press * 16}px 40px rgba(0,0,0,0.45)`,
        transform: `scale(${spring({ at: 40, fps, from: 0.4, to: 1, ...springs.pop })(frame)})`, opacity: tween({ at: 40, dur: 5 })(frame),
      }}>
        <span style={{ ...M(40, 600, { color: '#1B1B24', letterSpacing: '0.08em' }) }}>Enter</span>
      </div>
    </Bg>
  );
};

const HOPS: { at: number; label: string; anchor: V3; color: string }[] = [
  { at: 38, label: 'Wi-Fi router', anchor: [2.75, 4.6, 0.3], color: '#5AC8FA' },
  { at: 64, label: 'DNS lookup', anchor: [1.9, 2.5, 2.0], color: '#5AC8FA' },
  { at: 90, label: 'TLS + API server', anchor: [4.7, 1.9, 2.3], color: '#7D7AFF' },
  { at: 116, label: 'database query', anchor: [7.0, 4.0, 1.2], color: '#7D7AFF' },
  { at: 152, label: '200 OK, back home', anchor: [5.15, 5.1, 0.5], color: '#34D399' },
];

const Network: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = (i: number): Motion => spring({ at: 4 + i * 4, fps, ...springs.bouncy });
  const hop = (at: number, dur = 24) => tween({ at, dur, ease: (t) => t });
  return (
    <Bg palette="navy" overscan={2.6}>
      <div style={{ position: 'absolute', left: 90, top: 250, ...M(30, 500, { color: '#C9C7D6', letterSpacing: '0.14em' }) }}>One request, four hops</div>
      {/* the trace: one line per hop as the packet reaches it */}
      {HOPS.map((h, i) => (
        <Move key={h.label} x={spring({ at: h.at, fps, from: 60, to: 90, ...springs.snappy })} y={constant(320 + i * 66)} opacity={tween({ at: h.at, dur: 6 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: h.color, boxShadow: `0 0 16px ${h.color}` }} />
            <div style={{ ...M(34, 500, { color: '#F5F5F7', letterSpacing: '0.02em', textTransform: 'none' }) }}>
              <span style={{ color: h.color }}>{i < 4 ? `${i + 1} ` : ''}</span>{h.label}
            </div>
          </div>
        </Move>
      ))}
      <IsoScene view={view}>
        <IsoLink path={[[4.6, 5.0, 0], [3.3, 5.0, 0], [3.3, 4.6, 0]]} draw={tween({ at: 10, dur: 12 })} packets={[{ at: hop(14) }]} />
        <IsoLink path={[[2.6, 4.2, 0], [2.6, 3.0, 0], [2.0, 3.0, 0]]} draw={tween({ at: 14, dur: 12 })} packets={[{ at: hop(40) }]} />
        <IsoLink path={[[2.6, 2.4, 0], [4.2, 2.4, 0], [4.2, 2.2, 0]]} color="#7D7AFF" draw={tween({ at: 18, dur: 12 })} packets={[{ at: hop(66), color: '#7D7AFF' }]} />
        <IsoLink path={[[6.0, 2.4, 0], [6.6, 2.4, 0], [6.6, 3.4, 0]]} color="#7D7AFF" draw={tween({ at: 22, dur: 12 })} packets={[{ at: hop(92), color: '#7D7AFF' }]} />
        <IsoLink path={[[6.4, 4.4, 0], [6.4, 5.6, 0], [5.9, 5.6, 0]]} color="#34D399" draw={tween({ at: 26, dur: 12 })} packets={[{ at: hop(126, 26), color: '#34D399', size: 12 }]} />
        <Laptop x={4.4} y={4.6} rise={rise(0)} open={spring({ at: 6, fps, ...springs.bouncy })} shown={tween({ at: 140, dur: 20 })} glow="#34D399" />
        <Router x={2.2} y={4.2} rise={rise(1)} />
        <Cloud x={1.0} y={1.6} z={1.8} rise={rise(2)} />
        <Server x={4.2} y={1.4} rise={rise(3)} seed="r1" accent={frame > 92 && frame < 120 ? '#7D7AFF' : '#5AC8FA'} />
        <Server x={5.4} y={1.4} rise={rise(4)} seed="r2" />
        <Database x={6.4} y={3.4} rise={rise(5)} />
      </IsoScene>
      {/* a pulse on each object as the packet lands */}
      {HOPS.map((h) => {
        const [sx, sy] = project(view, h.anchor);
        const p = tween({ at: h.at - 2, dur: 18 })(frame);
        if (p <= 0 || p >= 1) return null;
        return <div key={h.label} style={{ position: 'absolute', left: sx - 110 * p, top: sy - 64 * p, width: 220 * p, height: 128 * p, borderRadius: '50%', border: `${5 * (1 - p)}px solid ${h.color}`, opacity: 1 - p }} />;
      })}
    </Bg>
  );
};

const Payoff: React.FC = () => {
  const { fps } = useVideoConfig();
  const rise = useRise();
  const perf = performance([{ at: 0, pose: 'idle' }, { at: 6, pose: 'cheer' }], fps);
  return (
    <Bg palette="violet">
      <div style={{ position: 'absolute', left: 90, top: 320, ...S(150, 800) }}><Split text="~120 ms." unit={rise(8)} /></div>
      <div style={{ position: 'absolute', left: 90, top: 500, ...S(72, 700, { color: '#C9C7D6' }) }}><Split text="Four hops, one blink." unit={rise(16)} /></div>
      <div style={{ position: 'absolute', left: 90, top: 610, ...M(30, 500, { color: '#C9C7D6', letterSpacing: '0.14em' }) }}>Built with cuekitvoltz</div>
      <Character pose={perf.pose} face={perf.face} look={characterLooks.dev} size={640} x={() => 540} y={() => 1440} seed="payoff" />
    </Bg>
  );
};

export const WorldReel: React.FC = () => (
  <Stage background="#000">
    <Look pack="film">
      <Scenes>
        <Scene duration={WORLD_REEL_SCENES[0]} name="press"><Press /></Scene>
        <Cut duration={WORLD_REEL_CUTS[0]} kind={zoomThrough({ box: KEY, blur: 12 })} />
        <Scene duration={WORLD_REEL_SCENES[1]} name="network"><Network /></Scene>
        <Cut duration={WORLD_REEL_CUTS[1]} kind={whip({ dir: 'up' })} />
        <Scene duration={WORLD_REEL_SCENES[2]} name="payoff"><Payoff /></Scene>
      </Scenes>
    </Look>
  </Stage>
);
