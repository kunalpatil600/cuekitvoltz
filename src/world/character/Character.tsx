import React, { useId } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { shade, withAlpha } from '../../core/color';
import type { Motion } from '../../core/motion';
import { Move } from '../../motion/Move';
import { cssId } from '../../motion/smear';
import { blinkAt, poses } from './rig';
import type { Face, Limb, Pose } from './rig';
import type { Viseme } from '../../voice/track';

export type HairStyle = 'short' | 'bun' | 'curly' | 'long' | 'cap' | 'bald';
export type CharacterLook = { skin: string; hair: string; shirt: string; pants: string; shoes: string; hairStyle: HairStyle; glasses?: boolean; accent?: string };

/** Generic characters (no real people): mix and match freely. */
export const characterLooks = {
  dev: { skin: '#E8B48A', hair: '#2A1E1A', shirt: '#5AC8FA', pants: '#2B2F45', shoes: '#F5F5F7', hairStyle: 'short', glasses: true },
  designer: { skin: '#C68B5E', hair: '#151018', shirt: '#FF6FB5', pants: '#1F2236', shoes: '#FFB340', hairStyle: 'bun' },
  founder: { skin: '#8D5A3B', hair: '#0E0B0C', shirt: '#7D7AFF', pants: '#2A2A3A', shoes: '#E6E6EE', hairStyle: 'curly' },
  student: { skin: '#F2C9A0', hair: '#6B3E26', shirt: '#34D399', pants: '#26324A', shoes: '#2A2A3A', hairStyle: 'long' },
  ops: { skin: '#D9A07A', hair: '#3A2A20', shirt: '#FFB340', pants: '#303447', shoes: '#1E1E28', hairStyle: 'cap', accent: '#FF3B4E' },
} satisfies Record<string, CharacterLook>;

// rig geometry (local units, y down, origin between the hips)
const SHOULDER_Y = -146, SHOULDER_X = 48, HIP_X = 24, NECK_Y = -178, HEAD_Y = -240, HEAD_R = 66;
const UPPER = 70, FORE = 64, THIGH = 74, SHIN = 72;
const VB = { x: -230, y: -360, w: 460, h: 535 };
/** Where the feet touch the ground, as a fraction of the character's height. */
const GROUND = (159 - VB.y) / VB.h;

const INK = '#1B1B24';

const Hair: React.FC<{ look: CharacterLook; layer: 'back' | 'front' }> = ({ look, layer }) => {
  const c = look.hair;
  if (look.hairStyle === 'bald') return null;
  if (layer === 'back') {
    if (look.hairStyle === 'long') return <path d="M-72,-250 C-80,-190 -76,-150 -60,-140 L60,-140 C76,-150 80,-190 72,-250 Z" fill={shade(c, 0.85)} />;
    if (look.hairStyle === 'bun') return <circle cx={0} cy={-320} r={26} fill={c} />;
    return null;
  }
  if (look.hairStyle === 'curly') {
    const curls = Array.from({ length: 11 }, (_, i) => {
      const a = Math.PI * (1.02 + (i / 10) * 0.96);
      return <circle key={i} cx={Math.cos(a) * 60} cy={HEAD_Y - 6 + Math.sin(a) * 58} r={i % 2 ? 22 : 25} fill={c} />;
    });
    return <g>{curls}<circle cx={0} cy={-292} r={34} fill={c} /></g>;
  }
  if (look.hairStyle === 'cap') {
    const cap = look.accent ?? '#FF3B4E';
    return (
      <g>
        <path d="M-68,-246 C-66,-318 66,-318 68,-246 Z" fill={cap} />
        <path d="M-68,-246 C-30,-256 30,-256 68,-246" fill="none" stroke={shade(cap, 0.7)} strokeWidth={5} />
        <ellipse cx={14} cy={-244} rx={70} ry={11} fill={shade(cap, 0.8)} />
        <circle cx={0} cy={-306} r={6} fill={shade(cap, 0.7)} />
      </g>
    );
  }
  // short / bun / long share the front shape
  return <path d="M-70,-228 C-76,-296 -30,-320 4,-316 C46,-312 78,-288 70,-226 C62,-250 40,-266 10,-266 C-20,-266 -50,-254 -70,-228 Z" fill={c} />;
};

