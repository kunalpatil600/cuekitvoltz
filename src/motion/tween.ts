import type { Motion } from '../core/motion';
import { clamp } from '../core/motion';
import { ease } from './ease';
import type { EaseFn } from './ease';

/** `from` → `to` over `dur` frames starting at `at`, eased. Holds `from` before and `to` after. */
export const tween = ({ at, dur, from = 0, to = 1, ease: curve = ease.out }: { at: number; dur: number; from?: number; to?: number; ease?: EaseFn }): Motion =>
  (f) => from + (to - from) * curve(clamp((f - at) / Math.max(1e-6, dur)));

/** Keyframes [frame, value, ease?]: each segment eases with its end key's curve (default `curve`). */
export const keys = (pts: [frame: number, value: number, ease?: EaseFn][], curve: EaseFn = ease.inOut): Motion => (f) => {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [f1, v1, e] = pts[i];
    if (f <= f1) {
      const [f0, v0] = pts[i - 1];
      return v0 + (v1 - v0) * (e ?? curve)((f - f0) / Math.max(1e-6, f1 - f0));
    }
  }
  return pts[pts.length - 1][1];
};

/** Sum of motions: layer an exit, a wind-up or a wobble on top of an entrance. */
export const add = (...ms: Motion[]): Motion => (f) => ms.reduce((s, m) => s + m(f), 0);
export const delay = (m: Motion, frames: number): Motion => (f) => m(f - frames);
export const constant = (v: number): Motion => () => v;
