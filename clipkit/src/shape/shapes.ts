import { random } from 'remotion';
import { makeCircle, makeHeart, makePolygon, makeRect, makeStar } from '@remotion/shapes';
import type { Pt } from './points';

/** Ready-made outlines (SVG path strings) for reveals and morphs. */
export const shapes = {
  circle: (r = 100) => makeCircle({ radius: r }).path,
  roundRect: (w = 200, h = 200, r = 40) => makeRect({ width: w, height: h, cornerRadius: r }).path,
  star: (points = 5, outer = 100, inner = 46, corner = 8) => makeStar({ points, outerRadius: outer, innerRadius: inner, cornerRadius: corner }).path,
  heart: (h = 200) => makeHeart({ height: h }).path,
  polygon: (points = 6, r = 100, corner = 10) => makePolygon({ points, radius: r, cornerRadius: corner }).path,
};

/** A rounded rectangle path in absolute coordinates (for clip-path: path()). */
export const roundRectPath = (x: number, y: number, w: number, h: number, r = 0) => {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${x + k},${y}H${x + w - k}A${k},${k} 0 0 1 ${x + w},${y + k}V${y + h - k}A${k},${k} 0 0 1 ${x + w - k},${y + h}H${x + k}A${k},${k} 0 0 1 ${x},${y + h - k}V${y + k}A${k},${k} 0 0 1 ${x + k},${y}Z`;
};

/**
 * An organic blob outline of `n` points around (x, y): radius r, wobble as a fraction of r. `t` moves
 * the wobble (pass a frame- or progress-based value); `seed` picks the blob's character.
 */
export const blobPoints = ({ x, y, r, wobble = 0.12, t = 0, seed = 'blob', n = 96 }: { x: number; y: number; r: number; wobble?: number; t?: number; seed?: string; n?: number }): Pt[] => {
  const waves = [2, 3, 5].map((k, i) => ({ k, amp: 1 / (i + 1.4), phase: random(`${seed}-p${i}`) * Math.PI * 2, speed: 0.6 + random(`${seed}-s${i}`) * 0.8 }));
  const norm = waves.reduce((s, w) => s + w.amp, 0);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const wave = waves.reduce((s, w) => s + w.amp * Math.sin(w.k * a + w.phase + w.speed * t), 0) / norm;
    const rr = r * (1 + wobble * wave);
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr] as Pt;
  });
};
