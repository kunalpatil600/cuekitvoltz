import React, { useId } from 'react';
import { useCurrentFrame } from 'remotion';
import { shade } from '../../core/color';
import { clamp } from '../../core/motion';
import type { Motion } from '../../core/motion';
import { cssId } from '../../motion/smear';
import { ISO_C, ISO_K, ISO_S, faceColor, project, pts, useIso } from './project';
import type { V3 } from './project';

/** Entrance controls every iso object takes: `rise` grows the height 0 → 1 (a spring overshoots into a bounce), `lift` raises it in world units. */
export type IsoAnim = { rise?: Motion; lift?: Motion };

export const useIsoAnim = ({ rise, lift }: IsoAnim) => {
  const f = useCurrentFrame();
  const g = rise ? Math.max(0, rise(f)) : 1;
  return { g, dz: lift ? lift(f) : 0, opacity: rise ? clamp(g * 3) : 1 };
};

export type BoxGeom = { x: number; y: number; z: number; w: number; d: number; h: number };
export type BoxFace = 'top' | 'left' | 'right';

/**
 * A point on a box face from face coordinates: on the side faces u runs left → right on screen and
 * v bottom → top; on the top face u runs along x and v along y. ("left" is the +y face, "right" +x.)
 */
export const onFace = (b: BoxGeom, face: BoxFace, u: number, v: number): V3 =>
  face === 'top' ? [b.x + u * b.w, b.y + v * b.d, b.z + b.h]
    : face === 'left' ? [b.x + u * b.w, b.y + b.d, b.z + v * b.h]
      : [b.x + b.w, b.y + (1 - u) * b.d, b.z + v * b.h];

/** The rectangle u0…u1 × v0…v1 on a face, as four world points. */
export const faceRect = (b: BoxGeom, face: BoxFace, u0: number, v0: number, u1: number, v1: number): V3[] =>
  [onFace(b, face, u0, v0), onFace(b, face, u1, v0), onFace(b, face, u1, v1), onFace(b, face, u0, v1)];

const NORMAL: Record<BoxFace, V3> = { top: [0, 0, 1], left: [0, 1, 0], right: [1, 0, 0] };

/** A flat polygon in world space, filled with `color` shaded as if it faced `face`. */
export const IsoQuad: React.FC<{ points: V3[]; color: string; face?: BoxFace; flat?: boolean; opacity?: number; stroke?: string }> = ({ points, color, face = 'top', flat, opacity, stroke }) => {
  const v = useIso();
  return <polygon points={pts(v, points)} fill={flat ? color : faceColor(v, color, NORMAL[face])} opacity={opacity} stroke={stroke} strokeWidth={stroke ? 1.5 : undefined} strokeLinejoin="round" />;
};

/** A box: three visible faces shaded by the light, with a light edge along its front top edges. */
export const IsoBox: React.FC<BoxGeom & { color: string; edge?: boolean; opacity?: number }> = ({ x, y, z, w, d, h, color, edge = true, opacity }) => {
  const v = useIso();
  if (h <= 0.0005) return null;
  const b = { x, y, z, w, d, h };
  return (
    <g opacity={opacity} strokeLinejoin="round">
      <polygon points={pts(v, faceRect(b, 'left', 0, 0, 1, 1))} fill={faceColor(v, color, NORMAL.left)} />
      <polygon points={pts(v, faceRect(b, 'right', 0, 0, 1, 1))} fill={faceColor(v, color, NORMAL.right)} />
      <polygon points={pts(v, faceRect(b, 'top', 0, 0, 1, 1))} fill={faceColor(v, color, NORMAL.top)} />
      {edge && (
        <polyline points={pts(v, [onFace(b, 'top', 0, 1), onFace(b, 'top', 1, 1), onFace(b, 'top', 1, 0)])} fill="none" stroke={shade(color, 1.45)} strokeWidth={1.6} strokeOpacity={0.7} />
      )}
    </g>
  );
};

