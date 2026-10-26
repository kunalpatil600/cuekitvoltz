import React from 'react';
import type { CSSProperties } from 'react';
import { AbsoluteFill, random } from 'remotion';
import { clamp } from '../core/motion';
import { ease } from '../motion/ease';
import { Smear } from '../motion/smear';
import { pathPoints, placePoints, polygonPath, smoothPath, unitShape } from '../shape/points';
import { blobPoints, roundRectPath } from '../shape/shapes';
import type { Box } from './box';
import type { TransitionKind } from './Scenes';

// Transition kinds for <Cut kind={…}>. Positions (x, y) are fractions of the frame unless noted.
// Each renders one side of the cut: "out" is the scene leaving, "in" the one arriving (on top).

export type Dir = 'left' | 'right' | 'up' | 'down';
const DIRS: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const plain = (children: React.ReactNode) => <AbsoluteFill>{children}</AbsoluteFill>;
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mask = (image: string): CSSProperties => ({ maskImage: image, WebkitMaskImage: image });
/** Distance from (x, y) to the farthest frame corner: how big a reveal must grow to cover the frame. */
const farthest = (x: number, y: number, w: number, h: number) => Math.hypot(Math.max(x, w - x), Math.max(y, h - y));

/** Both scenes travel together, the new one pushing the old one out, smeared along the move. */
export const push = ({ dir = 'left', parallax = 1, shutter = 0.5 }: { dir?: Dir; parallax?: number; shutter?: number } = {}): TransitionKind => ({
  name: `push-${dir}`,
  render: ({ p, dp, side, width, height, children }) => {
    const [ux, uy] = DIRS[dir];
    const span = (ux ? width : height) * (side === 'out' ? parallax : 1);
    const off = (side === 'out' ? p : p - 1) * span;
    const len = dp * 2 * shutter * span; // distance covered while the shutter is open
    return (
      <Smear dx={ux * len} dy={uy * len}>
        <AbsoluteFill style={{ transform: `translate(${ux * off}px, ${uy * off}px)` }}>{children}</AbsoluteFill>
      </Smear>
    );
  },
});

/** A whip pan: a push that's nearly still at both ends and a streak in the middle. */
export const whip = ({ dir = 'left' }: { dir?: Dir } = {}): TransitionKind => ({ ...push({ dir, shutter: 1.2 }), name: `whip-${dir}`, ease: ease.expoInOut });

/** A soft-edged wipe travelling at `angle` (0 = rightwards, 90 = down), with an optional glowing edge. */
export const wipe = ({ angle = 0, feather = 0.1, glow }: { angle?: number; feather?: number; glow?: string } = {}): TransitionKind => ({
  name: 'wipe',
  render: ({ p, side, children }) => {
    if (side === 'out') return plain(children);
    const e = -feather + p * (1 + 2 * feather); // leading edge along the gradient line
    const deg = angle + 90;
    const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
    return (
      <>
        <AbsoluteFill style={mask(`linear-gradient(${deg}deg, #000 ${pct(e - feather)}, transparent ${pct(e)})`)}>{children}</AbsoluteFill>
        {glow && (
          <AbsoluteFill style={{
            background: `linear-gradient(${deg}deg, transparent ${pct(e - feather * 1.5)}, ${glow} ${pct(e - feather * 0.5)}, transparent ${pct(e + feather * 0.25)})`,
            mixBlendMode: 'screen', opacity: Math.sin(Math.PI * clamp(p)),
          }} />
        )}
      </>
    );
  },
});

/** A soft circle opening from (x, y). */
export const iris = ({ x = 0.5, y = 0.5, feather = 60 }: { x?: number; y?: number; feather?: number } = {}): TransitionKind => ({
  name: 'iris',
  render: ({ p, side, width, height, children }) => {
    if (side === 'out') return plain(children);
    const cx = x * width, cy = y * height;
    const r = Math.max(0, p) * (farthest(cx, cy, width, height) + feather);
    return <AbsoluteFill style={mask(`radial-gradient(circle at ${cx}px ${cy}px, #000 ${Math.max(0, r - feather)}px, transparent ${r}px)`)}>{children}</AbsoluteFill>;
  },
});

/** Any outline (a logo mark, a star, shapes.heart()) grows from (x, y) and unspins, with an optional glowing rim. */
export const shape = ({ path, x = 0.5, y = 0.5, spin = 90, rim }: { path: string; x?: number; y?: number; spin?: number; rim?: string }): TransitionKind => {
  const unit = unitShape(pathPoints(path, 160));
  return {
    name: 'shape',
    render: ({ p, side, width, height, children }) => {
      if (side === 'out') return plain(children);
      const cx = x * width, cy = y * height;
      const d = polygonPath(placePoints(unit, cx, cy, Math.max(0.001, p) * farthest(cx, cy, width, height) * 1.02, spin * (1 - p)));
      return (
        <>
          <AbsoluteFill style={{ clipPath: `path('${d}')` }}>{children}</AbsoluteFill>
          {rim && (
            <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              <path d={d} fill="none" stroke={rim} strokeWidth={8} opacity={1 - smoothstep(0.75, 1, p)} style={{ filter: `drop-shadow(0 0 16px ${rim})` }} />
            </svg>
          )}
        </>
      );
    },
  };
};

