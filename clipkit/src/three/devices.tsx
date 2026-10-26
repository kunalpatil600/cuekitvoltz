import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { V3 } from '../world/iso/project';
import { materials } from './materials';
import type { MaterialParams } from './materials';
import { DEG, num, useMotion3D, vec } from './time';
import type { N, V3M } from './time';

// Generic device mockups (no brand marks). A device is described by a rig: pure functions of the
// frame for its placement, its lid and its screen corners. The 3D model follows the rig, and a DOM
// <ScreenOverlay> uses the same rig to put live React content exactly on the glass.

export type Placement = { position?: V3M; rotation?: V3M; scale?: N };
export type Quad = [V3, V3, V3, V3]; // top-left, top-right, bottom-right, bottom-left (as seen on the screen)

const placeMatrix = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Placement, t: number, m = new THREE.Matrix4()) => {
  const p = vec(position, t);
  const r = vec(rotation, t);
  const s = num(scale, t);
  return m.compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG)), new THREE.Vector3(s, s, s));
};
const apply = (m: THREE.Matrix4, p: V3): V3 => {
  const v = new THREE.Vector3(...p).applyMatrix4(m);
  return [v.x, v.y, v.z];
};

/** Rounded-corner slab: `w` × `d` footprint, `h` tall, standing on y = 0. */
const slab = (w: number, d: number, h: number, r: number, bevel: number) => {
  const s = new THREE.Shape();
  const x = -w / 2 + bevel;
  const y = -d / 2 + bevel;
  const W = w - bevel * 2;
  const D = d - bevel * 2;
  const R = Math.max(0.001, r - bevel);
  s.moveTo(x + R, y);
  s.lineTo(x + W - R, y);
  s.quadraticCurveTo(x + W, y, x + W, y + R);
  s.lineTo(x + W, y + D - R);
  s.quadraticCurveTo(x + W, y + D, x + W - R, y + D);
  s.lineTo(x + R, y + D);
  s.quadraticCurveTo(x, y + D, x, y + D - R);
  s.lineTo(x, y + R);
  s.quadraticCurveTo(x, y, x + R, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
};

const roundRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return new THREE.ShapeGeometry(s, 10);
};

export const finishes = {
  silver: materials.metal('#C6C9D0'),
  space: materials.anodized('#3C3D44'),
  midnight: materials.anodized('#23263A'),
  sky: materials.anodized('#B9CCE0'),
} satisfies Record<string, MaterialParams>;
export type Finish = keyof typeof finishes;

// ---------------------------------------------------------------- laptop

/** Laptop proportions in world units; the screen is 16:10. */
export const LAPTOP = { w: 3.04, d: 2.03, base: 0.075, lid: 0.05, r: 0.13, side: 0.08, top: 0.1, bottom: 0.13 };
const LAPTOP_SCREEN: [number, number] = [LAPTOP.w - LAPTOP.side * 2, LAPTOP.d - LAPTOP.top - LAPTOP.bottom];

export type LaptopRig = {
  place: Placement;
  /** lid angle in degrees */
  angle: (t: number) => number;
  root: (t: number) => THREE.Matrix4;
  lid: (t: number) => THREE.Matrix4;
  screen: (t: number) => Quad;
  /** screen size in world units */
  screenSize: [number, number];
};

const lidLocal = (deg: number) =>
  new THREE.Matrix4().makeTranslation(0, LAPTOP.base, -LAPTOP.d / 2).multiply(new THREE.Matrix4().makeRotationX(-deg * DEG));

/** A laptop rig. `open` 0–1 (springs welcome: overshoot bounces the lid) scales to `angle` degrees. */
export const laptopRig = ({ open = 1, angle = 110, ...place }: Placement & { open?: N; angle?: number }): LaptopRig => {
  const lidAngle = (t: number) => num(open, t) * angle;
  const root = (t: number) => placeMatrix(place, t);
  const lid = (t: number) => root(t).multiply(lidLocal(lidAngle(t)));
  const [sw] = LAPTOP_SCREEN;
  const e = 0.0015;
  return {
    place, angle: lidAngle, root, lid, screenSize: LAPTOP_SCREEN,
    screen: (t) => {
      const m = lid(t);
      const top = LAPTOP.d - LAPTOP.top;
      const bot = LAPTOP.bottom;
      return [apply(m, [-sw / 2, -e, top]), apply(m, [sw / 2, -e, top]), apply(m, [sw / 2, -e, bot]), apply(m, [-sw / 2, -e, bot])];
    },
  };
};

const KEY_ROWS = [
  Array(14).fill(1),
  [...Array(13).fill(1), 1.5],
  [1.5, ...Array(13).fill(1)],
  [1.8, ...Array(11).fill(1), 1.7],
  [2.3, ...Array(10).fill(1), 2.2],
  [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1],
];

