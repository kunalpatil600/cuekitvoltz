import React from 'react';
import { random, useCurrentFrame } from 'remotion';
import { shade, withAlpha } from '../../core/color';
import { clamp } from '../../core/motion';
import type { Motion } from '../../core/motion';
import { IsoBox, IsoCylinder, IsoQuad, IsoShadow, IsoSphere, faceRect, onFace, useIsoAnim } from './primitives';
import type { BoxGeom, IsoAnim } from './primitives';
import { pts, useIso } from './project';
import { useTheme } from '../../theme/theme';
import type { V3 } from './project';

// Ready-made iso objects for tech explainers. All take x, y (footprint corner, world units), an
// optional z, entrance controls (rise / lift) and colors; sizes are in world units.
export const isoColors = {
  body: '#3A3F58', silver: '#C9CCD8', screen: '#0B1020', accent: '#5AC8FA', violet: '#7D7AFF', warm: '#FFB340',
  good: '#34D399', cloud: '#E6EAF7', pcb: '#1F2B3C', gold: '#E8B04A', skin: '#F2C9A0', phone: '#23263A', platform: '#1A1D2C',
};
export type IsoColors = typeof isoColors;
/** isoColors with the theme's `iso` overrides (set them once on <Stage theme>). */
export const useIsoColors = (): IsoColors => ({ ...isoColors, ...useTheme().iso });
type Place = { x: number; y: number; z?: number } & IsoAnim;

/** Flickering LED: on/off re-rolled every `every` frames from the seed. */
const useLed = (seed: string, every = 6, duty = 0.65) => random(`${seed}-${Math.floor(useCurrentFrame() / every)}`) < duty;

/** Fake UI on a quad given by a point mapper: a header bar, then lines of seeded widths; `shown` 0–1 types them in. */
const ScreenUi: React.FC<{ at: (u: number, v: number) => V3; glow: string; lines?: number; shown?: number; seed: string }> = ({ at, glow, lines = 5, shown = 1, seed }) => {
  const v = useIso();
  const quad = (u0: number, v0: number, u1: number, v1: number) => pts(v, [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]);
  const visible = Math.floor(shown * (lines + 1) + 1e-6);
  return (
    <g>
      {visible > 0 && <polygon points={quad(0.08, 0.84, 0.92, 0.92)} fill={glow} opacity={0.9} />}
      {Array.from({ length: Math.max(0, visible - 1) }, (_, i) => {
        const v1 = 0.74 - i * (0.66 / lines), w = 0.3 + random(`${seed}-l${i}`) * 0.55;
        return <polygon key={i} points={quad(0.08, v1 - 0.06, 0.08 + w * 0.84, v1)} fill={glow} opacity={i % 3 === 0 ? 0.75 : 0.35} />;
      })}
    </g>
  );
};

export const Server: React.FC<Place & { w?: number; d?: number; h?: number; units?: number; color?: string; accent?: string; seed?: string }> = ({ x, y, z = 0, w = 1, d = 1, h = 2.2, units = 4, color: colorIn, accent: accentIn, seed = 'server', ...anim }) => {
  const C = useIsoColors();
  const color = colorIn ?? C.body, accent = accentIn ?? C.accent;
  const { g, dz, opacity } = useIsoAnim(anim);
  const b: BoxGeom = { x, y, z: z + dz, w, d, h: h * g };
  const leds = Array.from({ length: units }, (_, i) => useLed(`${seed}-${i}`));
  return (
    <g opacity={opacity}>
      <IsoShadow x={x} y={y} w={w} d={d} />
      <IsoBox {...b} color={color} />
      {Array.from({ length: units }, (_, i) => {
        const v0 = 0.07 + i * (0.88 / units), v1 = v0 + 0.88 / units - 0.045;
        const mid = (v0 + v1) / 2;
        return (
          <g key={i}>
            <IsoQuad points={faceRect(b, 'left', 0.07, v0, 0.93, v1)} color={shade(color, 0.62)} flat />
            {[0.14, 0.24, 0.34].map((u) => <IsoQuad key={u} points={faceRect(b, 'left', u, mid - 0.012, u + 0.06, mid + 0.012)} color={shade(color, 1.3)} flat opacity={0.5} />)}
            <IsoQuad points={faceRect(b, 'left', 0.7, mid - 0.018, 0.86, mid + 0.018)} color={leds[i] ? accent : shade(accent, 0.3)} flat />
          </g>
        );
      })}
      {[0.25, 0.45, 0.65].map((u) => <IsoQuad key={u} points={faceRect(b, 'right', u, 0.12, u + 0.04, 0.88)} color={shade(color, 0.5)} flat opacity={0.6} />)}
    </g>
  );
};

