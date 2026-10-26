import React from 'react';
import { Database, Globe, Server } from 'lucide';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Atmosphere } from '../shared/Atmosphere';
import type { PaletteKey } from '../shared/Atmosphere';
import { FONT, M, S, rampAt } from '../shared/type';
import { DrawIcon } from '../shared/DrawIcon';
import type { IconNode } from '../shared/DrawIcon';
import {
  Cut, Move, Scene, Scenes, Shared, Split, Stage, add, blob, boxTrack, constant, ease, lightLeak, matchZoom, scenesLength, spring, springs, stagger, tween, zoomThrough,
} from 'cuekitvoltz';
import type { Box, Unit } from 'cuekitvoltz';

// cuekitvoltz transitions in use (shorts, 1080×1920): one request's trip told across five scenes.
//   1 → 2  Magic Move: the Browser tile grows into a hero tile, then the camera zooms through it
//   2 → 3  a liquid blob floods in from the bottom-left
//   3 → 4  match cut: the highlighted row and "200" sit on the same spot
//   4 → 5  light leak into the end card
export const REEL_SCENES = [80, 70, 60, 50, 60];
export const REEL_CUTS = [20, 24, 8, 24];
export const REEL_DURATION = scenesLength(REEL_SCENES, REEL_CUTS);
const HERO: Box = { x: 190, y: 760, w: 700, h: 700, r: 170 };
const MATCH_Y = 880;

/** Scene background. `overscan` paints it past the frame, so a zoom-through into a box of another shape fills the box. */
const Bg: React.FC<{ palette: PaletteKey; overscan?: number; children: React.ReactNode }> = ({ palette, overscan = 1, children }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ background: '#000', transform: `scale(${overscan})` }}>
      <Atmosphere palette={palette} />
    </AbsoluteFill>
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

const TILES: { icon: IconNode; label: string }[] = [
  { icon: Globe, label: 'Browser' },
  { icon: Server, label: 'API' },
  { icon: Database, label: 'Database' },
];
const tileBox = (i: number): Box => ({ x: 90 + i * 320, y: 1000, w: 260, h: 260, r: 64 });
const tileBg = 'linear-gradient(160deg, #5AC8FA, #7D7AFF)';

