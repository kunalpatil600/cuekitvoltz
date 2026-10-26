import { getLength, getPointAtLength, getSubpaths } from '@remotion/paths';

// Shapes as point lists: any SVG path (first subpath) resampled to N evenly spaced points. That makes
// any two shapes morphable, lets reveals scale and spin a shape around its center, and keeps it all
// pure JS (no DOM), so every frame renders identically.
export type Pt = [number, number];

const cache = new Map<string, Pt[]>();

/** `n` points evenly spaced along the outline of the path's first subpath (cached). */
export const pathPoints = (d: string, n = 128): Pt[] => {
  const key = `${n}|${d}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sub = getSubpaths(d)[0] ?? d;
  const len = getLength(sub);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = getPointAtLength(sub, (len * i) / n);
    if (p) pts.push([p.x, p.y]);
  }
  cache.set(key, pts);
  return pts;
};

export const centroid = (pts: Pt[]): Pt => {
  let x = 0, y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
};

/** Points moved so the centroid sits at (0, 0) and scaled so the outline's nearest point is 1 away. */
export const unitShape = (pts: Pt[]): Pt[] => {
  const [cx, cy] = centroid(pts);
  const inner = Math.min(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  return pts.map(([x, y]) => [(x - cx) / inner, (y - cy) / inner]);
};

/** Scale by `s`, rotate by `deg` and move to (x, y). */
export const placePoints = (pts: Pt[], x: number, y: number, s: number, deg = 0): Pt[] => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a) * s, si = Math.sin(a) * s;
  return pts.map(([px, py]) => [x + px * c - py * si, y + px * si + py * c]);
};

const sqDist = (a: Pt[], b: Pt[], shift: number, dir: 1 | -1) => {
  const n = a.length;
  let d = 0;
  for (let i = 0; i < n; i++) {
    const q = b[(((shift + dir * i) % n) + n) % n];
    d += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2;
  }
  return d;
};

const aligned = new Map<string, Pt[]>();

/** `b` re-ordered (start point and direction) to sit as close to `a` as possible, point for point. */
export const alignTo = (a: Pt[], b: Pt[], key?: string): Pt[] => {
  const hit = key ? aligned.get(key) : undefined;
  if (hit) return hit;
  const n = a.length;
  let best = { d: Infinity, shift: 0, dir: 1 as 1 | -1 };
  for (const dir of [1, -1] as const) {
    for (let shift = 0; shift < n; shift++) {
      const d = sqDist(a, b, shift, dir);
      if (d < best.d) best = { d, shift, dir };
    }
  }
  const out = a.map((_, i) => b[(((best.shift + best.dir * i) % n) + n) % n]);
  if (key) aligned.set(key, out);
  return out;
};

/** A closed, smooth path through the points (Catmull-Rom as cubic Béziers). */
export const smoothPath = (pts: Pt[]): string => {
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d}Z`;
};

/** A closed polygon through the points (keeps corners sharp). */
export const polygonPath = (pts: Pt[]): string => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;
