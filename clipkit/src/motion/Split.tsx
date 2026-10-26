import React from 'react';
import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import type { Motion } from '../core/motion';
import { Move } from './Move';

/** How one glyph or word moves. `weight` animates a variable font's weight. */
export type Unit = { x?: Motion; y?: Motion; scale?: Motion; rotate?: Motion; opacity?: Motion; weight?: Motion; style?: CSSProperties };

/**
 * Kinetic type: splits `text` into glyphs or words, each moved by `unit(i, n, piece)` with its own
 * motion blur. Spaces keep their width and never move. For a line mixing styles, render one Split
 * per part and pass `start`/`count` so the stagger runs across the whole line.
 */
export const Split: React.FC<{
  text: string; unit: (i: number, n: number, piece: string) => Unit;
  by?: 'glyph' | 'word'; start?: number; count?: number; shutter?: number; stretch?: number; style?: CSSProperties;
}> = ({ text, unit, by = 'glyph', start = 0, count, shutter, stretch, style }) => {
  const frame = useCurrentFrame();
  const pieces = by === 'glyph' ? [...text] : text.split(/(\s+)/).filter(Boolean);
  const n = count ?? start + pieces.filter((p) => p.trim()).length;
  let k = 0;
  return (
    <span style={{ whiteSpace: 'pre', ...style }}>
      {pieces.map((p, j) => {
        if (!p.trim()) return <span key={j}>{p}</span>;
        const u = unit(start + k++, n, p);
        return (
          <Move key={j} layout="inline" x={u.x} y={u.y} scale={u.scale} rotate={u.rotate} opacity={u.opacity} shutter={shutter} stretch={stretch}
            style={{ ...u.style, fontWeight: u.weight ? Math.round(u.weight(frame)) : u.style?.fontWeight }}>
            {p}
          </Move>
        );
      })}
    </span>
  );
};
