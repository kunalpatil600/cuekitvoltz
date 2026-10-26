import { random } from 'remotion';
import type { Motion } from '../../core/motion';
import { clamp, lerp } from '../../core/motion';
import { follow } from '../../motion/principles';
import { springValue, springs } from '../../motion/spring';
import type { SpringConfig } from '../../motion/spring';

// A front-facing 2D character rig. Angles are in degrees and "outward-positive" on both sides:
// 0 hangs straight down, + swings away from the body, − across it; each limb is [upper, lower]
// with the lower angle relative to the upper. That keeps poses mirror-symmetric.
export type Limb = [number, number];
export type Pose = { armL: Limb; armR: Limb; legL: Limb; legR: Limb; lean: number; head: number; lift: number; shrug: number };
export type Face = { eyes: 'open' | 'happy' | 'closed' | 'wide'; mouth: 'smile' | 'grin' | 'flat' | 'o' | 'frown'; brows: number };

const rest: Pose = { armL: [8, -8], armR: [8, -8], legL: [3, -2], legR: [3, -2], lean: 0, head: 0, lift: 0, shrug: 0 };
/** Pose library ("R" is the arm on screen-right). Faces are the natural expression for each. */
export const poses = {
  idle: { pose: rest, face: { eyes: 'open', mouth: 'smile', brows: 0 } },
  wave: { pose: { ...rest, armR: [150, 30], head: 6 }, face: { eyes: 'happy', mouth: 'grin', brows: 0.4 } },
  point: { pose: { ...rest, armR: [94, 2], lean: 3, head: -4 }, face: { eyes: 'open', mouth: 'smile', brows: 0.3 } },
  think: { pose: { ...rest, armR: [-60, -120], armL: [-24, -62], head: 9 }, face: { eyes: 'open', mouth: 'flat', brows: -0.3 } },
  type: { pose: { ...rest, armL: [-10, -28], armR: [-10, -28], head: -6, lean: 2 }, face: { eyes: 'open', mouth: 'flat', brows: -0.1 } },
  shrug: { pose: { ...rest, armL: [38, 74], armR: [38, 74], shrug: 14, head: 8 }, face: { eyes: 'wide', mouth: 'o', brows: 1 } },
  cheer: { pose: { ...rest, armL: [160, 14], armR: [160, 14], lift: 26 }, face: { eyes: 'happy', mouth: 'grin', brows: 0.6 } },
  present: { pose: { ...rest, armL: [56, 34], head: -5, lean: -2 }, face: { eyes: 'open', mouth: 'smile', brows: 0.3 } },
} satisfies Record<string, { pose: Pose; face: Face }>;
export type PoseName = keyof typeof poses;

const mixLimb = (a: Limb, b: Limb, t: number): Limb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  armL: mixLimb(a.armL, b.armL, t), armR: mixLimb(a.armR, b.armR, t), legL: mixLimb(a.legL, b.legL, t), legR: mixLimb(a.legR, b.legR, t),
  lean: lerp(a.lean, b.lean, t), head: lerp(a.head, b.head, t), lift: lerp(a.lift, b.lift, t), shrug: lerp(a.shrug, b.shrug, t),
});
const addLimb = (a: Limb, b?: Limb): Limb => (b ? [a[0] + b[0], a[1] + b[1]] : a);
/** A pose plus partial offsets (from gestures). */
export const addPose = (a: Pose, b: Partial<Pose>): Pose => ({
  armL: addLimb(a.armL, b.armL), armR: addLimb(a.armR, b.armR), legL: addLimb(a.legL, b.legL), legR: addLimb(a.legR, b.legR),
  lean: a.lean + (b.lean ?? 0), head: a.head + (b.head ?? 0), lift: a.lift + (b.lift ?? 0), shrug: a.shrug + (b.shrug ?? 0),
});

export type PoseKey = { at: number; pose: PoseName | Pose; face?: Partial<Face>; spring?: SpringConfig };

/**
 * A performance: poses keyed in time, each reached on its spring, with follow-through built in
 * (elbows, knees and the head trail the move and overshoot, the head lags the body's lean). Faces
 * switch as each pose lands (a key's `face` overrides the pose's own).
 */
