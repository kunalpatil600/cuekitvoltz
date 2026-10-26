import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame } from 'remotion';

/**
 * True motion blur for anything inside (rotation, scaling, curved paths, whole scenes): renders the
 * subtree at `samples` moments while the shutter is open and averages them, by adding the copies
 * at 1/samples opacity in an isolated group (plus-lighter blending). Costs `samples`× the subtree,
 * so switch it on only where things move fast with `active`. Backdrop filters inside won't see
 * what's behind the group.
 */
export const MotionBlur: React.FC<{
  samples?: number; shutter?: number; active?: boolean | ((frame: number) => boolean); children: React.ReactNode;
}> = ({ samples = 8, shutter = 0.5, active = true, children }) => {
  const frame = useCurrentFrame();
  const on = typeof active === 'function' ? active(frame) : active;
  if (!on || samples < 2 || shutter <= 0) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ isolation: 'isolate' }}>
      {Array.from({ length: samples }, (_, i) => (
        <AbsoluteFill key={i} style={{ mixBlendMode: 'plus-lighter', opacity: 1 / samples }}>
          <Freeze frame={frame - (shutter * i) / (samples - 1)}>{children}</Freeze>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