/** A liquid blob floods in from (x, y), led by a wobbling wave of `color`. */
export const blob = ({ x = 0.5, y = 1, color = '#7D7AFF', wobble = 0.14, lead = 110, seed = 'blob' }: { x?: number; y?: number; color?: string; wobble?: number; lead?: number; seed?: string } = {}): TransitionKind => ({
  name: 'blob',
  render: ({ p, side, width, height, children }) => {
    if (side === 'out') return plain(children);
    const cx = x * width, cy = y * height;
    const r = Math.max(0, p) * farthest(cx, cy, width, height) * (1 + wobble);
    const t = p * 5;
    const front = smoothPath(blobPoints({ x: cx, y: cy, r: r + lead * Math.sin(Math.PI * clamp(p)), wobble, t: t + 1.3, seed: `${seed}-lead` }));
    const body = smoothPath(blobPoints({ x: cx, y: cy, r, wobble, t, seed }));
    return (
      <>
        <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}><path d={front} fill={color} /></svg>
        <AbsoluteFill style={{ clipPath: `path('${body}')` }}>{children}</AbsoluteFill>
      </>
    );
  },
});

/**
 * The camera flies into `box` (px, e.g. a tile or a screen in the old scene) until it fills the
 * frame; the new scene is inside it all along. Zoom is exponential, so it feels like constant speed,
 * and the cut is sub-frame motion blurred (zoom blur). When the box's shape differs from the frame's
 * (a square tile into a vertical scene), paint the new scene's background past its frame (scale it
 * up), or the box shows the scene as a narrower window inside it. Deep zooms into small boxes
 * cover a lot of scale per frame: raise `blur` (samples) to 12 so the zoom blur stays smooth.
 */
export const zoomThrough = ({ box, blur = 8 }: { box: Box; blur?: number }): TransitionKind => ({
  name: 'zoom-through',
  blur,
  render: ({ p, side, width: W, height: H, children }) => {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const S = Math.max(W / box.w, H / box.h) * 1.04;
    const s = Math.pow(S, p);
    const tx = cx + (W / 2 - cx) * p, ty = cy + (H / 2 - cy) * p;
    if (side === 'out') {
      return <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s}) translate(${-cx}px, ${-cy}px)` }}>{children}</AbsoluteFill>;
    }
    // the new scene maps the full frame into the box; in its own coordinates the clip never moves
    const cw = box.w * S, ch = box.h * S;
    return (
      <AbsoluteFill style={{
        transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s / S}) translate(${-W / 2}px, ${-H / 2}px)`,
        clipPath: `path('${roundRectPath(W / 2 - cw / 2, H / 2 - ch / 2, cw, ch, (box.r ?? 0) * S)}')`, opacity: clamp(p / 0.12),
      }}>
        {children}
      </AbsoluteFill>
    );
  },
});

/**
 * A match cut: both scenes zoom around the same point (the matched object) while the picture cuts
 * in the middle, so the eye stays on the object. Keep it short (6–10 frames).
 */
export const matchZoom = ({ x = 0.5, y = 0.5, amount = 0.14 }: { x?: number; y?: number; amount?: number } = {}): TransitionKind => ({
  name: 'match-zoom',
  blur: 4,
  ease: ease.linear,
  render: ({ p, side, width, height, children }) => {
    const s = side === 'out' ? 1 + amount * ease.in(clamp(p)) : 1 - amount * (1 - ease.out(clamp(p)));
    return (
      <AbsoluteFill style={{ transformOrigin: `${x * width}px ${y * height}px`, transform: `scale(${s})`, opacity: side === 'out' ? 1 : smoothstep(0.4, 0.6, p) }}>
        {children}
      </AbsoluteFill>
    );
  },
});

/** Warm light floods across the frame and the new scene comes up through it. */
export const lightLeak = ({ tint = ['#FF6A3D', '#FFC46B', '#FF3D7F'], seed = 'leak' }: { tint?: string[]; seed?: string } = {}): TransitionKind => ({
  name: 'light-leak',
  render: ({ p, side, width: W, height: H, children }) => {
    if (side === 'out') return <AbsoluteFill style={{ filter: `brightness(${1 + 0.8 * clamp(p)})` }}>{children}</AbsoluteFill>;
    const glows = tint.map((c, i) => {
      const x = (-0.3 + random(`${seed}-x${i}`) * 0.4 + clamp(p) * (0.9 + i * 0.3)) * W;
      const y = (0.15 + random(`${seed}-y${i}`) * 0.7) * H;
      return `radial-gradient(circle ${Math.round((0.35 + 0.18 * i) * Math.max(W, H))}px at ${x.toFixed(0)}px ${y.toFixed(0)}px, ${c}, transparent 70%)`;
    });
    return (
      <>
        <AbsoluteFill style={{ opacity: smoothstep(0.35, 0.7, p) }}>{children}</AbsoluteFill>
        <AbsoluteFill style={{ background: glows.join(', '), mixBlendMode: 'screen', opacity: Math.sin(Math.PI * clamp(p)) }} />
      </>
    );
  },
});

/** Dip through a color (black by default): out, then in. */
export const dip = ({ color = '#000' }: { color?: string } = {}): TransitionKind => ({
  name: 'dip',
  render: ({ p, side, children }) => side === 'out'
    ? <><AbsoluteFill>{children}</AbsoluteFill><AbsoluteFill style={{ background: color, opacity: clamp(p * 2) }} /></>
    : <AbsoluteFill style={{ opacity: clamp(p * 2 - 1) }}>{children}</AbsoluteFill>,
});

export const crossfade = (): TransitionKind => ({
  name: 'crossfade',
  render: ({ p, side, children }) => <AbsoluteFill style={{ opacity: side === 'out' ? 1 : clamp(p) }}>{children}</AbsoluteFill>,
});
