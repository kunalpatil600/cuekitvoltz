import React from 'react';
import { useVideoConfig } from 'remotion';
import {
  Cloud, Database, Gpu, IsoGrid, IsoLink, IsoScene, Laptop, Phone, Platform, Router, Server, Stage, ink, isoRoute, isoView, project, spring, springs, tween,
} from 'cuekitvoltz';
import type { Motion } from 'cuekitvoltz';

// cuekitvoltz iso kit (16:9): a small network built from the kit's objects. Everything rises in on
// springs, links draw on, packets run laptop → router → cloud → servers → database.
export const WORLD_ISO_DURATION = 150;
const view = isoView({ origin: [930, 170], unit: 118 });

const LABELS: { text: string; at: [number, number, number] }[] = [
  { text: 'phone', at: [0.45, 5.6, -0.1] },
  { text: 'laptop', at: [1.75, 4.9, -0.1] },
  { text: 'router', at: [3.35, 4.7, -0.1] },
  { text: 'cloud', at: [4.4, 1.6, 2.6] },
  { text: 'servers', at: [6.1, 4.8, -0.1] },
  { text: 'database', at: [7.9, 3.1, -0.1] },
  { text: 'gpu', at: [4.3, 7.6, -0.1] },
];

export const WorldIso: React.FC = () => {
  const { fps } = useVideoConfig();
  const rise = (i: number): Motion => spring({ at: 6 + i * 5, fps, ...springs.bouncy });
  const hop = (from: number) => tween({ at: from, dur: 26, ease: (t) => t });
  return (
    <Stage>
      <div style={{ position: 'absolute', left: 60, top: 34, display: 'flex', alignItems: 'baseline', gap: 22 }}>
        <div style={{ font: `600 26px ${ink.font.mono}`, letterSpacing: '0.16em', color: ink.text }}>CUEKITVOLTZ · ISO KIT</div>
        <div style={{ font: `500 22px ${ink.font.mono}`, letterSpacing: '0.08em', color: ink.muted }}>light-shaded · depth-sorted · springs · packets</div>
      </div>
      <IsoScene view={view}>
        <IsoGrid x={-0.5} y={0.5} w={9} d={7.5} />
        <Platform x={4.7} y={3.5} w={2.9} d={1.4} rise={rise(4)} />
        <IsoLink path={isoRoute([2, 4.4], [3.3, 4.4])} draw={tween({ at: 40, dur: 14 })} packets={[{ at: hop(70) }]} />
        <IsoLink path={[[3.3, 4.2, 0], [3.3, 2.6, 0], [4.2, 2.6, 0]]} color="#7D7AFF" draw={tween({ at: 44, dur: 14 })} packets={[{ at: hop(92), color: '#7D7AFF' }]} />
        <IsoLink path={isoRoute([3.9, 4.6], [5.0, 4.6])} draw={tween({ at: 48, dur: 14 })} packets={[{ at: hop(96) }]} />
        <IsoLink path={[[6.6, 3.6, 0], [6.6, 2.6, 0], [6.9, 2.6, 0]]} color="#34D399" draw={tween({ at: 52, dur: 14 })} packets={[{ at: hop(118), color: '#34D399' }]} />
        <Phone x={0.3} y={5.2} rise={rise(0)} shown={tween({ at: 30, dur: 40 })} />
        <Laptop x={1.0} y={3.9} rise={rise(1)} open={spring({ at: 20, fps, ...springs.bouncy })} shown={tween({ at: 26, dur: 50 })} />
        <Router x={2.8} y={3.9} rise={rise(2)} />
        <Cloud x={3.7} y={1.4} z={1.7} rise={rise(3)} />
        <Server x={4.95} y={3.7} rise={rise(5)} seed="s1" />
        <Server x={6.25} y={3.7} rise={rise(6)} seed="s2" accent="#7D7AFF" />
        <Database x={6.9} y={1.9} rise={rise(7)} />
        <Gpu x={3.2} y={6.2} rise={rise(8)} />
      </IsoScene>
      {LABELS.map((l) => {
        const [sx, sy] = project(view, l.at);
        return (
          <div key={l.text} style={{ position: 'absolute', left: sx, top: sy + 18, transform: 'translateX(-50%)', font: `500 24px ${ink.font.mono}`, letterSpacing: '0.1em', color: ink.muted, textTransform: 'uppercase' }}>
            {l.text}
          </div>
        );
      })}
    </Stage>
  );
};
