import React, { useId } from 'react';
import type { CSSProperties } from 'react';
import { useVideoConfig } from 'remotion';
import { cssId } from '../../motion/smear';
import { IsoContext, isoDepth, pts, useIso } from './project';
import type { IsoView } from './project';

type Placed = { x?: number; y?: number; z?: number; w?: number; d?: number; depth?: number };

/**
 * A full-frame SVG stage for iso objects. Direct children are drawn in painter's order from their
 * x/y/z/w/d props (nearer = later); children without a position (grids, links) draw first in the
 * order given, then floor pieces (components marked `isoLayer: 'floor'`, like Platform), then
 * objects. Any child can force its place with `depth`.
 */
export const IsoScene: React.FC<{ view: IsoView; children: React.ReactNode; style?: CSSProperties }> = ({ view, children, style }) => {
  const { width, height } = useVideoConfig();
  const id = cssId('iso', useId());
  const items = (React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<Placed>[]).map((el, i) => {
    const p = el.props;
    const floor = (el.type as { isoLayer?: string }).isoLayer === 'floor';
    const k = p.depth ?? (p.x === undefined || p.y === undefined ? -1e6 : isoDepth(p.x, p.y, p.z, p.w, p.d) - (floor ? 1e5 : 0));
    return { el, i, k };
  });
  items.sort((a, b) => a.k - b.k || a.i - b.i);
  return (
    <IsoContext.Provider value={{ ...view, soft: `${id}-soft`, id }}>
      <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style }}>
        <defs>
          <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={view.unit * 0.09} />
          </filter>
        </defs>
        {items.map((o) => o.el)}
      </svg>
    </IsoContext.Provider>
  );
};

/** Ground grid lines over a w × d area starting at (x, y). */
export const IsoGrid: React.FC<{ x?: number; y?: number; w: number; d: number; step?: number; color?: string; depth?: number }> = ({ x = 0, y = 0, w, d, step = 1, color = 'rgba(255,255,255,0.07)' }) => {
  const v = useIso();
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= w / step + 1e-6; i++) lines.push(<polyline key={`x${i}`} points={pts(v, [[x + i * step, y, 0], [x + i * step, y + d, 0]])} />);
  for (let j = 0; j <= d / step + 1e-6; j++) lines.push(<polyline key={`y${j}`} points={pts(v, [[x, y + j * step, 0], [x + w, y + j * step, 0]])} />);
  return <g stroke={color} strokeWidth={1.5} fill="none">{lines}</g>;
};
