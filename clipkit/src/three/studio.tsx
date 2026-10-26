import React, { useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { V3 } from '../world/iso/project';
import { DEG, num, useMotion3D } from './time';
import type { N } from './time';

// Procedural photo studios: emissive softboxes baked into an environment map (PMREM), plus a
// shadow-casting key light and an invisible floor that only catches shadows. No HDR downloads,
// so renders stay offline and identical on every machine.

type Panel = { color: string; power: number; at: V3; size: [number, number] };
type Light = { at: V3; color: string; power: number };
export type StudioSpec = { panels: Panel[]; key: Light; rim?: Light; bg?: string };

export const studios = {
  /** neutral product studio: big overhead softbox, two strips, soft front fill */
  product: {
    panels: [
      { color: '#FFFFFF', power: 3.2, at: [0, 6, 1], size: [7, 4] },
      { color: '#E8F0FF', power: 4, at: [-6, 2, 1], size: [1.6, 6] },
      { color: '#FFF1E0', power: 3, at: [6, 1.5, -1], size: [1.6, 6] },
      { color: '#FFFFFF', power: 1.2, at: [2, 1, 6], size: [4, 3] },
      { color: '#2C2C36', power: 1, at: [0, -6, 0], size: [16, 16] },
      { color: '#1C1C26', power: 1, at: [0, 2, -7], size: [16, 8] },
    ],
    key: { at: [-3, 7, 4], color: '#FFFFFF', power: 2 },
    rim: { at: [4, 3, -5], color: '#D6E6FF', power: 1.6 },
  },
  /** coloured softboxes: metals pick up the brand spectrum */
  spectrum: {
    panels: [
      { color: '#5AC8FA', power: 4, at: [-5, 2, 3], size: [3, 5] },
      { color: '#7D7AFF', power: 3, at: [0, 5, -1], size: [6, 2] },
      { color: '#FF6FB5', power: 4, at: [5, 0, 2], size: [3, 5] },
      { color: '#FFB340', power: 3, at: [1, -5, 2], size: [5, 2] },
      { color: '#FFFFFF', power: 6, at: [-1.5, 2.5, 5], size: [2, 1.2] },
      { color: '#FFFFFF', power: 2, at: [2, 1, -5], size: [4, 3] },
      { color: '#2A2A60', power: 1.2, at: [0, -6, 0], size: [14, 14] },
      { color: '#301848', power: 1, at: [0, 6, 0], size: [14, 14] },
    ],
    key: { at: [-2, 6, 4], color: '#FFFFFF', power: 1.4 },
    rim: { at: [4, 2, -4], color: '#FF6FB5', power: 2 },
  },
  /** warm low key from the right, magenta and blue fills */
  sunset: {
    panels: [
      { color: '#FF9A4A', power: 6, at: [6, 1, 2], size: [2.5, 4] },
      { color: '#FF5FA2', power: 2.5, at: [-6, 1.5, 1], size: [2, 5] },
      { color: '#3A4BFF', power: 1.6, at: [0, 7, 0], size: [8, 6] },
      { color: '#FFD9B0', power: 1, at: [0, 1, 7], size: [6, 3] },
      { color: '#3A2028', power: 1, at: [0, -6, 0], size: [16, 16] },
    ],
    key: { at: [6, 3.5, 3], color: '#FFB27A', power: 2.4 },
    rim: { at: [-5, 3, -4], color: '#FF5FA2', power: 2 },
  },
  /** dramatic: one top strip and two hard rims, the rest falls to black */
  noir: {
    panels: [
      { color: '#FFFFFF', power: 5, at: [0, 7, 0.5], size: [1.2, 7] },
      { color: '#FFFFFF', power: 9, at: [-6, 1.5, -4], size: [0.6, 6] },
      { color: '#FFFFFF', power: 9, at: [6, 1.5, -4], size: [0.6, 6] },
      { color: '#14141A', power: 1, at: [0, -6, 0], size: [16, 16] },
    ],
    key: { at: [0, 8, 2], color: '#FFFFFF', power: 1.6 },
    rim: { at: [-4, 2, -5], color: '#FFFFFF', power: 3 },
  },
  /** warm sand softboxes with a copper kicker */
  warm: {
    panels: [
      { color: '#F4D9A0', power: 3.2, at: [0, 6, 1], size: [7, 4] },
      { color: '#FFF4E0', power: 3.4, at: [-6, 2, 1.5], size: [1.8, 6] },
      { color: '#C8792C', power: 5, at: [6, 1.2, -1], size: [1.8, 5] },
      { color: '#F4D9A0', power: 1.3, at: [1.5, 1, 6], size: [4, 3] },
      { color: '#5B4632', power: 1, at: [0, -6, 0], size: [16, 16] },
      { color: '#3A2C1F', power: 1.2, at: [0, 2, -7], size: [16, 8] },
      { color: '#F4D9A0', power: 0.45, at: [0, 7.5, 0], size: [18, 18] },
      { color: '#6A523B', power: 0.8, at: [-7, 1, -2], size: [6, 8] },
    ],
    bg: '#120E0A',
    key: { at: [-3, 7, 4], color: '#FFF1D6', power: 2 },
    rim: { at: [5, 2.5, -4], color: '#C8792C', power: 2.4 },
  },
  /** black stage, deep red rims, a green-black bounce */
  ember: {
    panels: [
      { color: '#FFFFFF', power: 2.4, at: [0, 7, 1], size: [1.4, 7] },
      { color: '#A31C1B', power: 12, at: [-6, 1.5, -3], size: [0.8, 6] },
      { color: '#A31C1B', power: 12, at: [6, 1.5, -3], size: [0.8, 6] },
      { color: '#FFFFFF', power: 1.6, at: [0, 2.5, 8], size: [14, 4] },
      { color: '#A31C1B', power: 1.2, at: [0, -1, 8], size: [14, 2] },
      { color: '#06110C', power: 2, at: [0, -6, 0], size: [16, 16] },
    ],
    bg: '#030303',
    key: { at: [-2, 8, 3], color: '#FFFFFF', power: 1.5 },
    rim: { at: [4, 2, -5], color: '#A31C1B', power: 4 },
  },
  /** soft overcast all round: the clay-render light */
  clay: {
    panels: [
      { color: '#FFFFFF', power: 2.6, at: [0, 7, 0], size: [10, 10] },
      { color: '#FFFFFF', power: 1.4, at: [-7, 2, 2], size: [6, 6] },
      { color: '#FFFFFF', power: 1.4, at: [7, 2, 2], size: [6, 6] },
      { color: '#FFFFFF', power: 1.2, at: [0, 2, 7], size: [8, 6] },
      { color: '#FFFFFF', power: 0.8, at: [0, 2, -7], size: [8, 6] },
      { color: '#B8B4AE', power: 0.8, at: [0, -6, 0], size: [16, 16] },
    ],
    key: { at: [-3, 8, 3], color: '#FFFFFF', power: 1.2 },
  },
} satisfies Record<string, StudioSpec>;

export type StudioName = keyof typeof studios;

const bakeEnvironment = (gl: THREE.WebGLRenderer, spec: StudioSpec) => {
  const room = new THREE.Scene();
  room.background = new THREE.Color(spec.bg ?? '#050508');
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  for (const p of spec.panels) {
    const geo = new THREE.PlaneGeometry(p.size[0], p.size[1]);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.power), side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...p.at);
    m.lookAt(0, 0, 0);
    room.add(m);
    geos.push(geo);
    mats.push(mat);
  }
  const pmrem = new THREE.PMREMGenerator(gl);
  const target = pmrem.fromScene(room, 0.03);
  pmrem.dispose();
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return target;
};

