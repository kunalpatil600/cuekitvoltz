import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Anim, Pin3D, Scene3D, Stage, ink, materials, orbit, spring, springs } from 'cuekitvoltz';
import type { MaterialParams, Motion, V3 } from 'cuekitvoltz';

// cuekitvoltz 3D materials (16:9, warm palette): ten PBR presets in the `warm` procedural studio,
// soft VSM floor shadows, bloom on the neon, a slow camera orbit. Labels are DOM pinned to 3D points.
export const THREE_MATERIALS_DURATION = 150;
const P = { brown: '#5B4632', sand: '#F4D9A0', copper: '#C8792C' };
const cube = new RoundedBoxGeometry(0.82, 0.82, 0.82, 4, 0.12);

type Kind = 'sphere' | 'cube' | 'torus' | 'cylinder' | 'knot';
const ITEMS: { name: string; mat: MaterialParams; kind: Kind }[] = [
  { name: 'clay', mat: materials.clay(P.sand), kind: 'sphere' },
  { name: 'plastic', mat: materials.plastic(P.copper), kind: 'cube' },
  { name: 'glossy', mat: materials.glossy(P.brown), kind: 'knot' },
  { name: 'ceramic', mat: materials.ceramic('#FBF0DA'), kind: 'cylinder' },
  { name: 'rubber', mat: materials.rubber('#3A2C1F'), kind: 'cube' },
  { name: 'metal', mat: materials.metal(P.copper), kind: 'knot' },
  { name: 'chrome', mat: materials.chrome(), kind: 'sphere' },
  { name: 'anodized', mat: materials.anodized('#8A6A4A'), kind: 'cylinder' },
  { name: 'glass', mat: materials.glass('#FFE7BE'), kind: 'torus' },
  { name: 'neon', mat: materials.neon(P.copper), kind: 'torus' },
];

const Shape: React.FC<{ kind: Kind; mat: MaterialParams }> = ({ kind, mat }) => {
  const m = <meshPhysicalMaterial {...mat} />;
  switch (kind) {
    case 'sphere': return <mesh position-y={0.5}><sphereGeometry args={[0.5, 64, 32]} />{m}</mesh>;
    case 'cube': return <mesh position-y={0.41} geometry={cube}>{m}</mesh>;
    case 'torus': return <mesh position-y={0.52}><torusGeometry args={[0.36, 0.15, 32, 96]} />{m}</mesh>;
    case 'cylinder': return <mesh position-y={0.45}><cylinderGeometry args={[0.38, 0.38, 0.9, 64]} />{m}</mesh>;
    default: return <mesh position-y={0.55}><torusKnotGeometry args={[0.28, 0.1, 160, 24]} />{m}</mesh>;
  }
};

const spot = (i: number): V3 => [(i % 5) * 1.8 - 3.6, 0, i < 5 ? -1.5 : 1.5];

export const ThreeMaterials: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = orbit({ target: [0, 0.2, 0.1], az: (f) => -8 + f * 0.1, el: 30, dist: 11, fov: 30 });
  const rise = (i: number): Motion => spring({ at: 4 + i * 3, fps, from: 0, to: 1, ...springs.pop });
  return (
    <Stage background={P.brown}>
      <Scene3D
        camera={cam} studio="warm" shadow={0.5}
        background={{ top: '#6A523B', bottom: '#241A11', glow: 'rgba(244,217,160,0.32)', glowAt: [0.5, 0.2], glowSize: 0.7 }}
        post={{ bloom: { strength: 0.6, radius: 0.5, threshold: 1.4 }, aberration: 0.5, vignette: 0.35 }}
      >
        {ITEMS.map((it, i) => (
          <Anim key={it.name} position={spot(i)} rotation={[0, (f) => f * 1.1 + i * 20, 0]} scale={rise(i)}>
            <Shape kind={it.kind} mat={it.mat} />
          </Anim>
        ))}
      </Scene3D>
      {ITEMS.map((it, i) => {
        const [x, , z] = spot(i);
        // back row: label above the object; front row: on the floor in front of it
        return (
          <Pin3D key={it.name} camera={cam} at={i < 5 ? [x, 1.35, z] : [x, 0, z + 0.85]} style={{ opacity: Math.min(1, Math.max(0, rise(i)(frame))) }}>
            <div style={{ font: `500 22px ${ink.font.mono}`, letterSpacing: '0.12em', color: P.sand, textTransform: 'uppercase', opacity: 0.85 }}>{it.name}</div>
          </Pin3D>
        );
      })}
      <div style={{ position: 'absolute', left: 60, top: 34, display: 'flex', alignItems: 'baseline', gap: 22 }}>
        <div style={{ font: `600 26px ${ink.font.mono}`, letterSpacing: '0.16em', color: P.sand }}>CUEKITVOLTZ · 3D MATERIALS</div>
        <div style={{ font: `500 22px ${ink.font.mono}`, letterSpacing: '0.08em', color: P.copper }}>PBR presets · procedural studio · soft shadows · bloom</div>
      </div>
    </Stage>
  );
};
