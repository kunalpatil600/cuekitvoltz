import { Easing } from 'remotion';

export type EaseFn = (t: number) => number;

/**
 * Named curves: `out` for entrances, `in` for exits, `inOut` for moves between two rests.
 * Out-curves start at full speed, which reads as a jump when the element starts on screen: use a
 * spring (it can start from rest) or let motion blur carry the first frames.
 */
export const ease = {
  linear: (t: number) => t,
  out: Easing.bezier(0.22, 1, 0.36, 1),
  in: Easing.bezier(0.64, 0, 0.78, 0),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  expoIn: Easing.bezier(0.7, 0, 0.84, 0),
  /** Whip-pan timing: almost still at both ends, all the travel in the middle. */
  expoInOut: Easing.bezier(0.87, 0, 0.13, 1),
  /** Overshoots its target by ~10% and comes back. */
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  /** Pulls back ~10% before leaving. */
  backIn: Easing.bezier(0.36, 0, 0.66, -0.56),
} satisfies Record<string, EaseFn>;