export const Database: React.FC<Place & { r?: number; layers?: number; color?: string; glow?: string }> = ({ x, y, z = 0, r = 0.6, layers = 3, color: colorIn, glow: glowIn, ...anim }) => {
  const C = useIsoColors();
  const color = colorIn ?? C.violet, glow = glowIn ?? C.accent;
  const { g, dz, opacity } = useIsoAnim(anim);
  const lh = 0.36, gap = 0.07;
  return (
    <g opacity={opacity}>
      <IsoShadow x={x} y={y} r={r} />
      {Array.from({ length: layers }, (_, i) => (
        <IsoCylinder key={i} x={x} y={y} z={z + dz + i * (lh + gap) * g} r={r} h={lh * g} color={shade(color, 0.8)} rings={[0.9]} ringColor={withAlpha(glow, 0.85)} />
      ))}
    </g>
  );
};

export const Cloud: React.FC<Place & { size?: number; color?: string }> = ({ x, y, z = 1.6, size = 1, color: colorIn, ...anim }) => {
  const C = useIsoColors();
  const color = colorIn ?? C.cloud;
  const frame = useCurrentFrame();
  const { g, dz, opacity } = useIsoAnim(anim);
  const bob = Math.sin(frame * 0.06) * 0.06;
  const cx = x + 0.9 * size, cy = y + 0.9 * size;
  const puffs: [number, number, number, number][] = [[-0.55, 0.1, -0.08, 0.4], [0.1, -0.45, 0.12, 0.45], [0, 0, 0, 0.55], [0.6, 0.15, -0.05, 0.42], [0.25, 0.4, 0.15, 0.38]];
  return (
    <g opacity={opacity}>
      <IsoShadow x={cx - 0.8 * size} y={cy - 0.8 * size} r={0.8 * size} opacity={0.25} spread={0.2} />
      {puffs.sort((a, b) => a[0] + a[1] - (b[0] + b[1])).map(([px, py, pz, r], i) => (
        <IsoSphere key={i} x={cx + px * size} y={cy + py * size} z={z + dz + bob + pz * size} r={r * size * g} color={color} />
      ))}
    </g>
  );
};

export const Laptop: React.FC<Place & { w?: number; d?: number; open?: Motion; color?: string; screen?: string; glow?: string; shown?: Motion; lines?: number; seed?: string }> = ({ x, y, z = 0, w = 1.5, d = 1, open, color: colorIn, screen: screenIn, glow: glowIn, shown, lines = 5, seed = 'laptop', ...anim }) => {
  const C = useIsoColors();
  const color = colorIn ?? C.silver, screen = screenIn ?? C.screen, glow = glowIn ?? C.accent;
  const frame = useCurrentFrame();
  const v = useIso();
  const { dz, opacity } = useIsoAnim(anim);
  const base: BoxGeom = { x, y, z: z + dz, w, d, h: 0.07 };
  const theta = (open ? clamp(open(frame), 0, 1.15) : 1) * 105 * (Math.PI / 180);
  const L = d * 0.92, z1 = base.z + base.h;
  const dir: V3 = [0, Math.cos(theta), Math.sin(theta)];
  const lid = (u: number, t: number): V3 => [x + 0.04 + u * (w - 0.08), y + t * L * dir[1], z1 + t * L * dir[2]];
  const facing = Math.sin(theta) - Math.cos(theta) > 0; // the screen side faces the viewer once open past 45°
  const keys: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
    const u0 = 0.08 + c * 0.084, v0 = 0.1 + r * 0.11;
    keys.push(<IsoQuad key={`${r}-${c}`} points={faceRect(base, 'top', u0, v0, u0 + 0.066, v0 + 0.085)} color={shade(color, 0.6)} flat />);
  }
  return (
    <g opacity={opacity}>
      <IsoShadow x={x} y={y} w={w} d={d} />
      <IsoBox {...base} color={color} />
      {keys}
      <IsoQuad points={faceRect(base, 'top', 0.36, 0.6, 0.64, 0.9)} color={shade(color, 0.85)} flat />
      {facing ? (
        <g>
          <polygon points={pts(v, [lid(0, 0), lid(1, 0), lid(1, 1), lid(0, 1)])} fill={shade(color, 0.35)} strokeLinejoin="round" />
          <polygon points={pts(v, [lid(-0.08, 0.15), lid(1.08, 0.15), lid(1.08, 1.15), lid(-0.08, 1.15)])} fill={withAlpha(glow, 0.18)} filter={`url(#${v.soft})`} />
          <polygon points={pts(v, [lid(0.05, 0.08), lid(0.95, 0.08), lid(0.95, 0.94), lid(0.05, 0.94)])} fill={screen} />
          <ScreenUi at={(u, t) => lid(0.05 + u * 0.9, 0.08 + t * 0.86)} glow={glow} lines={lines} shown={shown ? shown(frame) : 1} seed={seed} />
        </g>
      ) : (
        <polygon points={pts(v, [lid(0, 0), lid(1, 0), lid(1, 1), lid(0, 1)])} fill={shade(color, 1.1)} stroke={shade(color, 1.4)} strokeWidth={1.2} strokeLinejoin="round" />
      )}
    </g>
  );
};