const Click: React.FC = () => {
  const { fps } = useVideoConfig();
  const rise = useRise();
  const hero = boxTrack([{ at: 0, box: tileBox(0) }, { at: 34, box: HERO, spring: springs.smooth }], fps);
  const leave = (i: number) => ({ y: add(constant(tileBox(i).y), tween({ at: 30 + i * 2, dur: 12, to: 140, ease: ease.in })), opacity: tween({ at: 30 + i * 2, dur: 10, from: 1, to: 0 }) });
  const enter = (i: number) => spring({ at: 14 + i * 4, fps, from: 0.6, to: 1, ...springs.pop });
  return (
    <Bg palette="indigo">
      <div style={{ position: 'absolute', left: 90, top: 250, ...M(30, 500, { color: '#C9C7D6', letterSpacing: '0.14em' }) }}>System design · 01</div>
      <div style={{ position: 'absolute', left: 90, top: 330, ...S(110, 760) }}><Split text="Where does" unit={rise(4)} /></div>
      <div style={{ position: 'absolute', left: 90, top: 450, ...S(110, 760) }}>
        <Split text="a " count={8} unit={rise(10)} />
        <Split text="click" start={1} count={8} unit={(i, n) => ({ ...rise(10)(i, n), weight: undefined, style: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: '1.14em', color: rampAt('spectrum', (i - 1) / 4) } })} />
        <Split text=" go?" start={6} count={8} unit={rise(10)} />
      </div>
      {[1, 2].map((i) => (
        <Move key={i} x={constant(tileBox(i).x)} {...leave(i)} scale={enter(i)}>
          <div style={{ width: 260, height: 260, borderRadius: 64, background: '#1C1C2A', border: '2px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DrawIcon icon={TILES[i].icon} size={120} at={18 + i * 4} color="#C9C7D6" stroke={1.6} />
          </div>
          <div style={{ ...M(30, 500, { color: '#C9C7D6', marginTop: 22, textAlign: 'center' }) }}>{TILES[i].label}</div>
        </Move>
      ))}
      <Shared box={hero} style={{ background: tileBg, boxShadow: '0 40px 90px rgba(0,0,0,0.45)' }}>
        {(b) => (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <DrawIcon icon={Globe} size={b.w * 0.46} at={16} color="#fff" stroke={1.5} />
          </AbsoluteFill>
        )}
      </Shared>
    </Bg>
  );
};

const LOG = ['GET /api/user', 'auth: token ok', 'route: users.get', 'query: 1 row'];

const Api: React.FC = () => {
  const frame = useCurrentFrame();
  const rise = useRise();
  return (
    <Bg palette="navy" overscan={2.2}>
      <div style={{ position: 'absolute', left: 90, top: 250, ...M(30, 500, { color: '#C9C7D6', letterSpacing: '0.14em' }) }}>Hop 2 · 14 ms</div>
      <div style={{ position: 'absolute', left: 90, top: 330, ...S(110, 760) }}><Split text="API server" unit={rise(12)} /></div>
      <div style={{ position: 'absolute', left: 90, top: 620, width: 900, padding: '40px 44px', borderRadius: 40, background: 'rgba(10,14,28,0.82)', border: '1.5px solid rgba(255,255,255,0.14)' }}>
        {LOG.map((line, i) => {
          const at = 18 + i * 7;
          const chars = Math.max(0, Math.min(line.length, Math.floor((frame - at) * 2.2)));
          return (
            <div key={line} style={{ ...M(40, 500, { textTransform: 'none', letterSpacing: '0.01em', color: i === 0 ? '#5AC8FA' : '#E6E6EE', lineHeight: 1.7 }) }}>
              {line.slice(0, chars)}
              {chars > 0 && chars < line.length && <span style={{ display: 'inline-block', width: '0.55em', height: '1em', marginLeft: 6, verticalAlign: '-0.15em', background: '#5AC8FA' }} />}
            </div>
          );
        })}
      </div>
    </Bg>
  );
};

const ROWS = [['17', 'asha', 'free'], ['42', 'kunal', 'pro'], ['58', 'ravi', 'team']];

const Db: React.FC = () => {
  const { fps } = useVideoConfig();
  const rise = useRise();
  return (
    <Bg palette="plum">
      <div style={{ position: 'absolute', left: 90, top: 250, ...M(30, 500, { color: '#C9C7D6', letterSpacing: '0.14em' }) }}>Hop 3 · 9 ms</div>
      <div style={{ position: 'absolute', left: 90, top: 330, ...S(110, 760) }}><Split text="Database" unit={rise(14)} /></div>
      {ROWS.map((row, i) => {
        const hot = i === 1;
        return (
          <Move key={row[0]} x={spring({ at: 16 + i * 4, fps, from: 1100, to: 90, duration: 0.55, bounce: 0.2, velocity: 2 })} y={constant(MATCH_Y - 60 + (i - 1) * 150)}>
            <div style={{
              width: 900, height: 120, borderRadius: 30, display: 'flex', alignItems: 'center', gap: 60, padding: '0 44px',
              background: hot ? 'rgba(125,122,255,0.22)' : 'rgba(20,16,30,0.8)', border: `2px solid ${hot ? '#7D7AFF' : 'rgba(255,255,255,0.12)'}`,
            }}>
              {row.map((cell, j) => <div key={j} style={{ ...M(40, 500, { textTransform: 'none', color: hot ? '#FFFFFF' : '#C9C7D6', width: j === 0 ? 80 : 260 }) }}>{cell}</div>)}
            </div>
          </Move>
        );
      })}
    </Bg>
  );
};

const Ok: React.FC = () => (
  <Bg palette="stage">
    <div style={{ position: 'absolute', left: 90, top: 250, ...M(30, 500, { color: '#C9C7D6', letterSpacing: '0.14em' }) }}>Back to the browser</div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: MATCH_Y - 142, textAlign: 'center', ...S(250, 800, { letterSpacing: '-0.06em' }) }}>
      200 <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, color: '#34D399' }}>OK</span>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: MATCH_Y + 160, textAlign: 'center', ...M(40, 500, { color: '#C9C7D6' }) }}>120 ms round trip</div>
  </Bg>
);

const End: React.FC = () => {
  const rise = useRise();
  return (
    <Bg palette="violet">
      <div style={{ position: 'absolute', left: 90, top: 700, ...S(130, 760) }}><Split text="6 hops." unit={rise(10)} /></div>
      <div style={{ position: 'absolute', left: 90, top: 850, ...S(130, 760) }}><Split text="120 ms." unit={rise(16)} /></div>
      <div style={{ position: 'absolute', left: 90, top: 1060, ...M(30, 500, { color: '#C9C7D6', letterSpacing: '0.14em' }) }}>Built with cuekitvoltz</div>
    </Bg>
  );
};

export const TransitionsReel: React.FC = () => (
  <Stage background="#000">
    <Scenes>
      <Scene duration={REEL_SCENES[0]} name="click"><Click /></Scene>
      <Cut duration={REEL_CUTS[0]} kind={zoomThrough({ box: HERO })} />
      <Scene duration={REEL_SCENES[1]} name="api"><Api /></Scene>
      <Cut duration={REEL_CUTS[1]} kind={blob({ x: 0, y: 1, color: '#7D7AFF' })} />
      <Scene duration={REEL_SCENES[2]} name="db"><Db /></Scene>
      <Cut duration={REEL_CUTS[2]} kind={matchZoom({ x: 0.5, y: MATCH_Y / 1920 })} />
      <Scene duration={REEL_SCENES[3]} name="ok"><Ok /></Scene>
      <Cut duration={REEL_CUTS[3]} kind={lightLeak()} />
      <Scene duration={REEL_SCENES[4]} name="end"><End /></Scene>
    </Scenes>
  </Stage>
);
