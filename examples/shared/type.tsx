import React from 'react';
import type { CSSProperties } from 'react';
import { Easing, interpolate, random, useCurrentFrame } from 'remotion';
import { kitFonts } from 'cuekitvoltz';
import { DrawIcon } from './DrawIcon';
import type { IconNode } from './DrawIcon';

// The examples' editorial type: variable Geist for structure, Instrument Serif italic for the one
// emotional word in a line, Geist Mono for labels. These are example helpers, not part of the kit.
export const FONT = kitFonts;

export const INK = { text: '#F5F5F7', muted: '#86868B', hairline: 'rgba(255,255,255,0.14)' };

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const quint = Easing.bezier(0.22, 1, 0.36, 1);
/** 0 → 1 over `dur` frames from `at`, eased out. */
export const prog = (frame: number, at: number, dur = 20) => interpolate(frame, [at, at + dur], [0, 1], { ...clamp, easing: quint });

export const S = (size: number, weight = 700, extra?: CSSProperties): CSSProperties => ({
  fontFamily: FONT.sans, fontSize: size, fontWeight: weight, lineHeight: 1.04, color: INK.text,
  letterSpacing: size >= 60 ? '-0.045em' : '-0.012em', ...extra,
});

export const M = (size: number, weight = 500, extra?: CSSProperties): CSSProperties => ({
  fontFamily: FONT.mono, fontSize: size, fontWeight: weight, lineHeight: 1.1, color: INK.muted,
  letterSpacing: '0.06em', textTransform: 'uppercase', ...extra,
});

// Per-character colour ramps (one solid colour per glyph, so they survive transforms and blur).
export const RAMPS = {
  spectrum: ['#5AC8FA', '#7D7AFF', '#FF6FB5', '#FFB340'],
  memory: ['#6CF0FF', '#7D7AFF', '#C77DFF', '#FF6FB5'],
  red: ['#FF3B4E', '#FF5A3C', '#FF8A4C'],
} as const;
export type RampKey = keyof typeof RAMPS;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rampAt = (ramp: RampKey, x: number) => {
  const stops = RAMPS[ramp];
  const t = Math.min(1, Math.max(0, x)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t)), k = t - i;
  const a = hex(stops[i]), b = hex(stops[i + 1]);
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(',')})`;
};

export type Part = string | { t: string; serif?: boolean; ramp?: RampKey; color?: string; scatter?: boolean };

/**
 * A line mixing sans and serif-italic segments, revealed per character: sans glyphs rise out of blur
 * while their variable weight swells; serif glyphs slide in with a de-skew (or fly in from scattered
 * positions with `scatter`).
 */
export const MixReveal: React.FC<{
  parts: Part[]; at: number; size: number; stagger?: number; dur?: number; weight?: [number, number];
  serifScale?: number; color?: string; font?: string; style?: CSSProperties;
}> = ({ parts, at, size, stagger = 1.3, dur = 20, weight = [200, 760], serifScale = 1.16, color = INK.text, font = FONT.sans, style }) => {
  const frame = useCurrentFrame();
  let idx = 0;
  return (
    <div style={{ position: 'absolute', fontSize: size, lineHeight: 1.04, whiteSpace: 'pre', ...style }}>
      {parts.map((part, pi) => {
        const seg = typeof part === 'string' ? { t: part } : part;
        const chars = [...seg.t];
        return chars.map((ch, ci) => {
          const i = idx++;
          const p = prog(frame, at + i * stagger, seg.scatter ? dur + 10 : dur);
          const c = seg.ramp ? rampAt(seg.ramp, ci / Math.max(1, chars.length - 1)) : seg.color ?? color;
          if (seg.serif) {
            const sx = seg.scatter ? (random(`sx${pi}-${ci}`) - 0.5) * 520 : 0;
            const sy = seg.scatter ? (random(`sy${pi}-${ci}`) - 0.5) * 360 : 0;
            const rot = seg.scatter ? (random(`sr${pi}-${ci}`) - 0.5) * 70 : 0;
            return (
              <span key={`${pi}-${ci}`} style={{
                display: 'inline-block', fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: `${serifScale}em`,
                letterSpacing: '-0.02em', color: c, opacity: p,
                transform: `translate(${sx * (1 - p)}px, ${sy * (1 - p) + (seg.scatter ? 0 : (1 - p) * 0.3 * size)}px) rotate(${rot * (1 - p)}deg) skewX(${(1 - p) * -14}deg)`,
                filter: p < 1 ? `blur(${(1 - p) * 12}px)` : undefined,
              }}>{ch}</span>
            );
          }
          return (
            <span key={`${pi}-${ci}`} style={{
              display: 'inline-block', fontFamily: font, letterSpacing: size >= 60 ? '-0.045em' : '-0.012em',
              fontWeight: Math.round(interpolate(p, [0, 1], weight)), color: c, opacity: p,
              transform: `translateY(${(1 - p) * 0.42}em)`, filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined,
            }}>{ch}</span>
          );
        });
      })}
    </div>
  );
};

/** Mono label chip: `[ icon  LABEL ]`. */
export const Chip: React.FC<{ at: number; icon?: IconNode; children: React.ReactNode; color?: string; style?: CSSProperties }> = ({ at, icon, children, color = '#C9C7D6', style }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, 18);
  return (
    <div style={{
      position: 'absolute', left: 90, top: 244, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px 12px 16px', borderRadius: 999,
      background: 'rgba(14,14,20,0.72)', border: `1.5px solid ${INK.hairline}`, opacity: p, transform: `translateY(${(1 - p) * 14}px)`, ...style,
    }}>
      {icon && <DrawIcon icon={icon} size={34} at={at + 2} dur={18} color={color} stroke={1.8} />}
      <div style={M(26, 500, { color, letterSpacing: '0.14em' })}>{children}</div>
    </div>
  );
};
