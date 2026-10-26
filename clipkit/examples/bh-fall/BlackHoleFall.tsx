import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Sfx } from '../shared/Sfx';
import {
  BlackHole, Captions, Cut, Look, Nebula, PlanetRim, Scene, Scenes, Stage, Starfield, Stick, crossfade, dip, ease, kitFonts, mixColor, performance, spring, springs, tween, voiceScenes,
  voiceTrack, zoomThrough,
} from 'cuekitvoltz';
import type { Box, Motion, Pose } from 'cuekitvoltz';
import vo from './vo.json';

// "What if you fell into a black hole?" (shorts, ~40 s): a stick-figure astronaut on deep-space black,
// thin wide-tracked type, rim-lit planets, a lensed accretion disk. Built TTS-first: the voice
// director's sections cut the scenes and its anchors land every beat.
const C = { space: '#020306', blue: '#0092FF', red: '#E23B2E', green: '#2BB673', text: '#EEF2F8', dim: '#9AA4B4', pack: '#CCD5E1' };
const FPS = 30;
export const VO = voiceTrack(vo, FPS);
export const BH_DURATION = VO.frames;
const SECTIONS = ['hook', 'edge', 'stretch', 'giant', 'watch', 'inside', 'outro'];
const CUTS = [18, 18, 18, 18, 22, 18];
const { scenes: SCENES, starts: STARTS } = voiceScenes(VO, SECTIONS, CUTS);
const rel = (i: number, f: number) => f - STARTS[i];

const float: Pose = { armL: [70, 25], armR: [55, 35], legL: [12, 18], legR: [22, -6], lean: 4, head: -6, lift: 0, shrug: 0 };
const reach: Pose = { armL: [150, 15], armR: [140, 20], legL: [6, 4], legR: [8, 2], lean: 0, head: 8, lift: 0, shrug: 4 };
const flail: Pose = { armL: [165, 35], armR: [120, -30], legL: [20, 30], legR: [4, -20], lean: -6, head: 10, lift: 0, shrug: 6 };

// ---------------------------------------------------------------- type, labels, background
const thin = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  font: `200 ${size}px/1.1 ${kitFonts.sans}`, letterSpacing: '0.32em', textTransform: 'uppercase', color: C.text, ...extra,
});
const hud = (size = 20, extra: React.CSSProperties = {}): React.CSSProperties => ({
  font: `400 ${size}px/1.2 ${kitFonts.mono}`, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.dim, ...extra,
});

/** Thin type that fades in letter by letter. */
const Spaced: React.FC<{ text: string; at: number; size: number; style?: React.CSSProperties; each?: number }> = ({ text, at, size, style, each = 1.2 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...thin(size), ...style }}>
      {Array.from(text).map((ch, i) => (
        <span key={i} style={{ opacity: tween({ at: at + i * each, dur: 10 })(frame), filter: `blur(${(1 - tween({ at: at + i * each, dur: 10 })(frame)) * 6}px)` }}>{ch}</span>
      ))}
    </div>
  );
};

/** A HUD label with a hairline pointer from (x1, y1) to the label at (x2, y2). */
const Callout: React.FC<{ x1: number; y1: number; x2: number; y2: number; at: number; title: string; sub?: string; align?: 'left' | 'right' }> = ({ x1, y1, x2, y2, at, title, sub, align = 'left' }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const draw = tween({ at, dur: 14, ease: ease.out })(frame);
  const show = tween({ at: at + 8, dur: 10 })(frame);
  return (
    <>
      <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx={x1} cy={y1} r={5} fill={C.text} opacity={draw} />
        <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * draw} y2={y1 + (y2 - y1) * draw} stroke={C.text} strokeOpacity={0.6} strokeWidth={1.5} />
      </svg>
      <div style={{ position: 'absolute', left: align === 'left' ? x2 + 14 : undefined, right: align === 'right' ? width - x2 + 14 : undefined, top: y2 - 14, opacity: show, textAlign: align }}>
        <div style={hud(22, { color: C.text, letterSpacing: '0.28em' })}>{title}</div>
        {sub && <div style={hud(18, { marginTop: 8, letterSpacing: '0.12em', textTransform: 'none' })}>{sub}</div>}
      </div>
    </>
  );
};

