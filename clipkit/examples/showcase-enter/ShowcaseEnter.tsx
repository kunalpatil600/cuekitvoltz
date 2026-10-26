import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Sfx } from '../shared/Sfx';
import { FONT, M, S } from '../shared/type';
import {
  Captions, Character, Cloud, Cut, Database, IsoLink, IsoScene, Laptop, Look, Move, Router, Scene, Scenes, Server, Split, Stage, characterLooks, constant, gestures,
  isoView, performance, project, spring, springs, stagger, tween, voiceTrack, whip, withGestures, zoomThrough,
} from 'cuekitvoltz';
import type { Box, CharacterLook, Motion, Pose, Unit, V3 } from 'cuekitvoltz';
import vo from './vo.json';

// cuekitvoltz showcase (shorts, warm palette): "What happens when you press Enter?", built TTS-first.
// The voice director (voice/direct.py, script.vo.md) decides the timeline: scenes cut on its sections,
// packets land on its anchors, the host lip-syncs to it and the captions follow every word.
const P = { brown: '#5B4632', sand: '#F4D9A0', copper: '#C8792C', ink: '#1C150F', deep: '#120D09', dim: '#C9B48E' };
const FPS = 30;
export const VO = voiceTrack(vo, FPS);
const CUT_A = 18;
const CUT_B = 12;
const A = Math.round(VO.at('lookup') + CUT_A / 2);
const START_B = A - CUT_A;
const B = Math.round(VO.at('payoff') + CUT_B / 2) - START_B;
const START_C = START_B + B - CUT_B;
const C = VO.frames - START_C;
export const ENTER_DURATION = VO.frames;
const KEY: Box = { x: 410, y: 690, w: 260, h: 116, r: 28 };

const host: CharacterLook = { ...characterLooks.dev, shirt: P.copper, pants: P.brown, shoes: P.sand, hair: '#2A1F15' };

const WarmBg: React.FC<{ overscan?: number; children?: React.ReactNode }> = ({ overscan = 1, children }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ transform: `scale(${overscan})`, background: `radial-gradient(120% 70% at 50% 28%, #80644A 0%, ${P.brown} 42%, #251B12 100%)` }} />
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
const serifUnit = (rise: (i: number, n: number) => Unit) => (i: number, n: number): Unit => ({
  ...rise(i, n), weight: undefined, style: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: '1.14em', color: P.copper },
});

const pointUp: Pose = { armL: [8, -8], armR: [148, 6], legL: [3, -2], legR: [3, -2], lean: 2, head: -6, lift: 0, shrug: 0 };

// ---------------------------------------------------------------- A: the hook, spoken by the host
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = useRise();
  const enter = VO.word('Enter');
  const what = VO.word('What');
  const perf = performance([
    { at: 0, pose: 'idle' }, { at: 4, pose: 'type' }, { at: enter - 6, pose: pointUp, face: { eyes: 'open', mouth: 'grin', brows: 0.6 } },
    { at: what - 2, pose: 'shrug' },
  ], fps);
  const pose = withGestures(perf.pose, gestures.typing({ from: 6, to: enter - 8 }));
  const press = tween({ at: enter, dur: 3 })(frame) - tween({ at: enter + 4, dur: 5 })(frame);
  const ring = tween({ at: enter + 2, dur: 16 })(frame);
  return (
    <WarmBg>
      <div style={{ position: 'absolute', left: 90, top: 250, ...M(30, 500, { color: P.dim, letterSpacing: '0.14em' }) }}>How the web works · 01</div>
      <div style={{ position: 'absolute', left: 90, top: 318, ...S(112, 760, { color: P.sand }) }}><Split text="You press" unit={rise(VO.word('You') - 2)} /></div>
      <div style={{ position: 'absolute', left: 90, top: 440, ...S(112, 760) }}><Split text="Enter." unit={serifUnit(rise(enter - 3))} /></div>
      <div style={{ position: 'absolute', left: 90, top: 600, ...S(56, 600, { color: P.dim }) }}><Split text="What actually happens?" unit={rise(what - 1)} /></div>
      <Character pose={pose} face={perf.face} look={host} size={620} x={() => 540} y={() => 1450} talk={VO.mouth} viseme={VO.viseme} seed="host" />
      <div style={{
        position: 'absolute', left: KEY.x + KEY.w / 2 - 180 * ring, top: KEY.y + KEY.h / 2 - 180 * ring, width: 360 * ring, height: 360 * ring, borderRadius: '50%',
        border: `${6 * (1 - ring)}px solid ${P.copper}`, opacity: ring > 0 && ring < 1 ? 1 - ring : 0,
      }} />
      <div style={{
        position: 'absolute', left: KEY.x, top: KEY.y + press * 10, width: KEY.w, height: KEY.h, borderRadius: KEY.r, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(180deg, #FFF3DA, ${P.sand})`, boxShadow: `0 ${14 - press * 10}px 0 #A8865A, 0 ${30 - press * 16}px 40px rgba(0,0,0,0.45)`,
        transform: `scale(${spring({ at: enter - 10, fps, from: 0.4, to: 1, ...springs.pop })(frame)})`, opacity: tween({ at: enter - 10, dur: 5 })(frame),
      }}>
        <span style={{ ...M(42, 600, { color: P.ink, letterSpacing: '0.08em' }) }}>Enter</span>
      </div>
    </WarmBg>
  );
};

