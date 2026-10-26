import React from 'react';
import { Globe } from 'lucide';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { FONT } from '../shared/type';
import { DrawIcon } from '../shared/DrawIcon';
import {
  Cut, Morph, Move, Scene, Scenes, Shared, Stage, add, blob, constant, boxTrack, dip, ink, iris, lightLeak, matchZoom, push, shape, shapes, spring, springs, tween, wipe, whip, zoomThrough,
} from 'cuekitvoltz';
import type { Box, TransitionKind } from 'cuekitvoltz';

// cuekitvoltz transitions board (16:9): every transition kind cutting from scene A to scene B, plus
// shape morphing and a Magic Move (shared element). Each cell is a 1920×1080 scene scaled down, so
// the transitions run at full size. Doubles as the README demo.
export const TRANSITIONS_BOARD_DURATION = 110;
const CUT_AT = 40;
const SCALE = 420 / 1920;
/** The tile in scene A: target of the zoom-through, the iris and the match cut (B's circle sits on it). */
const TILE: Box = { x: 1180, y: 330, w: 420, h: 420, r: 110 };
const TC = { x: (TILE.x + TILE.w / 2) / 1920, y: (TILE.y + TILE.h / 2) / 1080 };

const dots = (color: string): React.CSSProperties => ({ backgroundImage: `radial-gradient(${color} 2.5px, transparent 3px)`, backgroundSize: '56px 56px' });
const letter: React.CSSProperties = { position: 'absolute', top: 170, font: `800 640px ${FONT.sans}`, lineHeight: 1, letterSpacing: '-0.05em', color: '#F5F5F7' };