const Space: React.FC<{ zoom?: Motion; drift?: [number, number]; nebula?: number; seed?: string; children?: React.ReactNode }> = ({ zoom, drift = [-0.25, 0.08], nebula = 0.55, seed = 'bh', children }) => (
  <AbsoluteFill style={{ background: C.space }}>
    {nebula > 0 && <Nebula strength={nebula} seed={seed} />}
    <Starfield seed={seed} drift={drift} zoom={zoom} count={240} />
    {children}
  </AbsoluteFill>
);

// ---------------------------------------------------------------- 1 hook: floating above a planet
const Hook: React.FC = () => {
  const { fps } = useVideoConfig();
  const bh = rel(0, VO.word('black'));
  const perf = performance([{ at: 0, pose: float }, { at: bh + 6, pose: reach }], fps);
  return (
    <Space zoom={tween({ at: 0, dur: SCENES[0], from: 1, to: 1.08 })}>
      <BlackHole cx={810} cy={330} r={tween({ at: bh - 4, dur: 30, from: 0, to: 34, ease: ease.out })} orbits={tween({ at: bh, dur: 20 })} />
      <PlanetRim cx={-120} cy={2700} r={tween({ at: 0, dur: SCENES[0], from: 1660, to: 1700 })} />
      <Stick pose={perf.pose} size={300} x={(f) => 560 + Math.sin(f * 0.03) * 14} y={(f) => 1010 - f * 0.25 + Math.sin(f * 0.05) * 10} tumble={(f) => -12 + Math.sin(f * 0.025) * 10} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center' }}>
        <Spaced text="What if you fell into" at={bh - 10} size={26} style={{ letterSpacing: '0.42em', fontWeight: 300 }} each={0.6} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center' }}>
        <Spaced text="A black hole" at={bh - 2} size={74} style={{ letterSpacing: '0.24em' }} />
      </div>
    </Space>
  );
};

// ---------------------------------------------------------------- 2 horizon: the disk, the line of no return
const Horizon: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hz = rel(1, VO.at('horizon'));
  const light = rel(1, VO.word('light'));
  const fall = tween({ at: 0, dur: SCENES[1], ease: ease.inOut });
  const perf = performance([{ at: 0, pose: reach }, { at: hz + 20, pose: flail }], fps);
  const R = 205;
  return (
    <Space zoom={tween({ at: 0, dur: SCENES[1], from: 1.02, to: 1.12 })} drift={[-0.35, 0.05]} nebula={0.4} seed="bh2">
      <BlackHole cx={540} cy={800} r={(f) => R + tween({ at: 0, dur: SCENES[1], from: 0, to: 30 })(f)} disk={tween({ at: 0, dur: 24 })} />
      {/* light that strays too close curls in */}
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        {[0, 1, 2].map((i) => {
          const p = tween({ at: light - 4 + i * 5, dur: 26, ease: ease.in })(frame);
          if (p <= 0 || p >= 1) return null;
          const a0 = (-150 + i * 22) * (Math.PI / 180);
          const pts = Array.from({ length: 24 }, (_, k) => {
            const u = (k / 23) * p;
            const rr = R * (3.2 - 2.2 * u);
            const a = a0 + u * 2.4;
            return `${540 + Math.cos(a) * rr},${800 + Math.sin(a) * rr}`;
          });
          return <polyline key={i} points={pts.join(' ')} fill="none" stroke="#FFF4DC" strokeOpacity={0.85} strokeWidth={2.5} />;
        })}
      </svg>
      <Stick pose={perf.pose} size={(1 - fall(frame) * 0.45) * 230} x={(f) => 250 + fall(f) * 190} y={(f) => 1330 - fall(f) * 290} tumble={(f) => 20 + f * 0.6} glow={0.3} />
      <Callout x1={540 + R * 0.74} y1={800 - R * 0.74} x2={760} y2={430} at={hz - 2} title="Event horizon" sub="past it, nothing escapes" />
    </Space>
  );
};

