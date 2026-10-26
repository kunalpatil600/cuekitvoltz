import React, { useId } from 'react';
import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import { velocity } from '../core/motion';
import type { Motion } from '../core/motion';
import { stretchFor } from './principles';
import { cssId, smear } from './smear';

export type MoveProps = {
  x?: Motion; y?: Motion; scale?: Motion; rotate?: Motion; opacity?: Motion;
  /** Shutter as a fraction of a frame: 0.5 = 180°, the film look. 0 turns motion blur off. */
  shutter?: number;
  /** Squash and stretch along the direction of travel: 0 = off, 0.002 subtle, 0.006 cartoony. */
  stretch?: number;
  /** `absolute`: placed at (0, 0) of the parent and moved by x/y. `inline`: moves from its place in a line of text. */
  layout?: 'absolute' | 'inline';
  style?: CSSProperties;
  children?: React.ReactNode;
};

/**
 * Moves its children with velocity-driven motion blur (see smear): the blur's length is the distance
 * travelled while the shutter is open and its direction follows the motion. Settled elements stay sharp.
 * Keep the children in normal flow (not absolutely positioned) and position with x/y instead.
 */
export const Move: React.FC<MoveProps> = ({ x, y, scale, rotate, opacity, shutter = 0.5, stretch = 0, layout = 'absolute', style, children }) => {
  const frame = useCurrentFrame();
  const id = cssId('mb', useId());
  const vx = x ? velocity(x, frame) : 0, vy = y ? velocity(y, frame) : 0;
  const { angle, filter, def } = smear(vx * shutter, vy * shutter, id);
  const st = stretch > 0 ? stretchFor(vx, vy, stretch) : { along: 1, across: 1 };
  const place: CSSProperties = layout === 'absolute' ? { position: 'absolute', left: 0, top: 0 } : { display: 'inline-block' };
  return (
    <>
      {def}
      <div style={{
        ...place, ...style,
        transform: `translate(${x ? x(frame) : 0}px, ${y ? y(frame) : 0}px) rotate(${angle}deg)`,
        filter,
        opacity: opacity ? opacity(frame) : style?.opacity,
      }}>
        <div style={{
          display: layout === 'inline' ? 'inline-block' : undefined,
          transform: `scale(${st.along}, ${st.across}) rotate(${-angle}deg) rotate(${rotate ? rotate(frame) : 0}deg) scale(${scale ? scale(frame) : 1})`,
        }}>
          {children}
        </div>
      </div>
    </>
  );
};