export const performance = (keys: PoseKey[], fps: number, drag = 1) => {
  const resolved = keys.map((k) => {
    const lib = typeof k.pose === 'string' ? poses[k.pose] : undefined;
    return { ...k, pose: lib ? lib.pose : (k.pose as Pose), face: { ...(lib?.face ?? poses.idle.face), ...k.face } as Face };
  });
  const base: Motion<Pose> = (f) => {
    let cur = resolved[0].pose;
    for (const k of resolved.slice(1)) {
      if (f <= k.at) break;
      cur = lerpPose(cur, k.pose, springValue((f - k.at) / fps, k.spring ?? springs.smooth));
    }
    return cur;
  };
  const chase = (get: (p: Pose) => number) => follow((f) => get(base(f)), { fps, duration: 0.32, bounce: 0.45 });
  const eL = chase((p) => p.armL[1]), eR = chase((p) => p.armR[1]), kL = chase((p) => p.legL[1]), kR = chase((p) => p.legR[1]);
  const hd = chase((p) => p.head), ln = chase((p) => p.lean);
  const pose: Motion<Pose> = (f) => {
    const p = base(f);
    return {
      ...p,
      armL: [p.armL[0], lerp(p.armL[1], eL(f), drag)], armR: [p.armR[0], lerp(p.armR[1], eR(f), drag)],
      legL: [p.legL[0], lerp(p.legL[1], kL(f), drag)], legR: [p.legR[0], lerp(p.legR[1], kR(f), drag)],
      head: lerp(p.head, hd(f), drag) + (p.lean - ln(f)) * 0.8 * drag,
    };
  };
  const face = (f: number): Face => {
    let cur = resolved[0].face;
    for (const k of resolved.slice(1)) if (f >= k.at + 3) cur = k.face;
    return cur;
  };
  return { pose, face };
};

const inWindow = (f: number, from: number, to: number, ramp = 6) => clamp((f - from) / ramp) * clamp((to - f) / ramp);

/** Gestures: offsets to add on top of a performance (they fade in and out over their window). */
export const gestures = {
  wave: ({ from, to, speed = 0.5 }: { from: number; to: number; speed?: number }): Motion<Partial<Pose>> => (f) => ({ armR: [0, 24 * Math.sin((f - from) * speed) * inWindow(f, from, to)] }),
  typing: ({ from, to }: { from: number; to: number }): Motion<Partial<Pose>> => (f) => {
    const w = inWindow(f, from, to, 4);
    return { armL: [0, 8 * Math.sin(f * 1.5) * w], armR: [0, 8 * Math.sin(f * 1.5 + Math.PI) * w] };
  },
  /** A bouncy walk in place: alternating steps, body bob, arm swing. Move the character's x alongside. */
  walk: ({ from, to, speed = 0.42 }: { from: number; to: number; speed?: number }): Motion<Partial<Pose>> => (f) => {
    const w = inWindow(f, from, to, 5), s = Math.sin((f - from) * speed);
    return { legL: [Math.max(0, s) * 10 * w, -Math.max(0, s) * 22 * w], legR: [Math.max(0, -s) * 10 * w, -Math.max(0, -s) * 22 * w], armL: [-s * 14 * w, 0], armR: [s * 14 * w, 0], lift: Math.abs(s) * 9 * w };
  },
  nod: ({ at }: { at: number }): Motion<Partial<Pose>> => (f) => ({ head: f < at ? 0 : -10 * Math.sin(Math.min(Math.PI * 2, (f - at) * 0.45)) * Math.exp(-(f - at) * 0.05) }),
};

/** A performance with gestures layered on. */
export const withGestures = (pose: Motion<Pose>, ...layers: Motion<Partial<Pose>>[]): Motion<Pose> => (f) => layers.reduce((p, g) => addPose(p, g(f)), pose(f));

/** Eye openness 1 → 0 → 1: a 6-frame blink every 2.3–4.3 s at 30 fps, at seeded times. */
export const blinkAt = (f: number, seed: string) => {
  let t = 40 * random(`${seed}-b0`);
  for (let i = 1; t <= f; i++) {
    if (f < t + 6) return Math.abs(f - t - 3) / 3;
    t += 70 + random(`${seed}-b${i}`) * 60;
  }
  return 1;
};
