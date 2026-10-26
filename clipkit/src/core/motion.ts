// Everything animated in the kit is a pure function of the frame. That keeps motion inspectable
// (sample it, graph it, onion-skin it) and lets later layers read speed and direction (motion blur,
// squash and stretch) straight from the function, without tracking state between frames.

/** A value as a pure function of the frame. */
export type Motion<T = number> = (frame: number) => T;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Speed in units per frame, measured over the last `dt` frames (0.5 matches a 180° shutter). */
export const velocity = (m: Motion, frame: number, dt = 0.5) => (m(frame) - m(frame - dt)) / dt;

/** [frame, value] pairs from `from` to `to`, inclusive. */
export const sample = (m: Motion, from: number, to: number, step = 1): [number, number][] => {
  const out: [number, number][] = [];
  for (let f = from; f <= to + 1e-9; f += step) out.push([f, m(f)]);
  return out;
};
