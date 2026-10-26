import React from 'react';
import { AbsoluteFill, Freeze } from 'remotion';

/** `count` evenly spaced frames from `from` to `to`, inclusive: the frames an onion skin shows. */
export const onionFrames = (from: number, to: number, count: number) =>
  Array.from({ length: count }, (_, i) => Math.round(from + ((to - from) * i) / Math.max(1, count - 1)));

/**
 * Draws its children at several frames at once, so the spacing between the ghosts shows the easing in
 * a single still. The newest frame is solid at the bottom; older ghosts stack on top, fainter, so even
 * opaque elements show every position. Children should be the moving element on a transparent background.
 */
export const OnionSkin: React.FC<{ frames: number[]; minOpacity?: number; children: React.ReactNode }> = ({ frames, minOpacity = 0.22, children }) => (
  <AbsoluteFill data-qa-ignore>
    {[...frames].reverse().map((f, i) => (
      <AbsoluteFill key={f} style={{ opacity: i === 0 ? 1 : minOpacity + ((0.6 - minOpacity) * (frames.length - 1 - i)) / Math.max(1, frames.length - 1) }}>
        <Freeze frame={f}>{children}</Freeze>
      </AbsoluteFill>
    ))}
  </AbsoluteFill>
);
