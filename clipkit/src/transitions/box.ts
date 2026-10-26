import type { Motion } from '../core/motion';
import { clamp, lerp } from '../core/motion';
import { ease } from '../motion/ease';
import type { EaseFn } from '../motion/ease';
import { springValue } from '../motion/spring';
import type { SpringConfig } from '../motion/spring';

/** A rectangle on screen in px, with an optional corner radius. */
export type Box = { x: number; y: number; w: number; h: number; r?: number };

export const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t), r: lerp(a.r ?? 0, b.r ?? 0, t),
});

export type BoxKey = { at: number; box: Box; spring?: SpringConfig; ease?: EaseFn; dur?: number };

/**
 * A box that moves through keys: it holds the first key's box, and from each later key's `at` it
 * travels to that key's box on its spring (or over `dur` frames with `ease`). Springs overshoot.
 */
export const boxTrack = (keys: BoxKey[], fps: number): Motion<Box> => (f) => {
  let cur = keys[0].box;
  for (const k of keys.slice(1)) {
    if (f <= k.at) break;
    const t = k.spring ? springValue((f - k.at) / fps, k.spring) : (k.ease ?? ease.inOut)(clamp((f - k.at) / (k.dur ?? 20)));
    cur = lerpBox(cur, k.box, t);
  }
  return cur;
};
