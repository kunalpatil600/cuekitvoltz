import React from 'react';
import type { CSSProperties } from 'react';
import { Sequence } from 'remotion';
import { useTheme } from '../theme/theme';

export type Panel = { label: string; note?: string; node: React.ReactNode };

/**
 * Scenes side by side, each rendered at its own size and scaled down (e.g. 1080×1920 shorts in a
 * 16:9 lab). Inside a panel, useVideoConfig() reports the source size and duration, so size-aware
 * scenes lay out as they would full-frame.
 */
export const Compare: React.FC<{
  panels: Panel[]; source: { width: number; height: number; durationInFrames: number }; scale: number; gap?: number; style?: CSSProperties;
}> = ({ panels, source, scale, gap = 40, style }) => {
  const t = useTheme();
  return (
    <div style={{ position: 'absolute', display: 'flex', gap, ...style }}>
      {panels.map((p) => (
        <div key={p.label}>
          <div data-qa-ignore style={{ font: `500 19px ${t.font.mono}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.muted, marginBottom: 12 }}>
            {p.label}
            {p.note && <span style={{ color: t.accent, marginLeft: 14 }}>{p.note}</span>}
          </div>
          <div style={{ width: source.width * scale, height: source.height * scale, position: 'relative', overflow: 'hidden', borderRadius: 14, outline: `1.5px solid ${t.line}` }}>
            <div style={{ position: 'relative', width: source.width, height: source.height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
              <Sequence width={source.width} height={source.height} durationInFrames={source.durationInFrames} name={p.label}>
                {p.node}
              </Sequence>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
