import React, { useId } from 'react';
import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import type { Motion } from '../core/motion';
import { cssId, smear } from '../motion/smear';
import type { Box } from './box';

/**
 * Magic Move: one element that travels between layouts, drawn above the scenes it connects (the
 * scenes leave a gap where it sits). Drive `box` with boxTrack().
 *   fit "size"   the element is laid out at the box size (cards, panels, tiles; corners follow box.r)
 *   fit "scale"  the content keeps its `base` layout and scales to the box width (text, icons)
 * Children can be a function of the current box. It blurs along its own motion like Move.
 */
export const Shared: React.FC<{
  box: Motion<Box>; fit?: 'size' | 'scale'; base?: { w: number; h: number }; shutter?: number; style?: CSSProperties;
  children?: React.ReactNode | ((b: Box) => React.ReactNode);
}> = ({ box, fit = 'size', base, shutter = 0.5, style, children }) => {
  const frame = useCurrentFrame();
  const b = box(frame), prev = box(frame - shutter);
  const s = smear(b.x + b.w / 2 - (prev.x + prev.w / 2), b.y + b.h / 2 - (prev.y + prev.h / 2), cssId('sh', useId()));
  const content = typeof children === 'function' ? children(b) : children;
  const ref = base ?? { w: b.w, h: b.h };
  return (
    <>
      {s.def}
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${b.x}px, ${b.y}px) rotate(${s.angle}deg)`, filter: s.filter }}>
        <div style={{ transform: `rotate(${-s.angle}deg)` }}>
          {fit === 'size' ? (
            <div style={{ width: b.w, height: b.h, borderRadius: b.r, overflow: 'hidden', position: 'relative', ...style }}>{content}</div>
          ) : (
            <div style={{ width: ref.w, height: ref.h, transform: `scale(${b.w / ref.w})`, transformOrigin: '0 0', ...style }}>{content}</div>
          )}
        </div>
      </div>
    </>
  );
};