export type StudioProps = {
  preset?: StudioName | StudioSpec;
  /** scales the environment and lights */
  intensity?: number;
  /** turns the whole studio around the vertical axis (degrees) */
  rotate?: number;
  /** height of the shadow-catching floor, or false for none */
  floor?: number | false;
  /** shadow darkness on the floor (0–1) */
  shadow?: number;
  /** half-width of the area that gets shadows */
  shadowArea?: number;
  /** animated light level (multiplies intensity; 0 = dark), evaluated per motion-blur sample */
  level?: N;
  /** animated turn of the environment reflections, degrees (a light sweep across metal) */
  spin?: N;
};

export const Studio: React.FC<StudioProps> = ({ preset = 'product', intensity = 1, rotate = 0, floor = 0, shadow = 0.45, shadowArea = 6, level, spin }) => {
  const { gl, scene } = useThree();
  const spec: StudioSpec = typeof preset === 'string' ? studios[preset] : preset;
  useLayoutEffect(() => {
    const env = bakeEnvironment(gl, spec);
    scene.environment = env.texture;
    scene.environmentIntensity = intensity;
    scene.environmentRotation.set(0, rotate * DEG, 0);
    return () => {
      if (scene.environment === env.texture) scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, spec, intensity, rotate]);

  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  useMotion3D((t) => {
    if (level === undefined && spin === undefined) return;
    const lv = level === undefined ? 1 : num(level, t);
    scene.environmentIntensity = intensity * lv;
    scene.environmentRotation.set(0, (rotate + (spin === undefined ? 0 : num(spin, t))) * DEG, 0);
    if (key.current) key.current.intensity = spec.key.power * intensity * lv;
    if (rim.current && spec.rim) rim.current.intensity = spec.rim.power * intensity * lv;
  });
  const turn = (p: V3): V3 => {
    const a = rotate * DEG;
    return [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
  };
  return (
    <>
      <directionalLight
        ref={key} position={turn(spec.key.at)} color={spec.key.color} intensity={spec.key.power * intensity} castShadow
        shadow-mapSize={[2048, 2048]} shadow-radius={10} shadow-blurSamples={16} shadow-bias={-0.0005}
        shadow-camera-left={-shadowArea} shadow-camera-right={shadowArea} shadow-camera-top={shadowArea} shadow-camera-bottom={-shadowArea}
        shadow-camera-near={0.5} shadow-camera-far={40}
      />
      {spec.rim && <directionalLight ref={rim} position={turn(spec.rim.at)} color={spec.rim.color} intensity={spec.rim.power * intensity} />}
      {floor !== false && (
        <mesh rotation-x={-Math.PI / 2} position-y={floor} receiveShadow userData={{ shadow: false }}>
          <planeGeometry args={[80, 80]} />
          <shadowMaterial opacity={shadow} />
        </mesh>
      )}
    </>
  );
};