/** A soft contact shadow on the ground under a w × d footprint (or an ellipse of radius r). */
export const IsoShadow: React.FC<{ x: number; y: number; w?: number; d?: number; r?: number; opacity?: number; spread?: number }> = ({ x, y, w = 1, d = 1, r, opacity = 0.45, spread = 0.08 }) => {
  const v = useIso();
  if (r !== undefined) {
    const [cx, cy] = project(v, [x + r, y + r, 0]);
    return <ellipse cx={cx} cy={cy} rx={(r + spread) * ISO_C * Math.SQRT2 * v.unit} ry={(r + spread) * ISO_S * Math.SQRT2 * v.unit} fill="#000" opacity={opacity} filter={`url(#${v.soft})`} />;
  }
  const s = spread;
  return <polygon points={pts(v, [[x - s, y - s, 0], [x + w + s, y - s, 0], [x + w + s, y + d + s, 0], [x - s, y + d + s, 0]])} fill="#000" opacity={opacity} filter={`url(#${v.soft})`} />;
};

/** An upright cylinder over a 2r × 2r footprint at (x, y): shaded body, lit top, optional ring lines. */
export const IsoCylinder: React.FC<{ x: number; y: number; z: number; r: number; h: number; color: string; rings?: number[]; ringColor?: string; opacity?: number }> = ({ x, y, z, r, h, color, rings = [], ringColor, opacity }) => {
  const v = useIso();
  const gid = cssId('cyl', useId());
  if (h <= 0.0005) return null;
  const cx = x + r, cy = y + r;
  const rx = r * ISO_C * Math.SQRT2 * v.unit, ry = r * ISO_S * Math.SQRT2 * v.unit;
  const [tx, ty] = project(v, [cx, cy, z + h]);
  const [, by] = project(v, [cx, cy, z]);
  const f = (n: number) => n.toFixed(1);
  const body = `M${f(tx - rx)},${f(ty)}L${f(tx - rx)},${f(by)}A${f(rx)},${f(ry)} 0 0 0 ${f(tx + rx)},${f(by)}L${f(tx + rx)},${f(ty)}A${f(rx)},${f(ry)} 0 0 1 ${f(tx - rx)},${f(ty)}Z`;
  return (
    <g opacity={opacity}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={faceColor(v, color, [0, 1, 0])} />
          <stop offset="0.4" stopColor={shade(faceColor(v, color, [0, 1, 0]), 1.08)} />
          <stop offset="1" stopColor={faceColor(v, color, [1, 0, 0])} />
        </linearGradient>
      </defs>
      <path d={body} fill={`url(#${gid})`} />
      {rings.map((t) => {
        const [, ry2] = project(v, [cx, cy, z + h * t]);
        return <path key={t} d={`M${f(tx - rx)},${f(ry2)}A${f(rx)},${f(ry)} 0 0 0 ${f(tx + rx)},${f(ry2)}`} fill="none" stroke={ringColor ?? shade(color, 0.55)} strokeWidth={2.5} />;
      })}
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={faceColor(v, color, [0, 0, 1])} />
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill="none" stroke={shade(color, 1.45)} strokeWidth={1.5} strokeOpacity={0.6} />
    </g>
  );
};

/** A sphere centered at (x, y, z), radius r: round on screen, highlight toward the light. */
export const IsoSphere: React.FC<{ x: number; y: number; z: number; r: number; color: string; opacity?: number }> = ({ x, y, z, r, color, opacity }) => {
  const v = useIso();
  const gid = cssId('sph', useId());
  const [cx, cy] = project(v, [x, y, z]);
  // where the light falls on screen, for the highlight
  const lx = (v.light[0] - v.light[1]) * ISO_C, ly = (v.light[0] + v.light[1]) * ISO_S - v.light[2];
  const l = Math.hypot(lx, ly) || 1;
  return (
    <g opacity={opacity}>
      <defs>
        <radialGradient id={gid} cx={0.5 + (lx / l) * 0.28} cy={0.5 + (ly / l) * 0.28} r="0.75">
          <stop offset="0" stopColor={shade(color, 1.25)} />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor={shade(color, 0.55)} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * ISO_K * v.unit} fill={`url(#${gid})`} />
    </g>
  );
};
