import React from 'react';
import { Network } from 'lucide';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Atmosphere } from '../shared/Atmosphere';
import { FONT, M, S, rampAt } from '../shared/type';
import { DrawIcon, IconTile } from '../shared/DrawIcon';
import { Move, Split, Stage, add, constant, ease, follow, spring, springs, stagger, tween, windup } from 'cuekitvoltz';
import type { Motion, Unit } from 'cuekitvoltz';
import { BASE_CARD_AT, BASE_CARD_Y, CARDS } from './Baseline';

// The "after" of the lab: the baseline's content and cue frames, rebuilt on the kit's motion core.
//  - cards arrive on a spring that is already moving (they were travelling off-screen) and settle
//    with a small overshoot; their contents trail behind (follow-through) and the tile pops
//  - glyphs rise on springs with a weight swell; "six" drops in with a bounce
//  - everything that moves gets motion blur from its own velocity
//  - the exit winds up (anticipation), then whips up top-first, so nothing crosses on the way out
// Small text follows the 30 px platform minimum that layout QA enforces (the baseline uses 26/28 px).
export const EXIT_AT = 99;

export const afterCardX = (i: number, fps: number): Motion =>
  spring({ at: BASE_CARD_AT[i], fps, from: 1180, to: 90, duration: 0.62, bounce: 0.25, velocity: 2.2 });

/** The shared exit: a small dip, then an accelerating whip up. `order` 0 (the top) leaves first. */
const exitY = (order: number): Motion => {
  const at = EXIT_AT + order * 1.6;
  return add(windup({ at, by: 26, frames: 6, release: 3 }), tween({ at, dur: 12, from: 0, to: -1700, ease: ease.in }));
};

export const AfterCard: React.FC<{ i: number }> = ({ i }) => {
  const { fps } = useVideoConfig();
  const x = afterCardX(i, fps);
  const trail = follow(x, { fps, from: BASE_CARD_AT[i] - 1 });
  const at = BASE_CARD_AT[i];
  return (
    <Move x={x} y={add(constant(BASE_CARD_Y[i]), exitY(3 + i))} stretch={0.0008}>
      <div style={{
        width: 900, height: 220, borderRadius: 36, display: 'flex', alignItems: 'center', padding: '0 40px',
        background: 'rgba(20,20,30,0.78)', border: '1.5px solid rgba(255,255,255,0.14)', boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
      }}>
        <Move layout="inline" shutter={0} x={(f) => (trail(f) - x(f)) * 0.35}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <Move layout="inline" shutter={0} scale={spring({ at: at + 7, fps, from: 0.55, to: 1, ...springs.pop })}>
              <IconTile icon={CARDS[i].icon} size={140} at={at + 4} />
            </Move>
            <div>
              <div style={S(60, 700)}>{CARDS[i].title}</div>
              <div style={M(30, 500, { marginTop: 14 })}>{CARDS[i].sub}</div>
            </div>
          </div>
        </Move>
      </div>
    </Move>
  );
};

export const BaselineAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = (from: number) => (i: number, n: number): Unit => {
    const at = from + stagger(i, n, { each: 1.1 });
    return { y: spring({ at, fps, from: 62, to: 0, ...springs.snappy }), opacity: tween({ at, dur: 5 }), weight: tween({ at, dur: 16, from: 300, to: 760 }) };
  };
  const drop = (i: number, n: number): Unit => {
    const at = 22 + stagger(i, n, { each: 1.6 });
    return {
      y: spring({ at, fps, from: -90, to: 0, ...springs.bouncy }), rotate: spring({ at, fps, from: -14, to: 0, ...springs.bouncy }), opacity: tween({ at, dur: 4 }),
      style: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: '1.16em', letterSpacing: '-0.02em', color: rampAt('spectrum', i / 2) },
    };
  };
  return (
    <Stage background="#000">
      <Atmosphere palette="indigo" />
      <Move x={constant(90)} y={add(constant(244), tween({ at: 4, dur: 14, from: -24, to: 0 }), exitY(0))} scale={spring({ at: 4, fps, from: 0.7, to: 1, ...springs.pop })} opacity={tween({ at: 4, dur: 8 })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px 12px 18px', borderRadius: 999, background: 'rgba(14,14,20,0.72)', border: '1.5px solid rgba(255,255,255,0.14)' }}>
          <DrawIcon icon={Network} size={36} at={6} dur={18} color="#C9C7D6" stroke={1.8} />
          <div style={M(30, 500, { color: '#C9C7D6', letterSpacing: '0.14em' })}>System design</div>
        </div>
      </Move>
      <Move x={constant(90)} y={add(constant(340), exitY(1))}>
        <div style={S(104, 760)}><Split text="One request," unit={rise(10)} /></div>
      </Move>
      <Move x={constant(90)} y={add(constant(452), exitY(2))}>
        <div style={S(104, 760)}>
          <Split text="six" count={8} unit={drop} />
          <Split text=" hops." start={3} count={8} unit={rise(22)} />
        </div>
      </Move>
      {[0, 1].map((i) => (
        <Move key={i} x={constant(158)} y={add(constant(BASE_CARD_Y[i] + 220), exitY(4 + i))}>
          <div style={{ width: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)', height: tween({ at: BASE_CARD_AT[i + 1] + 4, dur: 12, from: 0, to: 40 })(frame) }} />
        </Move>
      ))}
      {CARDS.map((_, i) => <AfterCard key={i} i={i} />)}
    </Stage>
  );
};
