import React from 'react';
import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import { sample, velocity } from '../core/motion';
import type { Motion } from '../core/motion';
import { useTheme } from '../theme/theme';

export type GraphSeries = { label: string; motion: Motion; color: string };

/**
 * Animator's graph of motions over a frame range. `value` plots each motion scaled to its own
 * range; `speed` plots |velocity|, the speed graph motion designers tune. Dots mark whole frames,
 * so their spacing shows the easing; the vertical line is the current frame.
 */
export const MotionGraph: React.FC<{
  series: GraphSeries[]; from: number; to: number; width: number; height: number;
  kind?: 'value' | 'speed'; title?: string; style?: CSSProperties;
  /** Just the curves and the playhead: no title, legend or frame numbers (for small multiples). */
  compact?: boolean;
}> = ({ series, from, to, width, height, kind = 'value', title, style, compact = false }) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const pad = compact ? { l: 10, r: 10, t: 12, b: 12 } : { l: 18, r: 18, t: 54, b: 34 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  const X = (f: number) => pad.l + ((f - from) / (to - from)) * w;
  const curves = series.map((s) => {
    const m: Motion = kind === 'speed' ? (f) => Math.abs(velocity(s.motion, f)) : s.motion;
    const pts = sample(m, from, to, 0.25);
    const vals = pts.map(([, v]) => v);
    const lo = kind === 'speed' ? 0 : Math.min(...vals), hi = Math.max(...vals);
    const Y = (v: number) => pad.t + h - (hi - lo < 1e-9 ? 0 : (v - lo) / (hi - lo)) * h;
    return { s, m, Y, pts, peak: hi };
  });
  const ticks = [];
  for (let f = Math.ceil(from / 5) * 5; f <= to; f += 5) ticks.push(f);
  const mono = (size: number, color = t.muted): CSSProperties => ({ font: `500 ${size}px ${t.font.mono}`, fill: color, letterSpacing: '0.08em' });
  return (
    <svg data-qa-ignore width={width} height={height} style={{ position: 'absolute', overflow: 'visible', ...style }}>
      <rect x={0.75} y={0.75} width={width - 1.5} height={height - 1.5} rx={14} fill="rgba(255,255,255,0.03)" stroke={t.line} strokeWidth={1.5} />
      {ticks.map((f) => (
        <g key={f}>
          <line x1={X(f)} x2={X(f)} y1={pad.t} y2={pad.t + h} stroke="rgba(255,255,255,0.06)" />
          {!compact && f % 10 === 0 && <text x={X(f)} y={height - 10} textAnchor="middle" style={mono(15)}>{f}</text>}
        </g>
      ))}
      {title && <text x={pad.l} y={32} style={mono(17, t.text)}>{title.toUpperCase()}</text>}
      {!compact && <text x={width - pad.r} y={32} textAnchor="end" style={mono(15)}>
        {curves.map((c, i) => (
          <tspan key={c.s.label} fill={c.s.color} dx={i ? 18 : 0}>
            {c.s.label}{kind === 'speed' ? ` ${c.peak.toFixed(0)}/f` : ''}
          </tspan>
        ))}
      </text>}
      {curves.map((c) => (
        <g key={c.s.label}>
          <polyline points={c.pts.map(([f, v]) => `${X(f)},${c.Y(v)}`).join(' ')} fill="none" stroke={c.s.color} strokeWidth={compact ? 2 : 2.5} strokeOpacity={0.85} />
          {!compact && c.pts.filter(([f]) => Number.isInteger(f)).map(([f, v]) => <circle key={f} cx={X(f)} cy={c.Y(v)} r={3.2} fill={c.s.color} />)}
        </g>
      ))}
      {frame >= from && frame <= to && (
        <g>
          <line x1={X(frame)} x2={X(frame)} y1={pad.t - 6} y2={pad.t + h + 6} stroke={t.text} strokeWidth={1.5} />
          {curves.map((c) => <circle key={c.s.label} cx={X(frame)} cy={c.Y(c.m(frame))} r={compact ? 4 : 7} fill="none" stroke={t.text} strokeWidth={2} />)}
        </g>
      )}
    </svg>
  );
};
