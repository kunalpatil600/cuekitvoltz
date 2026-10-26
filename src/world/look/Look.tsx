import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { hexToRgb } from '../../core/color';
import { cssId } from '../../motion/smear';

// Style packs: procedural treatments (SVG filters and noise, no image files) that change how a whole
// scene reads. Filters that rework colors (Halftone, Duotone) need an opaque scene under them.

const LUMA = '0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 0 1';
const Defs: React.FC<{ children: React.ReactNode }> = ({ children }) => <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>{children}</svg>;

/** Film grain over everything below: fractal noise re-seeded every frame, so it boils like film. */
export const Grain: React.FC<{ amount?: number; scale?: number }> = ({ amount = 0.35, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = cssId('grain', useId());
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity: amount }}>
      <svg width={width} height={height}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={0.9 / scale} numOctaves={2} seed={frame % 97} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Paper fibre: a still, low-frequency texture multiplied over the scene. */
export const Paper: React.FC<{ amount?: number; seed?: number }> = ({ amount = 0.25, seed = 7 }) => {
  const { width, height } = useVideoConfig();
  const id = cssId('paper', useId());
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'multiply', opacity: amount }}>
      <svg width={width} height={height}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves={4} seed={seed} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.92  -1.4 0 0 0 1.25" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ amount?: number }> = ({ amount = 0.55 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,${amount}) 100%)` }} />
);

/**
 * Print halftone: the scene becomes a dot screen, dots growing in the dark areas. Ink takes the
 * scene's own color (a touch darker), the gaps a lightened tint of it, like colour print on paper.
 */
export const Halftone: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 9, children }) => {
  const id = cssId('ht', useId());
  // the dot screen is built inside the filter (feImage won't load data URIs in a CSS filter): a tiny
  // white seed blurred within one tile is a radial falloff; normalized and tiled, it's the screen
  const sigma = size / 4;
  const peak = 4 / (2 * Math.PI * sigma * sigma);
  const tile = { x: 0, y: 0, width: size, height: size };
  const lin = (slope: number, intercept: number) => (
    <>
      <feFuncR type="linear" slope={slope} intercept={intercept} />
      <feFuncG type="linear" slope={slope} intercept={intercept} />
      <feFuncB type="linear" slope={slope} intercept={intercept} />
    </>
  );
  return (
    <>
      <Defs>
        <filter id={id} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x={0} y={0} width={10000} height={10000} colorInterpolationFilters="sRGB">
          <feFlood floodColor="#fff" x={size / 2 - 1} y={size / 2 - 1} width={2} height={2} result="seed" />
          <feGaussianBlur in="seed" stdDeviation={sigma} {...tile} result="soft" />
          <feColorMatrix in="soft" type="matrix" values="0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1" {...tile} result="raw" />
          <feComponentTransfer in="raw" {...tile} result="tile">{lin(1 / peak, 0)}</feComponentTransfer>
          <feTile in="tile" result="screen" />
          {/* arithmetic composites touch alpha too: screen − lum would zero it, so add (1 − lum) and take 1 off */}
          <feColorMatrix in="SourceGraphic" type="matrix" values="-0.3 -0.59 -0.11 0 1  -0.3 -0.59 -0.11 0 1  -0.3 -0.59 -0.11 0 1  0 0 0 0 1" result="dark" />
          <feComposite in="screen" in2="dark" operator="arithmetic" k1={0} k2={1} k3={1} k4={-1} result="diff" />
          <feComponentTransfer in="diff" result="dots">{lin(40, 0)}<feFuncA type="linear" slope={0} intercept={1} /></feComponentTransfer>
          <feComponentTransfer in="dots" result="gaps">{lin(-1, 1)}</feComponentTransfer>
          <feComponentTransfer in="SourceGraphic" result="ink">{lin(0.85, 0)}</feComponentTransfer>
          <feComponentTransfer in="SourceGraphic" result="tint">{lin(0.5, 0.42)}</feComponentTransfer>
          <feComposite in="ink" in2="dots" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="inked" />
          <feComposite in="tint" in2="gaps" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="paper" />
          <feComposite in="inked" in2="paper" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} />
        </filter>
      </Defs>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </>
  );
};

/** Two-colour print: shadows take `dark`, highlights `light`. */
export const Duotone: React.FC<{ dark?: string; light?: string; children: React.ReactNode }> = ({ dark = '#16123A', light = '#FFC46B', children }) => {
  const id = cssId('duo', useId());
  const a = hexToRgb(dark).map((v) => (v / 255).toFixed(3)), b = hexToRgb(light).map((v) => (v / 255).toFixed(3));
  return (
    <>
      <Defs>
        <filter id={id} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={LUMA} />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${a[0]} ${b[0]}`} />
            <feFuncG type="table" tableValues={`${a[1]} ${b[1]}`} />
            <feFuncB type="table" tableValues={`${a[2]} ${b[2]}`} />
          </feComponentTransfer>
        </filter>
      </Defs>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </>
  );
};

/** Sticker look for objects and characters: a solid outline plus a hard offset shadow. Soft, faint pixels (blurred shadows under 50% opacity) don't get outlined. */
export const Outline: React.FC<{ width?: number; color?: string; shadow?: [number, number]; shadowColor?: string; children: React.ReactNode }> = ({ width = 7, color = '#F5F5F7', shadow = [10, 12], shadowColor = 'rgba(0,0,0,0.55)', children }) => {
  const id = cssId('ol', useId());
  return (
    <>
      <Defs>
        <filter id={id} filterUnits="userSpaceOnUse" x={-4000} y={-4000} width={12000} height={12000}>
          <feComponentTransfer in="SourceAlpha" result="solid"><feFuncA type="discrete" tableValues="0 1" /></feComponentTransfer>
          <feMorphology in="solid" operator="dilate" radius={width} result="grow" />
          <feFlood floodColor={color} />
          <feComposite in2="grow" operator="in" result="ring" />
          <feOffset in="ring" dx={shadow[0]} dy={shadow[1]} result="moved" />
          <feFlood floodColor={shadowColor} />
          <feComposite in2="moved" operator="in" result="drop" />
          <feMerge>
            <feMergeNode in="drop" />
            <feMergeNode in="ring" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </Defs>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </>
  );
};

export type LookPack = 'flat' | 'film' | 'print' | 'duotone';

/**
 * A whole-scene style pack over its children:
 *   flat     as drawn
 *   film     vignette + boiling grain
 *   print    halftone dots + paper fibre + light grain
 *   duotone  two-colour print + grain
 */
export const Look: React.FC<{ pack?: LookPack; duotone?: [string, string]; children: React.ReactNode }> = ({ pack = 'flat', duotone, children }) => {
  if (pack === 'film') return <AbsoluteFill>{children}<Vignette /><Grain amount={0.3} /></AbsoluteFill>;
  if (pack === 'print') return <AbsoluteFill><Halftone size={8}>{children}</Halftone><Paper amount={0.3} /><Grain amount={0.15} /></AbsoluteFill>;
  if (pack === 'duotone') return <AbsoluteFill><Duotone dark={duotone?.[0]} light={duotone?.[1]}>{children}</Duotone><Grain amount={0.22} /></AbsoluteFill>;
  return <AbsoluteFill>{children}</AbsoluteFill>;
};
