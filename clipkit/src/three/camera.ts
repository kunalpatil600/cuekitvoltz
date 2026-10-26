import { PerspectiveCamera, Vector3 } from 'three';
import { random } from 'remotion';
import type { V3 } from '../world/iso/project';
import { DEG, num, vec } from './time';
import type { N, V3M } from './time';

// The camera is a pure function of the frame. The same rig drives the WebGL camera (sampled at
// sub-frame times for motion blur) and the DOM overlays (screens, pins), so both always agree.

export type CamState = { position: V3; target: V3; fov: number; roll: number; focus: number };
export type CameraRig = (frame: number) => CamState;

export const CAM_NEAR = 0.05;
export const CAM_FAR = 200;

const dist3 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

type OrbitArgs = { target?: V3M; az?: N; el?: N; dist?: N; fov?: N; roll?: N; focus?: N };

/**
 * Orbit a target. `az`: degrees around the vertical axis (0 = front, positive = camera swings
 * right). `el`: degrees above the horizon. `dist`: distance. `focus` defaults to the target.
 */
export const orbit = ({ target = [0, 0, 0], az = 0, el = 12, dist = 6, fov = 30, roll = 0, focus }: OrbitArgs = {}): CameraRig => (f) => {
  const tg = vec(target, f);
  const a = num(az, f) * DEG;
  const e = num(el, f) * DEG;
  const d = num(dist, f);
  const position: V3 = [tg[0] + d * Math.cos(e) * Math.sin(a), tg[1] + d * Math.sin(e), tg[2] + d * Math.cos(e) * Math.cos(a)];
  return { position, target: tg, fov: num(fov, f), roll: num(roll, f), focus: focus === undefined ? d : num(focus, f) };
};

/** A camera placed directly at `position`, looking at `target`. */
export const lookAt = ({ position, target = [0, 0, 0], fov = 30, roll = 0, focus }: { position: V3M; target?: V3M; fov?: N; roll?: N; focus?: N }): CameraRig => (f) => {
  const p = vec(position, f);
  const tg = vec(target, f);
  return { position: p, target: tg, fov: num(fov, f), roll: num(roll, f), focus: focus === undefined ? dist3(p, tg) : num(focus, f) };
};

/**
 * Dolly zoom (the "vertigo" shot): distance and field of view trade off so the subject keeps its
 * size while the background stretches. `ref` = [distance, fov] at which the framing is defined.
 */
export const dollyZoom = ({ dist, ref, ...rest }: Omit<OrbitArgs, 'fov'> & { dist: N; ref: [number, number] }): CameraRig =>
  orbit({ ...rest, dist, fov: (f) => (2 * Math.atan((Math.tan((ref[1] / 2) * DEG) * ref[0]) / num(dist, f))) / DEG });

// smooth seeded noise in [-1, 1]: three incommensurate sines
const wobble = (seed: string, t: number) => {
  const parts: [number, number][] = [[0.031, 1], [0.073, 0.5], [0.149, 0.25]];
  return parts.reduce((v, [freq, amp], i) => v + amp * Math.sin(t * freq * Math.PI * 2 + random(`${seed}-${i}`) * Math.PI * 2), 0) / 1.75;
};

/** Adds a handheld feel to any rig: smooth, seeded drift of position, aim and roll. */
export const handheld = (rig: CameraRig, { amount = 1, speed = 1, seed = 'cam' }: { amount?: number; speed?: number; seed?: string } = {}): CameraRig => (f) => {
  const s = rig(f);
  const n = (k: number) => wobble(`${seed}${k}`, f * speed);
  const a = 0.025 * amount;
  return {
    ...s,
    position: [s.position[0] + n(0) * a, s.position[1] + n(1) * a, s.position[2] + n(2) * a * 0.5],
    target: [s.target[0] + n(3) * a * 0.6, s.target[1] + n(4) * a * 0.6, s.target[2]],
    roll: s.roll + n(5) * 0.4 * amount,
  };
};

const mix3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Blends two rigs (0 = a, 1 = b): moves between camera setups. */
export const mixRigs = (a: CameraRig, b: CameraRig, t: N): CameraRig => (f) => {
  const k = num(t, f);
  const sa = a(f);
  const sb = b(f);
  return {
    position: mix3(sa.position, sb.position, k), target: mix3(sa.target, sb.target, k),
    fov: sa.fov + (sb.fov - sa.fov) * k, roll: sa.roll + (sb.roll - sa.roll) * k, focus: sa.focus + (sb.focus - sa.focus) * k,
  };
};

/** Points a three.js camera at a rig state. */
export const applyCamera = (cam: PerspectiveCamera, s: CamState) => {
  cam.position.set(s.position[0], s.position[1], s.position[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(s.target[0], s.target[1], s.target[2]);
  if (s.roll) cam.rotateZ(s.roll * DEG);
  cam.fov = s.fov;
  cam.near = CAM_NEAR;
  cam.far = CAM_FAR;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
};

const probe = new PerspectiveCamera();
const tmp = new Vector3();

/** Where a world point lands on screen at `frame`: pixel x/y and its distance from the camera. */
export const projectPoint = (rig: CameraRig, frame: number, p: V3, width: number, height: number): { x: number; y: number; depth: number; front: boolean } => {
  probe.aspect = width / height;
  applyCamera(probe, rig(frame));
  tmp.set(p[0], p[1], p[2]).applyMatrix4(probe.matrixWorldInverse);
  const depth = -tmp.z;
  tmp.applyMatrix4(probe.projectionMatrix);
  return { x: (tmp.x * 0.5 + 0.5) * width, y: (0.5 - tmp.y * 0.5) * height, depth, front: depth > CAM_NEAR };
};