// ---------------------------------------------------------------- 3 stretch: tidal pull, spaghettification
const Arrow: React.FC<{ x: number; y: number; len: Motion; label: string; at: number; side: 'left' | 'right' }> = ({ x, y, len, label, at, side }) => {
  const frame = useCurrentFrame();
  const L = len(frame);
  const o = tween({ at, dur: 8 })(frame);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: o }}>
        <line x1={x} y1={y} x2={x} y2={y + L} stroke={C.text} strokeWidth={3} strokeLinecap="round" />
        <path d={`M${x - 12},${y + L - 14} L${x},${y + L + 2} L${x + 12},${y + L - 14}`} fill="none" stroke={C.text} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ position: 'absolute', top: y + 4, left: side === 'right' ? x + 28 : undefined, right: side === 'left' ? 1080 - x + 28 : undefined, opacity: o, ...hud(20, { color: C.text }) }}>{label}</div>
    </>
  );
};

const Stretch: React.FC = () => {
  const { fps } = useVideoConfig();
  const feet = rel(2, VO.word('feet'));
  const head = rel(2, VO.word('head'));
  const sp = rel(2, VO.at('spaghetti'));
  const stretch = (f: number) => 1 + tween({ at: feet - 4, dur: sp - feet + 4, from: 0, to: 0.35 })(f) + tween({ at: sp - 4, dur: 26, from: 0, to: 0.75, ease: ease.inOut })(f);
  const perf = performance([{ at: 0, pose: flail }, { at: 10, pose: reach }], fps);
  return (
    <Space drift={[0, -1.2]} nebula={0.3} seed="bh3">
      <BlackHole cx={540} cy={2240} r={560} disk={0.8} tilt={0.14} />
      <Stick pose={perf.pose} size={420} x={() => 600} y={(f) => 900 + tween({ at: sp, dur: 40, from: 0, to: 80, ease: ease.in })(f)} stretch={stretch} glow={0.25} />
      <Arrow x={330} y={640} len={spring({ at: head, fps, from: 0, to: 70, ...springs.smooth })} label="Pull on head" at={head} side="left" />
      <Arrow x={330} y={1020} len={spring({ at: feet, fps, from: 0, to: 210, ...springs.smooth })} label="Pull on feet" at={feet} side="left" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center' }}>
        <Spaced text="Spaghettification" at={sp - 2} size={52} each={0.8} />
      </div>
    </Space>
  );
};

// ---------------------------------------------------------------- 4 giant: a supermassive edge, crossed calmly
const Giant: React.FC = () => {
  const { fps } = useVideoConfig();
  const mon = rel(3, VO.at('monster'));
  const perf = performance([{ at: 0, pose: reach }, { at: 12, pose: float }], fps);
  const drift = tween({ at: 0, dur: SCENES[3], ease: ease.inOut });
  return (
    <Space drift={[-0.2, 0.04]} nebula={0.6} seed="bh5">
      <BlackHole cx={tween({ at: 0, dur: SCENES[3], from: 1720, to: 1640 })} cy={900} r={980} disk={0} orbits={0.35} />
      <Stick pose={perf.pose} size={240} x={(f) => 330 + drift(f) * 220} y={(f) => 1060 - drift(f) * 120 + Math.sin(f * 0.05) * 10} tumble={(f) => -8 + Math.sin(f * 0.03) * 8} />
      <Callout x1={740} y1={640} x2={420} y2={420} at={mon - 2} title="Sagittarius A*" sub="about 4 million suns" align="right" />
    </Space>
  );
};