const useKeys = () =>
  useMemo(() => {
    const keys: { x: number; z: number; w: number; d: number }[] = [];
    const width = 2.56;
    const gap = 0.024;
    let z = -0.86;
    KEY_ROWS.forEach((row, ri) => {
      const total = row.reduce((a, b) => a + b, 0);
      const u = width / total;
      const d = ri === 0 ? 0.08 : 0.15;
      let x = -width / 2;
      for (const k of row) {
        keys.push({ x: x + (k * u) / 2, z: z + d / 2, w: k * u - gap, d: d - gap });
        x += k * u;
      }
      z += d + 0.006;
    });
    return keys;
  }, []);

export type DeviceProps = {
  finish?: Finish | MaterialParams;
  /** colour of the glass under the overlay (it glows into bloom) */
  screen?: string;
  /** screen glow strength (HDR) */
  glow?: number;
};

export const Laptop3D: React.FC<DeviceProps & { rig: LaptopRig }> = ({ rig, finish = 'silver', screen = '#0B0D14', glow = 0.6 }) => {
  const body = typeof finish === 'string' ? finishes[finish] : finish;
  const rootRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const keys = useKeys();
  const geo = useMemo(() => {
    const keyGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.18);
    const [sw, sh] = LAPTOP_SCREEN;
    return {
      base: slab(LAPTOP.w, LAPTOP.d, LAPTOP.base, LAPTOP.r, 0.02),
      lid: slab(LAPTOP.w, LAPTOP.d, LAPTOP.lid, LAPTOP.r, 0.016),
      bezel: roundRect(LAPTOP.w - 0.02, LAPTOP.d - 0.02, LAPTOP.r - 0.01),
      panel: new THREE.PlaneGeometry(sw, sh),
      well: roundRect(2.66, 0.98, 0.04),
      pad: roundRect(1.3, 0.78, 0.06),
      keyGeo,
    };
  }, []);
  const keyMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo.keyGeo, new THREE.MeshPhysicalMaterial(materials.rubber('#16161B')), keys.length);
    const o = new THREE.Object3D();
    keys.forEach((k, i) => {
      o.position.set(k.x, LAPTOP.base + 0.006, k.z);
      o.scale.set(k.w, 0.016, k.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    return m;
  }, [geo, keys]);
  useMotion3D((t) => {
    if (rootRef.current) {
      rootRef.current.matrix.copy(rig.root(t));
      rootRef.current.matrixWorldNeedsUpdate = true;
    }
    if (lidRef.current) {
      lidRef.current.matrix.copy(lidLocal(rig.angle(t)));
      lidRef.current.matrixWorldNeedsUpdate = true;
    }
  });
  const sh = LAPTOP_SCREEN[1];
  return (
    <group ref={rootRef} matrixAutoUpdate={false}>
      <mesh geometry={geo.base}><meshPhysicalMaterial {...body} /></mesh>
      <mesh geometry={geo.well} rotation-x={-Math.PI / 2} position={[0, LAPTOP.base + 0.001, -0.427]}><meshPhysicalMaterial {...materials.rubber('#101014')} /></mesh>
      <primitive object={keyMesh} />
      <mesh geometry={geo.pad} rotation-x={-Math.PI / 2} position={[0, LAPTOP.base + 0.001, 0.53]}>
        <meshPhysicalMaterial {...body} roughness={0.22} clearcoat={0.6} />
      </mesh>
      <mesh rotation-z={Math.PI / 2} position={[0, LAPTOP.base, -LAPTOP.d / 2 + 0.03]}>
        <cylinderGeometry args={[0.03, 0.03, 2.3, 16]} />
        <meshPhysicalMaterial {...materials.anodized('#1A1A20')} />
      </mesh>
      <group ref={lidRef} matrixAutoUpdate={false}>
        <mesh geometry={geo.lid} position={[0, 0, LAPTOP.d / 2]}><meshPhysicalMaterial {...body} /></mesh>
        <mesh geometry={geo.bezel} rotation-x={Math.PI / 2} position={[0, -0.0008, LAPTOP.d / 2]} userData={{ shadow: false }}>
          <meshPhysicalMaterial color="#050507" roughness={0.12} metalness={0} clearcoat={1} />
        </mesh>
        <mesh geometry={geo.panel} rotation-x={Math.PI / 2} position={[0, -0.0012, LAPTOP.bottom + sh / 2]} userData={{ shadow: false }}>
          <meshBasicMaterial color={new THREE.Color(screen).multiplyScalar(1 + glow)} toneMapped />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position={[0, -0.0014, LAPTOP.d - LAPTOP.top / 2]} userData={{ shadow: false }}>
          <circleGeometry args={[0.012, 16]} />
          <meshPhysicalMaterial color="#1A2030" roughness={0.1} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- phone

export const PHONE = { w: 0.74, h: 1.52, t: 0.08, r: 0.12, inset: 0.034 };
const PHONE_SCREEN: [number, number] = [PHONE.w - PHONE.inset * 2, PHONE.h - PHONE.inset * 2];

export type PhoneRig = {
  place: Placement;
  root: (t: number) => THREE.Matrix4;
  screen: (t: number) => Quad;
  /** the body's outline in world space: pass it as an occluder to overlays behind the phone */
  outline: (t: number) => V3[];
  screenSize: [number, number];
};

/** Points around a rounded rectangle (x/y plane at height z), corners sampled `k` steps each. */
const roundedOutline = (w: number, h: number, r: number, z: number, k = 6): V3[] => {
  const out: V3[] = [];
  const corners: [number, number, number][] = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= k; i++) {
      const a = (a0 + (90 * i) / k) * DEG;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
    }
  }
  return out;
};

