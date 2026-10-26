import { random } from 'remotion';
import type { Motion } from '../core/motion';
import { ease } from './ease';
import type { EaseFn } from './ease';

// The animation principles that separate designed motion from interpolation, as small motions to
// add() onto a move, or as helpers for timing groups.

/** Anticipation: eases to `by` over `frames` before `at`, then lets go as the main move starts. Add it to the move. */
export const windup = ({ at, by, frames = 6, release = 4 }: { at: number; by: number; frames?: number; release?: number }): Motion => (f) => {
  if (f <= at - frames || f >= at + release) return 0;
  if (f <= at) return by * ease.inOut((f - (at - frames)) / frames);
  return by * (1 - ease.out((f - at) / release));
};

/**
 * Follow-through and drag: a value that chases `target` like a mass on a spring, so it trails behind
 * a move and overshoots when the move stops. Use it for anything attached to a moving parent
 * (a card's contents, a label under an icon, a trailing chip). Simulated from frame `from` with 8
 * substeps per frame and cached, so evaluating any frame stays cheap and deterministic.
 */
export const follow = (target: Motion, { fps, duration = 0.45, bounce = 0.35, from = 0 }: { fps: number; duration?: number; bounce?: number; from?: number }): Motion => {
  const w0 = (2 * Math.PI) / duration;
  const zeta = bounce >= 0 ? 1 - bounce : 1 / (1 + bounce);
  const SUB = 8, dt = 1 / fps / SUB;
  const xs = [target(from)], vs = [0];
  const run = (x: number, v: number, f0: number, steps: number) => {
    for (let s = 1; s <= steps; s++) {
      v += (w0 * w0 * (target(f0 + s / SUB) - x) - 2 * zeta * w0 * v) * dt;
      x += v * dt;
    }
    return [x, v];
  };
  return (f) => {
    if (f <= from) return target(f);
    const n = Math.floor(f - from);
    while (xs.length <= n) {
      const i = xs.length - 1;
      const [x, v] = run(xs[i], vs[i], from + i, SUB);
      xs.push(x);
      vs.push(v);
    }
    const steps = Math.round((f - from - n) * SUB);
    return steps ? run(xs[n], vs[n], from + n, steps)[0] : xs[n];
  };
};

export type StaggerFrom = 'start' | 'end' | 'center' | 'edges' | 'random';

/**
 * Delay in frames for item `i` of `n`: `each` frames apart, rippling from the start, end, center,
 * edges or in a seeded random order. `ease` bends the spacing (ease.in = slow start, quick finish).
 */
export const stagger = (i: number, n: number, { each, from = 'start', ease: curve = ease.linear, seed = 'stagger' }: { each: number; from?: StaggerFrom; ease?: EaseFn; seed?: string }) => {
  if (n <= 1) return 0;
  const mid = (n - 1) / 2;
  let rank: number;
  if (from === 'start') rank = i / (n - 1);
  else if (from === 'end') rank = 1 - i / (n - 1);
  else if (from === 'center') rank = Math.abs(i - mid) / mid;
  else if (from === 'edges') rank = 1 - Math.abs(i - mid) / mid;
  else rank = [...Array(n).keys()].sort((a, b) => random(`${seed}-${a}`) - random(`${seed}-${b}`)).indexOf(i) / (n - 1);
  const span = from === 'center' || from === 'edges' ? each * mid : each * (n - 1);
  return span * curve(rank);
};

/**
 * Squash and stretch from velocity (px/frame): longer along the direction of travel, thinner across
 * it (area kept). `amount` 0.002 is subtle, 0.006 cartoony; `max` caps the stretch.
 */
export const stretchFor = (vx: number, vy: number, amount = 0.002, max = 0.3) => {
  const along = 1 + Math.min(max, Math.hypot(vx, vy) * amount);
  return { angle: (Math.atan2(vy, vx) * 180) / Math.PI, along, across: 1 / along };
};
