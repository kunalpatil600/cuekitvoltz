import React, { useId, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Motion } from '../../core/motion';
import { cssId } from '../../motion/smear';

// Deep-space scenery for science explainers, all procedural and seeded: a starfield with parallax
// and twinkle, soft nebula haze, a planet's rim-lit edge, and a black hole (shadow, photon ring and an
// optional lensed accretion disk in the style of the well-known renderings).

type Value<T> = T | Motion<T>;
const at = <T,>(v: Value<T> | undefined, f: number, d: T): T => (v === undefined ? d : typeof v === 'function' ? (v as Motion<T>)(f) : v);

export type StarfieldProps = {
  count?: number;
  seed?: string;
  /** drift in px per frame for the nearest layer (far layers move less) */
  drift?: [number, number];
  /** extra zoom about the frame centre (fly-in feel), animatable */
  zoom?: Value<number>;
  color?: string;
  style?: CSSProperties;
};

/** Seeded stars in three depth layers; near ones are bigger, brighter and drift faster. */
export const Starfield: React.FC<StarfieldProps> = ({ count = 260, seed = 'stars', drift = [0, 0], zoom = 1, color = '#E8F0FF', style }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const stars = useMemo(
    () => Array.from({ length: count }, (_, i) => {
      const depth = random(`${seed}-d${i}`);
      return {
        x: random(`${seed}-x${i}`), y: random(`${seed}-y${i}`), depth,
        r: 0.5 + depth * depth * 1.9, a: 0.25 + depth * 0.65, tw: random(`${seed}-t${i}`) * Math.PI * 2, rate: 0.03 + random(`${seed}-r${i}`) * 0.08,
      };
    }),
    [count, seed],
  );
  const z = at(zoom, frame, 1);
  return (
    <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, ...style }}>
      {stars.map((s, i) => {
        const px = (((s.x * width + drift[0] * frame * (0.2 + s.depth)) % width) + width) % width;
        const py = (((s.y * height + drift[1] * frame * (0.2 + s.depth)) % height) + height) % height;
        const zx = width / 2 + (px - width / 2) * (1 + (z - 1) * (0.4 + s.depth));
        const zy = height / 2 + (py - height / 2) * (1 + (z - 1) * (0.4 + s.depth));
        const tw = 0.7 + 0.3 * Math.sin(frame * s.rate + s.tw);
        return <circle key={i} cx={zx} cy={zy} r={s.r * (0.8 + 0.2 * z)} fill={color} opacity={s.a * tw} />;
      })}
    </svg>
  );
};

/** Soft, slowly drifting haze (blue-grey by default), like a faint band of the galaxy. */
export const Nebula: React.FC<{ color?: string; strength?: number; angle?: number; seed?: string; drift?: number }> = ({ color = '110,130,170', strength = 0.5, angle = -32, seed = 'neb', drift = 0.15 }) => {
  const frame = useCurrentFrame();
  const blobs = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({ x: 15 + random(`${seed}x${i}`) * 70, y: 10 + random(`${seed}y${i}`) * 80, s: 22 + random(`${seed}s${i}`) * 26, a: 0.35 + random(`${seed}a${i}`) * 0.5 })),
    [seed],
  );
  const bg = blobs.map((b) => `radial-gradient(${b.s}% ${b.s * 0.55}% at ${b.x}% ${b.y}%, rgba(${color},${(b.a * strength * 0.5).toFixed(3)}) 0%, rgba(${color},0) 70%)`).join(',');
  return <AbsoluteFill style={{ background: bg, transform: `rotate(${angle}deg) scale(1.6) translateX(${frame * drift}px)`, mixBlendMode: 'screen' }} />;
};

export type PlanetRimProps = { cx: Value<number>; cy: Value<number>; r: Value<number>; rim?: string; glow?: number; fill?: string };