// ---------------------------------------------------------------- 5 friend: frozen at the edge
const HOLE_F = { x: 760, y: 1080, r: 250 };
const ZOOM_BOX: Box = { x: HOLE_F.x - HOLE_F.r, y: HOLE_F.y - HOLE_F.r, w: HOLE_F.r * 2, h: HOLE_F.r * 2, r: HOLE_F.r };

const Friend: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fr = rel(4, VO.at('friend'));
  const red = rel(4, VO.at('red'));
  const fz = rel(4, VO.at('freeze'));
  // the astronaut's approach slows towards the edge and stops
  const slow = (f: number) => 1 - Math.exp(-Math.max(0, f) / 38);
  const ax = (f: number) => 300 + slow(f) * 205;
  const ay = (f: number) => 1240 - slow(f) * 120;
  const color: Motion<string> = (f) => mixColor(C.blue, C.red, tween({ at: red - 6, dur: 24 })(f));
  const clock = 2.41 + 6 * slow(frame - 4);
  const perf = performance([{ at: 0, pose: flail }], fps);
  const friend = performance([{ at: 0, pose: 'idle' }, { at: fr + 4, pose: 'point' }], fps);
  return (
    <Space drift={[-0.15, 0]} nebula={0.45} seed="bh4">
      <BlackHole cx={HOLE_F.x} cy={HOLE_F.y} r={HOLE_F.r} orbits={0.8} />
      {/* the friend, far away, and the line of sight */}
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: tween({ at: fr, dur: 12 })(frame) }}>
        <line x1={250} y1={560} x2={ax(frame)} y2={ay(frame) - 40} stroke={C.green} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="4 12" />
      </svg>
      <Stick pose={friend.pose} color={C.green} size={230} x={() => 210} y={() => 540} helmet backpack={false} opacity={tween({ at: fr - 6, dur: 12 })} />
      <div style={{ position: 'absolute', left: 120, top: 700, opacity: tween({ at: fr + 6, dur: 10 })(frame), ...hud(20, { color: C.green }) }}>Your friend</div>
      <Stick pose={perf.pose} color={color} size={170} x={ax} y={ay} tumble={(f) => 30 + 40 * slow(f)} glow={0.6} opacity={(f) => 1 - tween({ at: fz + 10, dur: 40, from: 0, to: 0.55 })(f)} />
      <div style={{ position: 'absolute', left: ax(frame) - 150, top: ay(frame) - 175, width: 300, textAlign: 'center', opacity: tween({ at: fr + 10, dur: 10 })(frame) }}>
        <div style={hud(26, { color: frame > fz ? C.red : C.text, letterSpacing: '0.14em', fontVariantNumeric: 'tabular-nums' })}>{`00:00:${clock.toFixed(2).padStart(5, '0')}`}</div>
        <div style={hud(16, { marginTop: 6, opacity: tween({ at: fz, dur: 10 })(frame) })}>frozen in time</div>
      </div>
    </Space>
  );
};

