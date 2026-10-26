import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SafeArea } from './safe-area';

/** Safe-area overlay: dashed content rect, hatched platform-UI zones. Never part of a final render. */
export const Guides: React.FC<{ safe: SafeArea }> = ({ safe }) => {
  const r = safe.rect;
  return (
    <AbsoluteFill data-qa-ignore style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, outline: '2px dashed rgba(0,229,255,0.75)' }} />
      {safe.avoid.map((z, i) => (
        <div key={i} style={{ position: 'absolute', left: z.x, top: z.y, width: z.w, height: z.h, background: 'repeating-linear-gradient(45deg, rgba(255,59,78,0.25) 0 12px, transparent 12px 24px)' }} />
      ))}
    </AbsoluteFill>
  );
};