const Eyes: React.FC<{ face: Face; open: number; gaze: [number, number] }> = ({ face, open, gaze }) => {
  const eye = (x: number) => {
    if (face.eyes === 'happy') return <path key={x} d={`M${x - 9},-240 Q${x},-252 ${x + 9},-240`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    if (face.eyes === 'closed' || open < 0.15) return <path key={x} d={`M${x - 8},-243 L${x + 8},-243`} stroke={INK} strokeWidth={4.5} strokeLinecap="round" />;
    const r = face.eyes === 'wide' ? 9.5 : 7.5;
    const px = x + gaze[0] * 3, py = -244 + gaze[1] * 3;
    return (
      <g key={x}>
        <ellipse cx={px} cy={py} rx={r} ry={r * open} fill={INK} />
        {open > 0.6 && <circle cx={px - 2.4} cy={py - 2.6} r={2.4} fill="#fff" />}
      </g>
    );
  };
  return <g>{eye(-23)}{eye(23)}</g>;
};

const TONGUE = '#D9606E';
const TEETH = '#FFFFFF';

/** Mouth shapes for lip-sync (codes from the voice director); `k` is how open (0–1). */
const VisemeMouth: React.FC<{ v: Viseme; k: number }> = ({ v, k }) => {
  const o = Math.max(0.15, Math.min(1, k));
  const line = { fill: 'none', stroke: INK, strokeWidth: 5, strokeLinecap: 'round' as const };
  switch (v) {
    case 'M': return <path d="M-13,-211 Q0,-208 13,-211" {...line} />;
    case 'F': return <g><ellipse cx={0} cy={-210} rx={12} ry={3.5} fill={INK} /><rect x={-9} y={-214} width={18} height={3.2} rx={1.5} fill={TEETH} /></g>;
    case 'U': return <ellipse cx={0} cy={-209} rx={5.5} ry={5 + o * 3} fill={INK} />;
    case 'O': return <ellipse cx={0} cy={-209} rx={8 + o} ry={6 + o * 7} fill={INK} />;
    case 'E': {
      const ry = 3 + o * 6;
      return <g><ellipse cx={0} cy={-210} rx={15} ry={ry} fill={INK} /><rect x={-11} y={-210 - ry} width={22} height={Math.min(3.5, ry)} rx={1.5} fill={TEETH} /></g>;
    }
    case 'A': {
      const ry = 5 + o * 10;
      return <g><ellipse cx={0} cy={-209} rx={12} ry={ry} fill={INK} /><ellipse cx={0} cy={-209 + ry * 0.55} rx={7} ry={ry * 0.35} fill={TONGUE} /></g>;
    }
    case 'L': {
      const ry = 4 + o * 7;
      return <g><ellipse cx={0} cy={-210} rx={11} ry={ry} fill={INK} /><ellipse cx={0} cy={-210 - ry * 0.45} rx={5} ry={ry * 0.3} fill={TONGUE} /></g>;
    }
    default: {
      const ry = 2.5 + o * 4;
      return <g><ellipse cx={0} cy={-210} rx={13} ry={ry} fill={INK} /><rect x={-9} y={-210 - ry} width={18} height={Math.min(3, ry)} rx={1.5} fill={TEETH} /></g>;
    }
  }
};

const Mouth: React.FC<{ face: Face; talk: number; viseme?: Viseme }> = ({ face, talk, viseme }) => {
  if (viseme && viseme !== 'X') return <VisemeMouth v={viseme} k={talk} />;
  if (!viseme && talk > 0.05) return <ellipse cx={0} cy={-210} rx={9 + talk * 3} ry={2 + talk * 10} fill={INK} />;
  const stroke = { fill: 'none', stroke: INK, strokeWidth: 4.5, strokeLinecap: 'round' as const };
  switch (face.mouth) {
    case 'grin': return <path d="M-19,-217 Q0,-190 19,-217 Z" fill={INK} />;
    case 'flat': return <path d="M-11,-211 L11,-211" {...stroke} />;
    case 'o': return <ellipse cx={0} cy={-209} rx={7} ry={9} fill={INK} />;
    case 'frown': return <path d="M-14,-204 Q0,-217 14,-204" {...stroke} />;
    default: return <path d="M-16,-215 Q0,-200 16,-215" {...stroke} />;
  }
};

/** An arm or a leg: two segments from a joint. Screen-left limbs have side 1 (outward = clockwise), screen-right −1. */
const Limb2: React.FC<{ at: [number, number]; angles: Limb; side: 1 | -1; upper: number; lower: number; width: [number, number]; color: [string, string]; end: React.ReactNode }> = ({ at, angles, side, upper, lower, width, color, end }) => (
  <g transform={`translate(${at[0]} ${at[1]}) rotate(${side * angles[0]})`}>
    <g transform={`translate(0 ${upper}) rotate(${side * angles[1]})`}>
      <line x1={0} y1={0} x2={0} y2={lower} stroke={color[1]} strokeWidth={width[1]} strokeLinecap="round" />
      <g transform={`translate(0 ${lower})`}>{end}</g>
    </g>
    <line x1={0} y1={0} x2={0} y2={upper} stroke={color[0]} strokeWidth={width[0]} strokeLinecap="round" />
  </g>
);

/**
 * A flat, geometric character driven by a pose (see performance() and gestures in rig.ts). It
 * blinks on its own, breathes, can look around (`gaze`, −1…1) and talk (`talk`, mouth open 0–1:
 * feed it the voice-over's loudness or word timings). With `viseme` (from voiceTrack) the mouth also
 * takes the shape of each sound: closed on m/b/p, round on o, wide on e, and so on. (x, y) is the point between its feet; `size`
 * is its full height in px. Moving x/y gets motion blur like Move.
 */
export const Character: React.FC<{
  pose?: Motion<Pose>; face?: (f: number) => Face; look?: CharacterLook; size?: number; x?: Motion; y?: Motion;
  talk?: Motion; viseme?: Motion<Viseme>; gaze?: Motion<[number, number]>; blink?: boolean; breathe?: boolean; flip?: boolean; seed?: string;
  /** The soft ground shadow. Turn it off inside an Outline (or draw your own). */
  shadow?: boolean;
}> = ({ pose, face, look = characterLooks.dev, size = 520, x = () => 540, y = () => 1300, talk, viseme, gaze, blink = true, breathe = true, flip = false, seed = 'char', shadow = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gid = cssId('chr', useId());
  const p = pose ? pose(frame) : poses.idle.pose;
  const fc = face ? face(frame) : (poses.idle.face as Face);
  const breath = breathe ? Math.sin((frame / fps) * ((Math.PI * 2) / 3.2)) : 0;
  const open = blink ? blinkAt(frame, seed) : 1;
  const w = (size * VB.w) / VB.h;
  const shoulderY = SHOULDER_Y - p.shrug - breath * 1.5;
  const shoe = (side: 1 | -1, leg: Limb) => (
    <g transform={`rotate(${-side * (leg[0] + leg[1])})`}>
      <ellipse cx={side * -7} cy={4} rx={25} ry={13} fill={look.shoes} />
    </g>
  );
  const hand = <circle cx={0} cy={2} r={15} fill={look.skin} />;
  return (
    <Move x={(f) => x(f) - w / 2} y={(f) => y(f) - size * GROUND}>
      <svg width={w} height={size} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} style={{ overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={shade(look.shirt, 1.08)} />
            <stop offset="0.55" stopColor={look.shirt} />
            <stop offset="1" stopColor={shade(look.shirt, 0.78)} />
          </linearGradient>
        </defs>
        {shadow && <ellipse cx={0} cy={160} rx={110 - p.lift * 1.2} ry={16} fill="#000" opacity={0.28 - p.lift * 0.004} />}
        <g transform={`translate(0 ${-p.lift})`}>
          <Limb2 at={[-HIP_X, -4]} angles={p.legL} side={1} upper={THIGH} lower={SHIN} width={[32, 30]} color={[look.pants, look.pants]} end={shoe(1, p.legL)} />
          <Limb2 at={[HIP_X, -4]} angles={p.legR} side={-1} upper={THIGH} lower={SHIN} width={[32, 30]} color={[look.pants, look.pants]} end={shoe(-1, p.legR)} />
          <g transform={`rotate(${p.lean})`}>
            <Hair look={look} layer="back" />
            <rect x={-11} y={NECK_Y - 6} width={22} height={30} rx={8} fill={shade(look.skin, 0.85)} />
            <rect x={-56} y={-168 - p.shrug * 0.4} width={112} height={182 + p.shrug * 0.4} rx={46} fill={`url(#${gid})`} transform={`translate(0 ${-breath}) scale(1 ${1 + breath * 0.008})`} />
            <path d={`M-16,${-166 - p.shrug * 0.4} L0,${-146 - p.shrug * 0.4} L16,${-166 - p.shrug * 0.4}`} fill="none" stroke={shade(look.shirt, 0.72)} strokeWidth={5} strokeLinejoin="round" />
            <g transform={`translate(0 ${NECK_Y + p.shrug * 0.35 - breath}) rotate(${p.head}) translate(0 ${-NECK_Y})`}>
              <circle cx={-64} cy={-238} r={12} fill={shade(look.skin, 0.92)} />
              <circle cx={64} cy={-238} r={12} fill={shade(look.skin, 0.92)} />
              <circle cx={0} cy={HEAD_Y} r={HEAD_R} fill={look.skin} />
              <circle cx={-38} cy={-216} r={10} fill={withAlpha('#FF6F7F', 0.28)} />
              <circle cx={38} cy={-216} r={10} fill={withAlpha('#FF6F7F', 0.28)} />
              <Eyes face={fc} open={open} gaze={gaze ? gaze(frame) : [0, 0]} />
              {[-1, 1].map((s) => (
                <path key={s} d={`M${s * 14},${-262 - fc.brows * 6 + (fc.brows < 0 ? 4 : 0)} L${s * 33},${-264 - fc.brows * 6 - (fc.brows < 0 ? 3 : 0)}`} stroke={shade(look.hair, 1.1)} strokeWidth={5.5} strokeLinecap="round" />
              ))}
              <Mouth face={fc} talk={talk ? talk(frame) : 0} viseme={viseme?.(frame)} />
              {look.glasses && (
                <g fill="none" stroke={INK} strokeWidth={4}>
                  <rect x={-41} y={-258} width={36} height={28} rx={9} />
                  <rect x={5} y={-258} width={36} height={28} rx={9} />
                  <path d="M-5,-246 L5,-246" />
                </g>
              )}
              <Hair look={look} layer="front" />
            </g>
            <Limb2 at={[-SHOULDER_X, shoulderY]} angles={p.armL} side={1} upper={UPPER} lower={FORE} width={[28, 22]} color={[look.shirt, look.skin]} end={hand} />
            <Limb2 at={[SHOULDER_X, shoulderY]} angles={p.armR} side={-1} upper={UPPER} lower={FORE} width={[28, 22]} color={[look.shirt, look.skin]} end={hand} />
          </g>
        </g>
      </svg>
    </Move>
  );
};
