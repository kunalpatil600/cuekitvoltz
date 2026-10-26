import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

// Each scene gets its own dark, tinted light instead of flat black. Example helper, not part of the kit.
export const PALETTES = {
  indigo: ['#2B1B6B', '#0E3B5C', '#1A0B2E'],
  stage: ['#1A1240', '#3A0F2E', '#0B1F3A'],
  navy: ['#0B2447', '#0E4D5C', '#1B1340'],
  plum: ['#3A0F2E', '#4A2A0B', '#1A0B2E'],
  violet: ['#2A1060', '#5A1040', '#0B1F3A'],
  crimson: ['#5A0A1A', '#2E0A26', '#1A0408'],
} as const;
export type PaletteKey = keyof typeof PALETTES;

/** A slow-drifting mesh of three coloured lights over black, laid out for 1080×1920 and scaled to the frame. */
export const Atmosphere: React.FC<{ palette: PaletteKey; strength?: number }> = ({ palette, strength = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const sx = width / 1080, sy = height / 1920, sr = Math.max(sx, sy);
  const [a, b, c] = PALETTES[palette];
  const blobs = [
    { color: a, x: (250 + Math.sin(frame / 70) * 120) * sx, y: (420 + Math.cos(frame / 90) * 90) * sy, r: 1300 * sr },
    { color: b, x: (860 + Math.cos(frame / 80) * 110) * sx, y: (1180 + Math.sin(frame / 60) * 120) * sy, r: 1250 * sr },
    { color: c, x: (520 + Math.sin(frame / 55) * 160) * sx, y: (1700 + Math.cos(frame / 75) * 80) * sy, r: 1100 * sr },
  ];
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {blobs.map((bl, i) => (
        <div key={i} style={{
          position: 'absolute', left: bl.x - bl.r / 2, top: bl.y - bl.r / 2, width: bl.r, height: bl.r, borderRadius: '50%',
          background: `radial-gradient(circle, ${bl.color} 0%, ${bl.color}99 30%, transparent 68%)`, opacity: 0.85 * strength, mixBlendMode: 'screen',
        }} />
      ))}
    </AbsoluteFill>
  );
};