// ---------------------------------------------------------------- B: the trip, on the voice's anchors
const view = isoView({ origin: [540, 700], unit: 104 });
const rel = (name: string) => VO.at(name) - START_B;
const HOPS: { at: string; label: string; anchor: V3; color: string }[] = [
  { at: 'dns', label: 'DNS lookup', anchor: [1.9, 2.5, 2.0], color: P.sand },
  { at: 'router', label: 'Wi-Fi router', anchor: [2.75, 4.6, 0.3], color: P.sand },
  { at: 'server', label: 'API server', anchor: [4.7, 1.9, 2.3], color: P.copper },
  { at: 'db', label: 'database query', anchor: [7.0, 4.0, 1.2], color: P.copper },
  { at: 'home', label: '200 OK, back home', anchor: [5.15, 5.1, 0.5], color: '#FFE2A8' },
];

const Network: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = (i: number): Motion => spring({ at: 2 + i * 3, fps, ...springs.bouncy });
  // a packet that arrives on the anchor's word
  const arrive = (name: string, dur = 20) => tween({ at: rel(name) - dur + 4, dur, ease: (t) => t });
  return (
    <WarmBg overscan={2.6}>
      <div style={{ position: 'absolute', left: 90, top: 250, ...M(30, 500, { color: P.dim, letterSpacing: '0.14em' }) }}>One request, four hops</div>
      {HOPS.map((h, i) => (
        <Move key={h.label} x={spring({ at: rel(h.at), fps, from: 60, to: 90, ...springs.snappy })} y={constant(318 + i * 64)} opacity={tween({ at: rel(h.at), dur: 6 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: h.color, boxShadow: `0 0 16px ${h.color}` }} />
            <div style={{ ...M(34, 500, { color: P.sand, letterSpacing: '0.02em', textTransform: 'none' }) }}>
              <span style={{ color: h.color }}>{i < 4 ? `${i + 1} ` : ''}</span>{h.label}
            </div>
          </div>
        </Move>
      ))}
      <IsoScene view={view}>
        <IsoLink path={[[4.6, 5.0, 0], [3.3, 5.0, 0], [3.3, 4.2, 0], [2.0, 4.2, 0], [2.0, 3.0, 0]]} color={P.sand} draw={tween({ at: 6, dur: 12 })} packets={[{ at: arrive('dns', 24), color: P.sand }]} />
        <IsoLink path={[[4.6, 5.0, 0], [3.3, 5.0, 0], [3.3, 4.6, 0]]} color={P.sand} draw={tween({ at: 8, dur: 12 })} packets={[{ at: arrive('router'), color: P.sand }]} />
        <IsoLink path={[[2.6, 4.2, 0], [2.6, 2.4, 0], [4.2, 2.4, 0], [4.2, 2.2, 0]]} color={P.copper} draw={tween({ at: 10, dur: 12 })} packets={[{ at: arrive('server', 22), color: P.copper }]} />
        <IsoLink path={[[6.0, 2.4, 0], [6.6, 2.4, 0], [6.6, 3.4, 0]]} color={P.copper} draw={tween({ at: 12, dur: 12 })} packets={[{ at: arrive('db', 16), color: P.copper }]} />
        <IsoLink
          path={[[6.4, 4.4, 0], [6.4, 5.6, 0], [5.9, 5.6, 0]]} color="#FFE2A8" draw={tween({ at: 14, dur: 12 })}
          packets={[{ at: tween({ at: rel('home') - 6, dur: VO.word('appears') - VO.at('home') + 6, ease: (t) => t }), color: '#FFE2A8', size: 12 }]}
        />
        <Laptop x={4.4} y={4.6} rise={rise(0)} open={spring({ at: 4, fps, ...springs.bouncy })} color="#E9DCC0" screen={P.ink} glow={P.copper} shown={tween({ at: VO.word('appears') - START_B, dur: 16 })} />
        <Router x={2.2} y={4.2} rise={rise(1)} color={P.brown} led={P.copper} />
        <Cloud x={1.0} y={1.6} z={1.8} rise={rise(2)} color={P.sand} />
        <Server x={4.2} y={1.4} rise={rise(3)} seed="r1" color="#3A2C1F" accent={frame > rel('server') - 2 && frame < rel('db') ? '#FFE2A8' : P.copper} />
        <Server x={5.4} y={1.4} rise={rise(4)} seed="r2" color="#3A2C1F" accent={P.copper} />
        <Database x={6.4} y={3.4} rise={rise(5)} color={P.copper} glow={P.sand} />
      </IsoScene>
      {HOPS.map((h) => {
        const [sx, sy] = project(view, h.anchor);
        const p = tween({ at: rel(h.at) - 2, dur: 18 })(frame);
        if (p <= 0 || p >= 1) return null;
        return <div key={h.label} style={{ position: 'absolute', left: sx - 110 * p, top: sy - 64 * p, width: 220 * p, height: 128 * p, borderRadius: '50%', border: `${5 * (1 - p)}px solid ${h.color}`, opacity: 1 - p }} />;
      })}
    </WarmBg>
  );
};

