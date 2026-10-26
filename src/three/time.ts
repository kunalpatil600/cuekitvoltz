import { createContext, useContext, useLayoutEffect, useRef } from 'react';
import type { Motion } from '../core/motion';
import type { V3 } from '../world/iso/project';

// 3D motion is data too: objects don't read the frame during React render, they register an
// `apply(t)` callback. The scene's renderer calls every callback at each sub-frame time of the
// shutter, renders, and averages the samples: true 3D motion blur from the same Motion functions.

/** A number or a Motion of one. */
export type N = number | Motion<number>;
/** A 3D vector whose components may each be animated. */
export type V3M = [N, N, N];

export const num = (v: N, t: number) => (typeof v === 'number' ? v : v(t));
export const vec = (v: V3M, t: number): V3 => [num(v[0], t), num(v[1], t), num(v[2], t)];
export const DEG = Math.PI / 180;

type Apply = (t: number) => void;
export type Time3DRegistry = { add: (fn: Apply) => () => void; run: (t: number) => void };

export const makeRegistry = (): Time3DRegistry => {
  const fns = new Set<Apply>();
  return {
    add: (fn) => {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    run: (t) => fns.forEach((fn) => fn(t)),
  };
};

export const Time3DContext = createContext<Time3DRegistry | null>(null);

/** Runs `apply(t)` before every sample the scene renders (t is a fractional frame). */
export const useMotion3D = (apply: Apply) => {
  const ref = useRef(apply);
  ref.current = apply;
  const reg = useContext(Time3DContext);
  useLayoutEffect(() => reg?.add((t) => ref.current(t)), [reg]);
};
