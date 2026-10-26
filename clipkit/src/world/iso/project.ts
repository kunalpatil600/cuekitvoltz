import { createContext, useContext } from 'react';
import { shade } from '../../core/color';

// Isometric projection (30°): world x runs right-down, y left-down, z up. One world unit is `unit` px.
// The projection is a uniformly scaled orthographic view (scale √1.5), so spheres stay round and a
// circle on the ground becomes an axis-aligned ellipse 1.22 r wide and 0.71 r tall.
export type V3 = [number, number, number];
export type IsoView = { ox: number; oy: number; unit: number; light: V3 };

export const ISO_C = Math.cos(Math.PI / 6);
export const ISO_S = 0.5;
/** Screen size of one world unit along any direction (the projection's scale). */
export const ISO_K = Math.sqrt(1.5);

const norm = (v: V3): V3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** The view: where world (0, 0, 0) lands on screen, px per unit, and where the light comes from. */
export const isoView = ({ origin, unit = 100, light = [0.3, 0.55, 0.78] }: { origin: [number, number]; unit?: number; light?: V3 }): IsoView => ({
  ox: origin[0], oy: origin[1], unit, light: norm(light),
});

export const project = (v: IsoView, [x, y, z]: V3): [number, number] => [v.ox + (x - y) * ISO_C * v.unit, v.oy + ((x + y) * ISO_S - z) * v.unit];

/** SVG `points` for a list of world points. */
export const pts = (v: IsoView, list: V3[]) => list.map((p) => project(v, p).map((n) => n.toFixed(1)).join(',')).join(' ');

/** How much light a face with normal `n` catches (0–1). */
export const lightOn = (v: IsoView, n: V3) => Math.max(0, n[0] * v.light[0] + n[1] * v.light[1] + n[2] * v.light[2]);

/** A base color shaded for a face: tops come out lighter, the face away from the light darker. */
export const faceColor = (v: IsoView, base: string, n: V3) => shade(base, 0.55 + 0.75 * lightOn(v, n));

/** Painter's order: things nearer the viewer (larger x + y) draw later. */
export const isoDepth = (x: number, y: number, z = 0, w = 1, d = 1) => x + w / 2 + y + d / 2 + z * 0.01;

export const IsoContext = createContext<(IsoView & { soft: string; id: string }) | null>(null);
export const useIso = () => {
  const v = useContext(IsoContext);
  if (!v) throw new Error('iso objects must be inside <IsoScene>');
  return v;
};