// ---------------------------------------------------------------- C: the payoff, back with the host
const Payoff: React.FC = () => {
  const { fps } = useVideoConfig();
  const rise = useRise();
  const r = (f: number) => f - START_C;
  const perf = performance([{ at: 0, pose: 'idle' }, { at: 4, pose: 'present' }, { at: r(VO.word('Faster')) - 4, pose: 'cheer' }], fps);
  const mouth: Motion = (f) => VO.mouth(f + START_C);
  const viseme = (f: number) => VO.viseme(f + START_C);
  return (
    <WarmBg>
      <div style={{ position: 'absolute', left: 90, top: 250, ...M(30, 500, { color: P.dim, letterSpacing: '0.14em' }) }}>Built with cuekitvoltz</div>
      <div style={{ position: 'absolute', left: 90, top: 312, ...S(150, 800, { color: P.sand }) }}><Split text="~120 ms." unit={rise(r(VO.word('About')))} /></div>
      <div style={{ position: 'absolute', left: 90, top: 500, ...S(72, 700) }}><Split text="Faster than a blink." unit={serifUnit(rise(r(VO.word('Faster'))))} /></div>
      <Character pose={perf.pose} face={perf.face} look={host} size={620} x={() => 540} y={() => 1450} talk={mouth} viseme={viseme} seed="host-c" />
    </WarmBg>
  );
};

export const ShowcaseEnter: React.FC<{ music?: boolean }> = ({ music = true }) => {
  return (
    <Stage background={P.deep}>
      <Look pack="film">
        <Scenes>
          <Scene duration={A} name="hook"><Hook /></Scene>
          <Cut duration={CUT_A} kind={zoomThrough({ box: KEY, blur: 12 })} />
          <Scene duration={B} name="network"><Network /></Scene>
          <Cut duration={CUT_B} kind={whip({ dir: 'up' })} />
          <Scene duration={C} name="payoff"><Payoff /></Scene>
        </Scenes>
      </Look>
      {/* one caption line for the whole video: over the host's legs in A and C, under the network in B */}
      <Captions track={VO} y={1340} size={58} color={P.sand} active="#FFFFFF" accent={P.copper} outline="rgba(18,13,9,0.85)" />
      <Audio src={staticFile(VO.data.audio)} />
      {music && <Audio src={staticFile('music/lofi-01.mp3')} volume={VO.duck(0.1, 0.035)} />}
      <Sfx at={VO.word('Enter') - 1} name="click-soft" volume={0.4} />
      <Sfx at={START_B - 4} name="whoosh" volume={0.3} />
      <Sfx at={START_C - 4} name="whoosh" volume={0.3} />
    </Stage>
  );
};
