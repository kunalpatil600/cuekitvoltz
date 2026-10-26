import type { Motion } from '../core/motion';

// Springs in closed form, so they're exact at fractional frames (motion blur samples between frames)
// and cost the same at frame 5 as at frame 5000. Parameterized like SwiftUI: `duration` is the
// perceived length in seconds, `bounce` 0 = no overshoot (critically damped), 0.3 = lively,
// 0.5+ = wobbly, negative = sluggish (overdamped). `velocity` is the starting speed in move-lengths
// per second: an element entering from off-screen was already moving, so give it some.
export type SpringConfig = { duration: number; bounce?: number; velocity?: number };

export const springs = {
  snappy: { duration: 0.35, bounce: 0.12 },
  smooth: { duration: 0.5, bounce: 0 },
  gentle: { duration: 0.8, bounce: 0 },
  bouncy: { duration: 0.55, bounce: 0.35 },
  wobbly: { duration: 0.75, bounce: 0.5 },
  heavy: { duration: 0.9, bounce: 0.06 },
  pop: { duration: 0.3, bounce: 0.28 },
} satisfies Record<string, SpringConfig>;
export type SpringName = keyof typeof springs;

/** Progress 0 → 1 of a mass-1 spring released at t = 0 (seconds). */
export const springValue = (t: number, { duration, bounce = 0, velocity = 0 }: SpringConfig) => {
  if (t <= 0) return 0;
  const w0 = (2 * Math.PI) / duration;
  const zeta = bounce >= 0 ? 1 - bounce : 1 / (1 + bounce);
  // displacement from the target: y(0) = -1, y'(0) = velocity
  if (Math.abs(zeta - 1) < 1e-6) return 1 + Math.exp(-w0 * t) * (-1 + (velocity - w0) * t);
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 + Math.exp(-zeta * w0 * t) * (-Math.cos(wd * t) + ((velocity - zeta * w0) / wd) * Math.sin(wd * t));
  }
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - s), r2 = -w0 * (zeta + s);
  const c2 = (velocity + r1) / (r2 - r1);
  return 1 + (-1 - c2) * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
};

/** A spring from `from` to `to`, released at frame `at`. */
export const spring = ({ at, fps, from = 0, to = 1, ...cfg }: { at: number; fps: number; from?: number; to?: number } & SpringConfig): Motion =>
  (f) => from + (to - from) * springValue((f - at) / fps, cfg);

/** Frames until the spring stays within `eps` of its target (for scheduling what comes next). */
export const springFrames = (cfg: SpringConfig, fps: number, eps = 0.002) => {
  let last = 0;
  for (let f = 1; f <= fps * 10; f++) if (Math.abs(1 - springValue(f / fps, cfg)) > eps) last = f;
  return last + 1;
};
