import React from 'react';
import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import type { Motion } from '../core/motion';
import { alignTo, pathPoints, smoothPath } from './points';
import type { Pt } from './points';

/** The outline between path `a` (t = 0) and path `b` (t = 1), as a smooth path. t may overshoot. */
export const morph = (a: string, b: string, t: number, n = 128): string => {
  const pa = pathPoints(a, n);
  const pb = alignTo(pa, pathPoints(b, n), `${n}|${a}|${b}`);
  return smoothPath(pa.map(([x, y], i): Pt => [x + (pb[i][0] - x) * t, y + (pb[i][1] - y) * t]));
};

/**
 * An SVG shape that morphs through `paths`: `at` is a motion over 0 … paths.length - 1. Paths are
 * matched point for point (start point and direction aligned), so any two outlines morph cleanly.
 * Drive it with non-bouncy springs (springs.smooth): an overshoot would lean the shape toward the
 * next outline. Put the bounce on scale instead (wrap it in a Move).
 */
export const Morph: React.FC<{
  paths: string[]; at: Motion; width: number; height: number; viewBox?: string;
  fill?: string; stroke?: string; strokeWidth?: number; style?: CSSProperties;
}> = ({ paths, at, width, height, viewBox, fill = 'currentColor', stroke, strokeWidth, style }) => {
  const v = at(useCurrentFrame());
  const i = Math.max(0, Math.min(paths.length - 2, Math.floor(v)));
  const t = Math.max(0, Math.min(1, v - i));
  return (
    <svg width={width} height={height} viewBox={viewBox ?? `0 0 ${width} ${height}`} style={{ overflow: 'visible', ...style }}>
      <path d={morph(paths[i], paths[i + 1] ?? paths[i], t)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
};