const MiniA: React.FC = () => (
  <AbsoluteFill style={{ background: 'linear-gradient(135deg, #1B1452, #0B2447)' }}>
    <AbsoluteFill style={dots('rgba(255,255,255,0.13)')} />
    <div style={{ ...letter, left: 150 }}>A</div>
    <div style={{ position: 'absolute', left: TILE.x, top: TILE.y, width: TILE.w, height: TILE.h, borderRadius: TILE.r, background: 'linear-gradient(160deg, #5AC8FA, #7D7AFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}>
      <DrawIcon icon={Globe} size={210} at={-40} color="#fff" stroke={1.6} />
    </div>
  </AbsoluteFill>
);

const MiniB: React.FC = () => (
  <AbsoluteFill style={{ background: 'linear-gradient(135deg, #4A0F2E, #5A3A0B)' }}>
    <AbsoluteFill style={dots('rgba(255,220,180,0.16)')} />
    <div style={{ ...letter, left: 300 }}>B</div>
    <div style={{ position: 'absolute', left: TILE.x + 20, top: TILE.y + 20, width: TILE.w - 40, height: TILE.h - 40, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFE07A, #FF6A3D)', boxShadow: '0 0 120px #FF6A3D88' }} />
  </AbsoluteFill>
);

const ab = (kind: TransitionKind, dur: number) => (
  <Scenes>
    <Scene duration={CUT_AT + dur}><MiniA /></Scene>
    <Cut duration={dur} kind={kind} />
    <Scene duration={TRANSITIONS_BOARD_DURATION - CUT_AT}><MiniB /></Scene>
  </Scenes>
);

const MorphDemo: React.FC = () => {
  const { fps } = useVideoConfig();
  const paths = [shapes.circle(), shapes.star(), shapes.heart(), shapes.polygon(6), shapes.roundRect()];
  const switches = [16, 40, 64, 88];
  const at = add(...switches.map((f) => spring({ at: f, fps, ...springs.smooth })));
  // the bounce goes on scale: a dip and a springy recovery at every switch
  const pop = add(constant(1), ...switches.map((f) => add(tween({ at: f, dur: 4, to: -0.12 }), spring({ at: f + 4, fps, to: 0.12, ...springs.bouncy }))));
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0B2447, #1B1452)' }}>
      <AbsoluteFill style={dots('rgba(255,255,255,0.1)')} />
      <Move x={constant(650)} y={constant(230)} scale={pop} shutter={0}>
        <Morph paths={paths} at={at} width={620} height={620} viewBox="0 0 200 200" fill="url(#mg)" />
      </Move>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5AC8FA" /><stop offset="0.5" stopColor="#7D7AFF" /><stop offset="1" stopColor="#FF6FB5" /></linearGradient></defs>
      </svg>
    </AbsoluteFill>
  );
};

const SharedDemo: React.FC = () => {
  const { fps } = useVideoConfig();
  const small = (i: number): Box => ({ x: 140, y: 150 + i * 270, w: 560, h: 210, r: 40 });
  const big: Box = { x: 860, y: 150, w: 920, h: 780, r: 70 };
  const hero = boxTrack([{ at: 0, box: small(1) }, { at: 28, box: big, spring: springs.smooth }, { at: 78, box: small(1), spring: springs.smooth }], fps);
  const others = add(tween({ at: 26, dur: 10, to: -0.85 }), tween({ at: 80, dur: 10, to: 0.85 }));
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #10102A, #0B2447)' }}>
      {[0, 2].map((i) => (
        <Move key={i} x={() => small(i).x} y={() => small(i).y} opacity={(f) => 1 + others(f)}>
          <div style={{ width: 560, height: 210, borderRadius: 40, background: '#1E1E2C', border: '2px solid rgba(255,255,255,0.12)' }} />
        </Move>
      ))}
      <Shared box={hero} style={{ background: 'linear-gradient(160deg, #5AC8FA, #7D7AFF)' }}>
        {(b) => (
          <div style={{ position: 'absolute', left: b.w * 0.08, top: b.h * 0.12, font: `800 ${Math.round(b.w * 0.14)}px ${FONT.sans}`, color: '#fff', letterSpacing: '-0.04em' }}>API</div>
        )}
      </Shared>
    </AbsoluteFill>
  );
};

const DEMOS: { name: string; note: string; node: React.ReactNode }[] = [
  { name: 'push', note: 'left · 18 f', node: ab(push(), 18) },
  { name: 'whip', note: 'up · 12 f', node: ab(whip({ dir: 'up' }), 12) },
  { name: 'wipe', note: '20° · glowing edge', node: ab(wipe({ angle: 20, glow: '#FFC46B' }), 20) },
  { name: 'iris', note: 'from the tile', node: ab(iris({ x: TC.x, y: TC.y }), 20) },
  { name: 'shape', note: 'star · rim · unspins', node: ab(shape({ path: shapes.star(), x: TC.x, y: TC.y, rim: '#FFC46B' }), 22) },
  { name: 'blob', note: 'liquid · from below', node: ab(blob({ x: 0.3, y: 1 }), 26) },
  { name: 'zoom-through', note: 'into the tile · zoom blur', node: ab(zoomThrough({ box: TILE }), 20) },
  { name: 'match-zoom', note: 'tile matches circle · 8 f', node: ab(matchZoom({ x: TC.x, y: TC.y }), 8) },
  { name: 'light leak', note: '24 f', node: ab(lightLeak(), 24) },
  { name: 'dip', note: 'to black · 16 f', node: ab(dip(), 16) },
  { name: 'morph', note: 'any outline to any outline', node: <MorphDemo /> },
  { name: 'magic move', note: 'shared element', node: <SharedDemo /> },
];

export const TransitionsBoard: React.FC = () => (
  <Stage>
    <div style={{ position: 'absolute', left: 60, top: 34, display: 'flex', alignItems: 'baseline', gap: 22 }}>
      <div style={{ font: `600 26px ${ink.font.mono}`, letterSpacing: '0.16em', color: ink.text }}>CUEKITVOLTZ · TRANSITIONS</div>
      <div style={{ font: `500 22px ${ink.font.mono}`, letterSpacing: '0.08em', color: ink.muted }}>cut at frame {CUT_AT} · every move motion-blurred</div>
    </div>
    {DEMOS.map((d, i) => {
      const left = 60 + (i % 4) * 450, top = 100 + Math.floor(i / 4) * 322;
      return (
        <div key={d.name} style={{ position: 'absolute', left, top }}>
          <div style={{ position: 'relative', width: 420, height: 236, overflow: 'hidden', borderRadius: 12, outline: `1.5px solid ${ink.line}` }}>
            <div style={{ position: 'relative', width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: '0 0' }}>
              <Sequence width={1920} height={1080} durationInFrames={TRANSITIONS_BOARD_DURATION} name={d.name}>{d.node}</Sequence>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'baseline' }}>
            <div style={{ font: `600 22px ${ink.font.mono}`, color: ink.text }}>{d.name}</div>
            <div style={{ font: `500 17px ${ink.font.mono}`, color: ink.muted }}>{d.note}</div>
          </div>
        </div>
      );
    })}
  </Stage>
);