/** A phone rig: centred on its position, screen facing +z, y up. */
export const phoneRig = (place: Placement): PhoneRig => {
  const root = (t: number) => placeMatrix(place, t);
  const [sw, sh] = PHONE_SCREEN;
  const z = PHONE.t / 2 + 0.002;
  const rim = roundedOutline(PHONE.w + 0.01, PHONE.h + 0.01, PHONE.r, PHONE.t / 2);
  return {
    place, root, screenSize: PHONE_SCREEN,
    outline: (t) => {
      const m = root(t);
      return rim.map((p) => apply(m, p));
    },
    screen: (t) => {
      const m = root(t);
      return [apply(m, [-sw / 2, sh / 2, z]), apply(m, [sw / 2, sh / 2, z]), apply(m, [sw / 2, -sh / 2, z]), apply(m, [-sw / 2, -sh / 2, z])];
    },
  };
};

export const Phone3D: React.FC<DeviceProps & { rig: PhoneRig }> = ({ rig, finish = 'midnight', screen = '#0B0D14', glow = 0.6 }) => {
  const body = typeof finish === 'string' ? finishes[finish] : finish;
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const b = slab(PHONE.w, PHONE.h, PHONE.t, PHONE.r, 0.022);
    b.rotateX(Math.PI / 2); // stand it up: footprint in x/y, thickness along z
    b.translate(0, 0, -PHONE.t / 2);
    const [sw, sh] = PHONE_SCREEN;
    const bump = slab(0.3, 0.3, 0.022, 0.08, 0.008);
    bump.rotateX(-Math.PI / 2);
    return { body: b, glass: roundRect(PHONE.w - 0.012, PHONE.h - 0.012, PHONE.r - 0.006), panel: roundRect(sw, sh, PHONE.r - PHONE.inset), bump };
  }, []);
  useMotion3D((t) => {
    if (!ref.current) return;
    ref.current.matrix.copy(rig.root(t));
    ref.current.matrixWorldNeedsUpdate = true;
  });
  const z = PHONE.t / 2;
  return (
    <group ref={ref} matrixAutoUpdate={false}>
      <mesh geometry={geo.body}><meshPhysicalMaterial {...body} /></mesh>
      <mesh geometry={geo.glass} position-z={z + 0.0008} userData={{ shadow: false }}>
        <meshPhysicalMaterial color="#040406" roughness={0.08} clearcoat={1} />
      </mesh>
      <mesh geometry={geo.panel} position-z={z + 0.0014} userData={{ shadow: false }}>
        <meshBasicMaterial color={new THREE.Color(screen).multiplyScalar(1 + glow)} />
      </mesh>
      <group position={[-PHONE.w / 2 + 0.2, PHONE.h / 2 - 0.2, -z]}>
        <mesh geometry={geo.bump}><meshPhysicalMaterial {...body} roughness={0.15} /></mesh>
        {([[-0.06, 0.06], [0.06, -0.06], [-0.06, -0.06]] as [number, number][]).map(([x, y], i) => (
          <group key={i} position={[x, y, -0.022]} rotation-x={Math.PI / 2}>
            <mesh><cylinderGeometry args={[0.045, 0.048, 0.02, 24]} /><meshPhysicalMaterial {...materials.anodized('#202026')} /></mesh>
            <mesh position-y={-0.011}><cylinderGeometry args={[0.03, 0.03, 0.004, 24]} /><meshPhysicalMaterial color="#05060A" roughness={0.05} clearcoat={1} /></mesh>
          </group>
        ))}
      </group>
      {[0.32, 0.12].map((y) => (
        <mesh key={y} position={[PHONE.w / 2 + 0.004, y, 0]}><boxGeometry args={[0.012, 0.13, 0.03]} /><meshPhysicalMaterial {...body} /></mesh>
      ))}
    </group>
  );
};
