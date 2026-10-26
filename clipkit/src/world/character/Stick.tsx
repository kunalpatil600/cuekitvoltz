import React, { useId } from 'react';
import { useCurrentFrame } from 'remotion';
import type { Motion } from '../../core/motion';
import { Move } from '../../motion/Move';
import { cssId } from '../../motion/smear';
import { poses } from './rig';
import type { Limb, Pose } from './rig';

// A stick-figure astronaut on the same rig as <Character>: the same Pose, performance() and
// gestures drive it, so a scene can swap one for the other. Thick round-capped limbs, a filled head,
// an optional helmet ring and backpack. Space-explainer extras: `stretch` pulls it long and thin
// (spaghettification), `tumble` spins it about its middle, and `color` can be animated (red-shift).

const SHOULDER_Y = -104, NECK_Y = -116, HEAD_Y = -150, HEAD_R = 30;
const UPPER = 58, FORE = 54, THIGH = 66, SHIN = 64, LIMB_W = 15;
const VB = { x: -170, y: -230, w: 340, h: 400 };
/** the figure's middle (where x/y place it, and what it tumbles and stretches about) */
const MID_Y = -50;

type Value<T> = T | Motion<T>;
const at = <T,>(v: Value<T> | undefined, f: number, d: T): T => (v === undefined ? d : typeof v === 'function' ? (v as Motion<T>)(f) : v);

const Limb2: React.FC<{ from: [number, number]; angles: Limb; side: 1 | -1; upper: number; lower: number; color: string }> = ({ from, angles, side, upper, lower, color }) => (
  <g transform={`translate(${from[0]} ${from[1]}) rotate(${side * angles[0]})`}>
    <line x1={0} y1={0} x2={0} y2={upper} stroke={color} strokeWidth={LIMB_W} strokeLinecap="round" />
    <g transform={`translate(0 ${upper}) rotate(${side * angles[1]})`}>
      <line x1={0} y1={0} x2={0} y2={lower} stroke={color} strokeWidth={LIMB_W} strokeLinecap="round" />
    </g>
  </g>
);

export type StickProps = {
  pose?: Motion<Pose>;
  /** body colour (animatable, e.g. a red-shift) */
  color?: Value<string>;
  /** centre of the figure, in px */
  x?: Motion;
  y?: Motion;
  /** height from feet to helmet top, in px */
  size?: number;
  helmet?: boolean;
  backpack?: boolean;
  /** 1 = normal; 3 = three times as long and correspondingly thin */
  stretch?: Value<number>;
  /** spin about the middle, degrees */
  tumble?: Value<number>;
  opacity?: Value<number>;
  /** soft glow in the body colour (0 = none) */
  glow?: number;
  flip?: boolean;
};

export const Stick: React.FC<StickProps> = ({
  pose, color = '#0092FF', x = () => 540, y = () => 960, size = 360, helmet = true, backpack = true, stretch, tumble, opacity, glow = 0, flip = false,
}) => {
  const frame = useCurrentFrame();
  const gid = cssId('stick', useId());
  const p = pose ? pose(frame) : poses.idle.pose;
  const c = at(color, frame, '#0092FF');
  const s = Math.max(0.2, at(stretch, frame, 1));
  const rot = at(tumble, frame, 0);
  const o = at(opacity, frame, 1);
  const k = size / 322; // px per rig unit (feet to helmet top is ~322 units)
  const w = VB.w * k;
  const h = VB.h * k;
  const midPx = (MID_Y - VB.y) * k;
  return (
    <Move x={(f) => x(f) - w / 2} y={(f) => y(f) - midPx}>
      <svg width={w} height={h} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} style={{ overflow: 'visible', opacity: o }}>
        {glow > 0 && (
          <defs>
            <filter id={gid} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={6 * glow} result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        )}
        <g
          transform={`translate(0 ${MID_Y}) rotate(${rot}) scale(${(flip ? -1 : 1) / Math.sqrt(s)} ${s}) translate(0 ${-MID_Y})`}
          filter={glow > 0 ? `url(#${gid})` : undefined}
        >
          <g transform={`translate(0 ${-p.lift})`}>
            <Limb2 from={[0, 0]} angles={p.legL} side={1} upper={THIGH} lower={SHIN} color={c} />
            <Limb2 from={[0, 0]} angles={p.legR} side={-1} upper={THIGH} lower={SHIN} color={c} />
            <g transform={`rotate(${p.lean})`}>
              {backpack && <rect x={-30} y={SHOULDER_Y - 2} width={22} height={50} rx={7} fill="#CCD5E1" />}
              <line x1={0} y1={0} x2={0} y2={NECK_Y + 6 - p.shrug * 0.3} stroke={c} strokeWidth={LIMB_W + 1} strokeLinecap="round" />
              <g transform={`translate(0 ${NECK_Y}) rotate(${p.head}) translate(0 ${-NECK_Y})`}>
                <circle cx={0} cy={HEAD_Y} r={HEAD_R} fill={c} />
                {helmet && <circle cx={3} cy={HEAD_Y - 2} r={HEAD_R + 11} fill="rgba(255,255,255,0.05)" stroke="#E8F0FA" strokeWidth={5} />}
              </g>
              <Limb2 from={[0, SHOULDER_Y - p.shrug]} angles={p.armL} side={1} upper={UPPER} lower={FORE} color={c} />
              <Limb2 from={[0, SHOULDER_Y - p.shrug]} angles={p.armR} side={-1} upper={UPPER} lower={FORE} color={c} />
            </g>
          </g>
        </g>
      </svg>
    </Move>
  );
};
