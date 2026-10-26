import React from 'react';
import type { CSSProperties } from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import type { IconNode } from 'lucide';

// Lucide line icons (ISC, the `lucide` package: each icon is a list of [tag, attrs] SVG nodes), drawn
// on stroke by stroke. Example helpers, not part of the kit.
export type { IconNode };

const prog = (frame: number, at: number, dur: number) =>
  interpolate(frame, [at, at + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1, 0.36, 1) });

export const DrawIcon: React.FC<{
  icon: IconNode; size: number; at: number; dur?: number; stagger?: number; stroke?: number;
  color?: string; gradient?: [string, string]; glow?: number; style?: CSSProperties;
}> = ({ icon, size, at, dur = 22, stagger = 3, stroke = 1.6, color = '#F5F5F7', gradient, glow = 0, style }) => {
  const frame = useCurrentFrame();
  // identical gradients share an id, which is harmless; different ones never collide
  const gid = gradient ? `ig-${gradient.join('-').replace(/#/g, '')}` : undefined;
  const all = prog(frame, at, dur + stagger * icon.length);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke}
      style={{ overflow: 'visible', filter: glow > 0 && all > 0 ? `drop-shadow(0 0 ${glow}px ${gradient?.[1] ?? color})` : undefined, ...style }}>
      {gradient && (
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="2" y1="22" x2="22" y2="2">
            <stop offset="0%" stopColor={gradient[0]} /><stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
      )}
      {icon.map(([tag, attrs], k) => {
        const p = prog(frame, at + k * stagger, dur);
        if (p <= 0.001) return null;
        return React.createElement(tag, {
          key: k, ...attrs, pathLength: 1, stroke: gid ? `url(#${gid})` : color,
          strokeDasharray: `${p} 1.001`, opacity: interpolate(p, [0, 0.08], [0, 1], { extrapolateRight: 'clamp' }),
        });
      })}
    </svg>
  );
};

/** Rounded glass tile holding a drawn icon; `active` lights the gradient rim and inner glow. */
export const IconTile: React.FC<{
  icon: IconNode; size: number; at: number; active?: number; gradient?: [string, string]; iconScale?: number; style?: CSSProperties;
}> = ({ icon, size, at, active = 1, gradient = ['#5AC8FA', '#FF6FB5'], iconScale = 0.5, style }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, 18);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(160deg, rgba(40,40,52,0.95), rgba(14,14,20,0.95)) padding-box, linear-gradient(135deg, ${gradient[0]}${active > 0.5 ? 'ff' : '33'}, rgba(255,255,255,0.08) 45%, ${gradient[1]}${active > 0.5 ? 'ff' : '33'}) border-box`,
      border: '2px solid transparent', opacity: p, transform: `scale(${0.8 + 0.2 * p})`,
      boxShadow: `0 20px 50px rgba(0,0,0,0.45), 0 0 ${60 * active}px ${gradient[1]}${Math.round(0x55 * active).toString(16).padStart(2, '0')}`,
      ...style,
    }}>
      <DrawIcon icon={icon} size={size * iconScale} at={at + 4} stroke={1.7} color={active > 0.5 ? undefined : '#6E6E7A'} gradient={active > 0.5 ? gradient : undefined} glow={active > 0.5 ? 6 : 0} />
    </div>
  );
};
