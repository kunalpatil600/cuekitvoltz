import React from 'react';
import { useCurrentFrame } from 'remotion';
import { withAlpha } from '../../core/color';
import { clamp } from '../../core/motion';
import type { Motion } from '../../core/motion';
import { project, useIso } from './project';
import type { V3 } from './project';

/** An L-shaped route on the ground (along x, then y) from a to b, at height z. */
export const isoRoute = (a: [number, number], b: [number, number], z = 0): V3[] => [[a[0], a[1], z], [b[0], a[1], z], [b[0], b[1], z]];

const along = (p: [number, number][], cum: number[], t: number): [number, number] => {
  const target = clamp(t) * cum[cum.length - 1];
  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) i++;
  const seg = cum[i] - cum[i - 1] || 1, k = (target - cum[i - 1]) / seg;
  return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
};

/**
 * A connection along world points: a dim base line that `draw` (0–1) draws on, dashes flowing at
 * `flow` px/frame, and packets riding it (`at` 0–1 along the path). A packet's trail grows with its
 * speed, so fast hops streak like motion blur.
 */
export const IsoLink: React.FC<{
  path: V3[]; color?: string; width?: number; flow?: number; draw?: Motion; packets?: { at: Motion; color?: string; size?: number }[]; depth?: number;
}> = ({ path, color = '#5AC8FA', width = 6, flow = 1.2, draw, packets = [] }) => {
  const frame = useCurrentFrame();
  const v = useIso();
  const p = path.map((q) => project(v, q));
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const total = cum[cum.length - 1];
  const shown = draw ? clamp(draw(frame)) : 1;
  const line = p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={line} stroke={withAlpha(color, 0.22)} strokeWidth={width} strokeDasharray={`${total * shown} ${total}`} />
      <polyline points={line} stroke={color} strokeWidth={width * 0.45} strokeDasharray="4 22" strokeDashoffset={-frame * flow} opacity={0.75 * shown} />
      {packets.map((pk, i) => {
        const t = pk.at(frame);
        if (t <= 0 || t >= 1) return null;
        const speed = Math.abs(t - pk.at(frame - 1));
        const size = pk.size ?? width * 1.6;
        const c = pk.color ?? color;
        const trail = Array.from({ length: 7 }, (_, k) => {
          const q = along(p, cum, t - (k + 1) * Math.max(0.003, speed * 0.16));
          return <circle key={k} cx={q[0]} cy={q[1]} r={size * (1 - (k + 1) / 9)} fill={c} opacity={0.5 * (1 - (k + 1) / 8)} />;
        });
        const [hx, hy] = along(p, cum, t);
        return (
          <g key={i}>
            {trail}
            <circle cx={hx} cy={hy} r={size * 2.2} fill={withAlpha(c, 0.25)} />
            <circle cx={hx} cy={hy} r={size} fill="#fff" stroke={c} strokeWidth={size * 0.5} />
          </g>
        );
      })}
    </g>
  );
};