/** A huge planet whose lit edge arcs across the frame: dark body, thin bright rim, soft atmosphere glow. */
export const PlanetRim: React.FC<PlanetRimProps> = ({ cx, cy, r, rim = '#F4F2EE', glow = 1, fill = '#030407' }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = cssId('rim', useId());
  const x = at(cx, frame, 0);
  const y = at(cy, frame, 0);
  const R = at(r, frame, 1000);
  return (
    <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <filter id={`${id}-b`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={14 * glow} /></filter>
        <radialGradient id={`${id}-g`} cx={x} cy={y} r={R} gradientUnits="userSpaceOnUse">
          <stop offset="0.9" stopColor={fill} />
          <stop offset="0.985" stopColor="#0B0D12" />
          <stop offset="1" stopColor="#1A1C22" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={R + 6} fill="none" stroke={rim} strokeOpacity={0.35} strokeWidth={22} filter={`url(#${id}-b)`} />
      <circle cx={x} cy={y} r={R} fill={`url(#${id}-g)`} />
      <circle cx={x} cy={y} r={R} fill="none" stroke={rim} strokeWidth={3} strokeOpacity={0.95} />
    </svg>
  );
};

export type BlackHoleProps = {
  cx: Value<number>;
  cy: Value<number>;
  /** radius of the shadow, px */
  r: Value<number>;
  /** 0–1: accretion disk brightness (0 = bare shadow and photon ring) */
  disk?: Value<number>;
  /** disk tilt: how flat the disk looks (0.12 = nearly edge-on) */
  tilt?: number;
  /** degrees the disk swirls per frame */
  spin?: number;
  /** faint orbit rings around a bare black hole */
  orbits?: Value<number>;
  diskColor?: [string, string, string];
};

/** A black hole: shadow, thin photon ring, and an optional accretion disk lensed over the top. */
export const BlackHole: React.FC<BlackHoleProps> = ({ cx, cy, r, disk = 0, tilt = 0.16, spin = 1.2, orbits = 0, diskColor = ['#7A2E0C', '#FF8A2A', '#FFE2A8'] }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = cssId('bh', useId());
  const x = at(cx, frame, width / 2);
  const y = at(cy, frame, height / 2);
  const R = at(r, frame, 100);
  const d = Math.max(0, Math.min(1, at(disk, frame, 0)));
  const ob = at(orbits, frame, 0);
  const rings = Array.from({ length: 9 }, (_, i) => 1.32 + i * 0.24);
  const diskRings = (half: 'back' | 'front') => (
    <g clipPath={`url(#${id}-${half})`} filter={`url(#${id}-glow)`}>
      {rings.map((k, i) => (
        <ellipse
          key={k} cx={x} cy={y} rx={R * k} ry={R * k * tilt} fill="none" stroke={`url(#${id}-dg)`}
          strokeWidth={R * (0.085 - i * 0.006)} strokeOpacity={d * (0.92 - i * 0.085)}
          strokeDasharray={`${R * (2.2 + i * 0.6)} ${R * 0.18}`} strokeDashoffset={-(frame * spin * (1.4 - i * 0.1) * R) / 60}
        />
      ))}
    </g>
  );
  return (
    <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={R * 0.05} result="b" />
          <feGaussianBlur in="SourceGraphic" stdDeviation={R * 0.12} result="w" />
          <feMerge><feMergeNode in="w" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={R * 0.06} /></filter>
        <linearGradient id={`${id}-dg`} x1={x - R * 3.3} x2={x + R * 3.3} y1={y} y2={y} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={diskColor[0]} />
          <stop offset="0.3" stopColor={diskColor[1]} />
          <stop offset="0.5" stopColor={diskColor[2]} />
          <stop offset="0.7" stopColor={diskColor[1]} />
          <stop offset="1" stopColor={diskColor[0]} />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx={x} cy={y} r={R * 3.6} gradientUnits="userSpaceOnUse">
          <stop offset="0.25" stopColor={diskColor[1]} stopOpacity={0.28 * d} />
          <stop offset="1" stopColor={diskColor[0]} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-lens`} x1={x} x2={x} y1={y - R * 1.3} y2={y + R * 1.3} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={diskColor[2]} />
          <stop offset="0.45" stopColor={diskColor[1]} />
          <stop offset="1" stopColor={diskColor[0]} />
        </linearGradient>
        <clipPath id={`${id}-back`}><rect x={0} y={-height} width={width} height={y + height} /></clipPath>
        <clipPath id={`${id}-front`}><rect x={0} y={y} width={width} height={height * 2} /></clipPath>
      </defs>
      {d > 0 && <circle cx={x} cy={y} r={R * 3.6} fill={`url(#${id}-halo)`} />}
      {ob > 0 && [1.6, 2.3, 3.1].map((k, i) => (
        <circle key={k} cx={x} cy={y} r={R * k} fill="none" stroke="#E8F0FA" strokeOpacity={ob * (0.22 - i * 0.05)} strokeWidth={1.5} strokeDasharray={i === 1 ? '2 9' : undefined} />
      ))}
      {d > 0 && diskRings('back')}
      {/* light from behind the hole, bent over the top and under the bottom */}
      {d > 0 && (
        <g filter={`url(#${id}-glow)`}>
          <circle cx={x} cy={y} r={R * 1.1} fill="none" stroke={`url(#${id}-lens)`} strokeWidth={R * 0.09} strokeOpacity={d * 0.95} />
          <circle cx={x} cy={y} r={R * 1.22} fill="none" stroke={`url(#${id}-lens)`} strokeWidth={R * 0.04} strokeOpacity={d * 0.5} />
        </g>
      )}
      <circle cx={x} cy={y} r={R * 1.03} fill="none" stroke="#FFFFFF" strokeOpacity={0.55 + 0.4 * (1 - d)} strokeWidth={Math.max(2, R * 0.025)} filter={`url(#${id}-soft)`} />
      <circle cx={x} cy={y} r={R} fill="#000000" />
      <circle cx={x} cy={y} r={R * 1.005} fill="none" stroke="#F2F4F8" strokeOpacity={0.9 - 0.4 * d} strokeWidth={Math.max(1.5, R * 0.012)} />
      {d > 0 && diskRings('front')}
    </svg>
  );
};