export const Phone: React.FC<Place & { color?: string; screen?: string; glow?: string; shown?: Motion; seed?: string }> = ({ x, y, z = 0, color: colorIn, screen: screenIn, glow: glowIn, shown, seed = 'phone', ...anim }) => {
  const C = useIsoColors();
  const color = colorIn ?? C.phone, screen = screenIn ?? C.screen, glow = glowIn ?? C.violet;
  const frame = useCurrentFrame();
  const { g, dz, opacity } = useIsoAnim(anim);
  const b: BoxGeom = { x, y, z: z + dz, w: 0.52, d: 0.08, h: 1.05 * g };
  return (
    <g opacity={opacity}>
      <IsoShadow x={x} y={y} w={0.52} d={0.3} opacity={0.35} />
      <IsoBox {...b} color={color} />
      <IsoQuad points={faceRect(b, 'left', 0.08, 0.04, 0.92, 0.94)} color={screen} flat />
      <IsoQuad points={faceRect(b, 'left', 0.38, 0.95, 0.62, 0.97)} color={shade(color, 0.5)} flat />
      <ScreenUi at={(u, t) => onFace(b, 'left', 0.12 + u * 0.76, 0.08 + t * 0.8)} glow={glow} lines={6} shown={shown ? shown(frame) : 1} seed={seed} />
    </g>
  );
};

export const Router: React.FC<Place & { color?: string; led?: string; seed?: string }> = ({ x, y, z = 0, color: colorIn, led: ledIn, seed = 'router', ...anim }) => {
  const C = useIsoColors();
  const color = colorIn ?? C.body, led = ledIn ?? C.good;
  const v = useIso();
  const { g, dz, opacity } = useIsoAnim(anim);
  const b: BoxGeom = { x, y, z: z + dz, w: 1.1, d: 0.75, h: 0.22 * g };
  const leds = [0, 1, 2, 3].map((i) => useLed(`${seed}-${i}`, 4, 0.7));
  const antenna = (u: number) => {
    const foot = onFace(b, 'top', u, 0.12);
    const tip: V3 = [foot[0], foot[1], foot[2] + 0.7 * g];
    return (
      <g key={u}>
        <polyline points={pts(v, [foot, tip])} stroke={shade(color, 0.7)} strokeWidth={v.unit * 0.06} strokeLinecap="round" />
        <IsoSphere x={tip[0]} y={tip[1]} z={tip[2]} r={0.06} color={shade(color, 1.2)} />
      </g>
    );
  };
  return (
    <g opacity={opacity}>
      <IsoShadow x={x} y={y} w={1.1} d={0.75} />
      {antenna(0.15)}
      {antenna(0.85)}
      <IsoBox {...b} color={color} />
      {leds.map((on, i) => <IsoQuad key={i} points={faceRect(b, 'left', 0.12 + i * 0.12, 0.35, 0.18 + i * 0.12, 0.65)} color={on ? led : shade(led, 0.3)} flat />)}
    </g>
  );
};

