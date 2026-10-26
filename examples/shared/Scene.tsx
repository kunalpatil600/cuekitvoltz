import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Atmosphere } from './Atmosphere';
import type { PaletteKey } from './Atmosphere';

// The plain-Remotion scene wrapper the lab's "before" baseline is built with: a fade, scale and blur
// push-through instead of the kit's <Scenes>. Example helper, not part of the kit.
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const quint = Easing.bezier(0.22, 1, 0.36, 1);

export const Shell: React.FC<{ layer: 'back' | 'front'; palette: PaletteKey; enter?: boolean; exit?: boolean; children?: React.ReactNode }> = ({ layer, palette, enter = true, exit = true, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const a = enter ? interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: quint }) : 1;
  const b = exit ? interpolate(frame, [d - 9, d], [0, 1], { ...clamp, easing: (t) => t * t }) : 0;
  return (
    <AbsoluteFill style={{ opacity: a * (1 - b) }}>
      {layer === 'back' && <Atmosphere palette={palette} />}
      <AbsoluteFill style={{ transform: `scale(${(0.92 + 0.08 * a) * (1 + 0.14 * b)})`, filter: a < 1 || b > 0 ? `blur(${(1 - a) * 14 + b * 16}px)` : undefined }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