// ---------------------------------------------------------------- 6 inside: every path leads to the singularity
const Inside: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sg = rel(5, VO.at('singularity'));
  const core = 0.35 + tween({ at: sg - 6, dur: 20 })(frame) * 0.65;
  const fall = tween({ at: 0, dur: SCENES[5], ease: ease.in });
  const perf = performance([{ at: 0, pose: reach }], fps);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <radialGradient id="bh-core" cx="540" cy="820" r="420" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFB4A0" stopOpacity={core} />
            <stop offset="0.08" stopColor={C.red} stopOpacity={0.8 * core} />
            <stop offset="0.45" stopColor="#5A0E08" stopOpacity={0.35 * core} />
            <stop offset="1" stopColor="#000" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={540} cy={820} r={420} fill="url(#bh-core)" />
        {/* rings rushing inward: the tunnel every path follows */}
        {Array.from({ length: 12 }, (_, k) => {
          const u = ((k / 12 + frame * 0.012) % 1);
          const r = 40 + Math.pow(1 - u, 2.2) * 1400;
          return <circle key={k} cx={540} cy={820} r={r} fill="none" stroke="#E8F0FA" strokeOpacity={0.05 + u * 0.22} strokeWidth={1.5} />;
        })}
        {Array.from({ length: 16 }, (_, k) => {
          const a = (k / 16) * Math.PI * 2 + frame * 0.004;
          return <line key={k} x1={540 + Math.cos(a) * 1400} y1={820 + Math.sin(a) * 1400} x2={540 + Math.cos(a) * 60} y2={820 + Math.sin(a) * 60} stroke="#E8F0FA" strokeOpacity={0.05} strokeWidth={1} />;
        })}
      </svg>
      <Stick pose={perf.pose} size={(1 - fall(frame) * 0.7) * 260} x={(f) => 540 + (1 - fall(f)) * 160} y={(f) => 1300 - fall(f) * 420} tumble={(f) => f * 1.4} glow={0.4} opacity={(f) => 1 - tween({ at: SCENES[5] - 30, dur: 30 })(f)} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center' }}>
        <Spaced text="The singularity" at={sg - 2} size={56} each={0.8} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 7 outro: nothing comes back
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const out = rel(6, VO.at('out'));
  return (
    <Space zoom={tween({ at: 0, dur: SCENES[6], from: 1.1, to: 1 })} nebula={0.35} seed="bh6">
      <BlackHole cx={540} cy={820} r={tween({ at: 0, dur: SCENES[6], from: 140, to: 110 })} disk={tween({ at: 0, dur: 30, from: 0.6, to: 0.25 })} orbits={0.5} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1060, textAlign: 'center' }}>
        <Spaced text="Nothing comes back" at={6} size={46} each={0.7} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1140, textAlign: 'center', opacity: tween({ at: out + 10, dur: 16 })(frame) }}>
        <div style={hud(20, { letterSpacing: '0.4em' })}>what if you fell into a black hole</div>
      </div>
      <AbsoluteFill style={{ background: '#000', opacity: tween({ at: SCENES[6] - 26, dur: 24 })(frame) }} />
    </Space>
  );
};

export const BlackHoleFall: React.FC<{ music?: boolean }> = ({ music = true }) => (
  <Stage background={C.space}>
    <Look pack="film">
      <Scenes>
        <Scene duration={SCENES[0]} name="hook"><Hook /></Scene>
        <Cut duration={CUTS[0]} kind={crossfade()} />
        <Scene duration={SCENES[1]} name="horizon"><Horizon /></Scene>
        <Cut duration={CUTS[1]} kind={dip()} />
        <Scene duration={SCENES[2]} name="stretch"><Stretch /></Scene>
        <Cut duration={CUTS[2]} kind={crossfade()} />
        <Scene duration={SCENES[3]} name="giant"><Giant /></Scene>
        <Cut duration={CUTS[3]} kind={crossfade()} />
        <Scene duration={SCENES[4]} name="friend"><Friend /></Scene>
        <Cut duration={CUTS[4]} kind={zoomThrough({ box: ZOOM_BOX, blur: 8 })} />
        <Scene duration={SCENES[5]} name="inside"><Inside /></Scene>
        <Cut duration={CUTS[5]} kind={dip()} />
        <Scene duration={SCENES[6]} name="outro"><Outro /></Scene>
      </Scenes>
    </Look>
    <Captions
      track={VO} y={1380} size={50} maxWords={4} color="rgba(238,242,248,0.85)" active="#FFFFFF" accent={C.blue}
      style={{ font: `500 50px/1.15 ${kitFonts.sans}`, letterSpacing: '0.01em' }}
    />
    <Audio src={staticFile(VO.data.audio)} />
    {music && <Audio src={staticFile('music/space-drone.mp3')} volume={VO.duck(0.5, 0.22)} />}
    <Sfx at={STARTS[1] - 6} name="whoosh-soft" volume={0.2} />
    <Sfx at={VO.at('horizon')} name="impact" volume={0.25} />
    <Sfx at={STARTS[5] - 14} name="riser" volume={0.2} />
  </Stage>
);