export const Gpu: React.FC<Place & { color?: string; accent?: string }> = ({ x, y, z = 0, color: colorIn, accent: accentIn, ...anim }) => {
  const C = useIsoColors();
  const color = colorIn ?? C.pcb, accent = accentIn ?? C.good;
  const frame = useCurrentFrame();
  const v = useIso();
  const { g, dz, opacity } = useIsoAnim(anim);
  const board: BoxGeom = { x, y, z: z + dz, w: 1.8, d: 1.1, h: 0.08 };
  const shroud: BoxGeom = { x: x + 0.08, y: y + 0.08, z: board.z + board.h, w: 1.64, d: 0.94, h: 0.22 * g };
  const fan = (u: number) => {
    const [cx, cy, cz] = onFace(shroud, 'top', u, 0.5);
    const blades = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + frame * 0.35;
      const p = (t: number, r: number): V3 => [cx + Math.cos(a + t) * r, cy + Math.sin(a + t) * r, cz + 0.002];
      return <polygon key={i} points={pts(v, [p(0, 0.06), p(0.25, 0.32), p(0.55, 0.3), p(0.35, 0.06)])} fill={shade(color, 1.5)} opacity={0.85} />;
    });
    return (
      <g key={u}>
        <polygon points={pts(v, Array.from({ length: 24 }, (_, i): V3 => [cx + Math.cos((i / 24) * Math.PI * 2) * 0.36, cy + Math.sin((i / 24) * Math.PI * 2) * 0.36, cz + 0.001]))} fill={shade(color, 0.55)} />
        {blades}
      </g>
    );
  };
  return (
    <g opacity={opacity}>
      <IsoShadow x={x} y={y} w={1.8} d={1.1} />
      <IsoBox {...board} color={shade(color, 0.85)} />
      {Array.from({ length: 12 }, (_, i) => <IsoQuad key={i} points={faceRect(board, 'left', 0.18 + i * 0.05, 0.1, 0.21 + i * 0.05, 0.9)} color={C.gold} flat />)}
      <IsoBox {...shroud} color={color} />
      <IsoQuad points={faceRect(shroud, 'left', 0.04, 0.42, 0.96, 0.58)} color={accent} flat opacity={0.9} />
      {fan(0.27)}
      {fan(0.73)}
    </g>
  );
};

/** A person as an iso token: body + head. */
export const IsoPerson: React.FC<Place & { shirt?: string; skin?: string }> = ({ x, y, z = 0, shirt: shirtIn, skin: skinIn, ...anim }) => {
  const C = useIsoColors();
  const shirt = shirtIn ?? C.warm, skin = skinIn ?? C.skin;
  const { g, dz, opacity } = useIsoAnim(anim);
  return (
    <g opacity={opacity}>
      <IsoShadow x={x} y={y} r={0.28} />
      <IsoCylinder x={x + 0.02} y={y + 0.02} z={z + dz} r={0.26} h={0.62 * g} color={shirt} />
      <IsoSphere x={x + 0.28} y={y + 0.28} z={z + dz + (0.62 + 0.24) * g} r={0.2 * g} color={skin} />
    </g>
  );
};

/** A raised floor plate to group things into a zone (a region, a cluster). Always drawn under objects. */
const PlatformBase: React.FC<Place & { w: number; d: number; color?: string; edge?: string }> = ({ x, y, z = 0, w, d, color: colorIn, edge: edgeIn, ...anim }) => {
  const C = useIsoColors();
  const color = colorIn ?? C.platform, edge = edgeIn ?? C.accent;
  const v = useIso();
  const { g, dz, opacity } = useIsoAnim(anim);
  const b: BoxGeom = { x, y, z: z + dz - 0.12, w, d, h: 0.12 * Math.min(1, g) };
  return (
    <g opacity={opacity}>
      <IsoBox {...b} color={color} edge={false} />
      <polygon points={pts(v, faceRect(b, 'top', 0, 0, 1, 1))} fill="none" stroke={edge} strokeOpacity={0.55} strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
};
export const Platform = Object.assign(PlatformBase, { isoLayer: 'floor' as const });
