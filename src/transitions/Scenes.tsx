import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp } from '../core/motion';
import { MotionBlur } from '../motion/MotionBlur';
import { ease } from '../motion/ease';
import type { EaseFn } from '../motion/ease';
import { springValue } from '../motion/spring';
import type { SpringConfig } from '../motion/spring';

export type Side = 'out' | 'in';

/** What a transition kind gets each frame for one side of the cut. */
export type PresentArgs = {
  /** Progress 0 → 1 through the cut (a spring may overshoot). */
  p: number;
  /** Progress covered over the last half frame (a 180° shutter): multiply by a travel distance to get a smear. */
  dp: number;
  side: Side;
  width: number;
  height: number;
  children: React.ReactNode;
};

export type TransitionKind = {
  name: string;
  render: (a: PresentArgs) => React.ReactNode;
  /** Default timing when the Cut doesn't set one. */
  ease?: EaseFn;
  /** Sub-frame MotionBlur samples while the cut runs (for zooms and spins); 1 = off. */
  blur?: number;
  /** Which side draws on top (default: the entering scene). */
  top?: Side;
};

type CutProps = { duration: number; kind: TransitionKind; ease?: EaseFn; spring?: SpringConfig };

/** A scene in <Scenes>: `duration` frames, overlapped by the cuts on either side. */
export const Scene: React.FC<{ duration: number; name?: string; children: React.ReactNode }> = () => null;
/** A transition between the scenes around it, `duration` frames long, timed by `ease` or `spring`. */
export const Cut: React.FC<CutProps> = () => null;

/** Total length of a scene list: scenes minus the overlaps their cuts take. */
export const scenesLength = (scenes: number[], cuts: number[]) => scenes.reduce((s, d) => s + d, 0) - cuts.reduce((s, d) => s + d, 0);

const Present: React.FC<{ cut: CutProps; side: Side; offset: number; children: React.ReactNode }> = ({ cut, side, offset, children }) => {
  const f = useCurrentFrame() - offset;
  const { width, height, fps } = useVideoConfig();
  const curve = cut.ease ?? cut.kind.ease ?? ease.inOut;
  const prog = (x: number) => (cut.spring ? springValue(x / fps, cut.spring) : curve(clamp(x / cut.duration)));
  const p = prog(f);
  return <>{cut.kind.render({ p, dp: p - prog(f - 0.5), side, width, height, children })}</>;
};

const SceneSide: React.FC<{ enter?: CutProps; exit?: CutProps; duration: number; children: React.ReactNode }> = ({ enter, exit, duration, children }) => {
  const f = useCurrentFrame();
  const cut = exit && f >= duration - exit.duration ? { spec: exit, side: 'out' as const, offset: duration - exit.duration }
    : enter && f < enter.duration ? { spec: enter, side: 'in' as const, offset: 0 } : null;
  if (!cut) return <AbsoluteFill>{children}</AbsoluteFill>;
  // progress is read from the frame inside MotionBlur, so its sub-frame samples see the cut move
  return (
    <MotionBlur samples={cut.spec.kind.blur ?? 1}>
      <Present cut={cut.spec} side={cut.side} offset={cut.offset}>{children}</Present>
    </MotionBlur>
  );
};

/**
 * A frame-driven scene timeline, like TransitionSeries: each <Cut> overlaps the end of the scene
 * before it and the start of the one after, and both scenes render through the cut's kind. Because
 * progress comes from the frame, MotionBlur's sub-frame samples work through transitions. Every
 * scene should paint its own background.
 *
 *   <Scenes>
 *     <Scene duration={90}><A /></Scene>
 *     <Cut duration={20} kind={zoomThrough({ box })} />
 *     <Scene duration={120}><B /></Scene>
 *   </Scenes>
 */
export const Scenes: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const list: { el: React.ReactElement<{ duration: number; name?: string; children: React.ReactNode }>; start: number; enter?: CutProps; exit?: CutProps }[] = [];
  let t = 0;
  let pending: CutProps | undefined;
  for (const el of React.Children.toArray(children)) {
    if (!React.isValidElement(el)) continue;
    if (el.type === Cut) {
      const cut = el.props as CutProps;
      const prev = list[list.length - 1];
      if (!prev || cut.duration > prev.el.props.duration) throw new Error(`<Cut ${cut.kind.name}> needs a longer scene before it`);
      prev.exit = cut;
      pending = cut;
      t -= cut.duration;
    } else if (el.type === Scene) {
      const scene = el as React.ReactElement<{ duration: number; name?: string; children: React.ReactNode }>;
      list.push({ el: scene, start: t, enter: pending });
      t += scene.props.duration;
      pending = undefined;
    }
  }
  return (
    <>
      {list.map(({ el, start, enter, exit }, i) => {
        const d = el.props.duration;
        const exiting = exit && frame >= start + d - exit.duration && frame < start + d;
        return (
          <Sequence key={i} from={start} durationInFrames={d} name={el.props.name ?? `scene ${i + 1}`} style={exiting && exit.kind.top === 'out' ? { zIndex: 1 } : undefined}>
            <SceneSide enter={enter} exit={exit} duration={d}>{el.props.children}</SceneSide>
          </Sequence>
        );
      })}
    </>
  );
};
