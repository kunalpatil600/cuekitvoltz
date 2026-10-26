import type React from 'react';
import { useId } from 'react';
import { AbsoluteFill } from 'remotion';


/**
 * Directional motion blur for a smear vector (dx, dy) in px: the distance travelled while the shutter
 * is open. Rotate a box to the direction of travel, blur it along its own x axis only, rotate its
 * content back: the content stays upright and the smear points along the motion. Returns the SVG
 * filter to render once (`def`), the box's rotation and its CSS filter. Below ~1 px it switches off.
 */
export const smear = (dx: number, dy: number, id: string) => {
  const len = Math.hypot(dx, dy);
  // a box smear of length L has the spread of a gaussian with sd ≈ 0.29 L
  const sd = Math.min(60, len * 0.29);
  const on = sd > 0.35;
  return {
    on,
    angle: len > 0.01 ? (Math.atan2(dy, dx) * 180) / Math.PI : 0,
    filter: on ? `url(#${id})` : undefined,
    def: on ? (
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <filter id={id} filterUnits="userSpaceOnUse" x={-4000} y={-4000} width={12000} height={12000} colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${sd.toFixed(2)} 0`} />
        </filter>
      </svg>
    ) : null,
  };
};

/** A stable, CSS-safe id from React's useId(). */
export const cssId = (prefix: string, reactId: string) => `${prefix}${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

/** Blurs its full-frame children along the smear vector (dx, dy), e.g. a whole scene in a push. */
export const Smear: React.FC<{ dx: number; dy: number; children: React.ReactNode }> = ({ dx, dy, children }) => {
  const s = smear(dx, dy, cssId('sm', useId()));
  return (
    <>
      {s.def}
      <AbsoluteFill style={{ transform: `rotate(${s.angle}deg)`, filter: s.filter }}>
        <AbsoluteFill style={{ transform: `rotate(${-s.angle}deg)` }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    </>
  );
};
