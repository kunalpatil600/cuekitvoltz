import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, M, S } from '../shared/type';
import {
  Laptop3D, Phone3D, Scene3D, ScreenOverlay, Split, Stage, add, laptopRig, mixRigs, orbit, phoneRig, spring, springs, stagger, tween,
} from 'cuekitvoltz';
import type { Dof3D, Motion, Unit } from 'cuekitvoltz';

// cuekitvoltz 3D in use (shorts, warm palette): a product shot with live UI on the devices.
//   0–100    the laptop opens, its dashboard boots (React on the glass), the camera pushes in
//   100–190  a phone flies in with motion blur, the camera moves to it, focus racks over
//   190–end  wide shot of both, end card
export const THREE_REEL_DURATION = 285;
const P = { brown: '#5B4632', sand: '#F4D9A0', copper: '#C8792C', ink: '#1C150F', deep: '#120D09' };

const laptop = laptopRig({ position: [0, 0, 0], rotation: [0, 12, 0], open: spring({ at: 14, fps: 30, duration: 1.1, bounce: 0.22 }) });
const phone = phoneRig({
  position: [
    spring({ at: 112, fps: 30, from: 4.2, to: 1.2, duration: 0.9, bounce: 0.18 }),
    add(spring({ at: 112, fps: 30, from: 3.6, to: 0.98, duration: 0.9, bounce: 0.18 }), (f) => Math.sin(f * 0.06) * 0.03),
    spring({ at: 112, fps: 30, from: 3.2, to: 1.25, duration: 0.9, bounce: 0.18 }),
  ],
  rotation: [(f) => -6 + Math.sin(f * 0.05) * 1.5, spring({ at: 112, fps: 30, from: -260, to: -16, duration: 1.0, bounce: 0.12 }), 4],
});

const shotA = orbit({ target: [0, 0.95, -0.4], az: tween({ at: 0, dur: 100, from: 36, to: 12 }), el: tween({ at: 0, dur: 100, from: 22, to: 7 }), dist: tween({ at: 0, dur: 100, from: 13, to: 9.4 }), fov: 30 });
const shotB = orbit({ target: [1.15, 1.5, 1.25], az: (f) => 4 - (f - 100) * 0.05, el: 4, dist: 5.6, fov: 30, focus: 5.65 });
const shotC = orbit({ target: [0.35, 1.25, 0.1], az: (f) => 16 - (f - 190) * 0.06, el: 10, dist: 11.6, fov: 30 });
const camera = mixRigs(mixRigs(shotA, shotB, spring({ at: 102, fps: 30, duration: 1.3, bounce: 0 })), shotC, spring({ at: 192, fps: 30, duration: 1.4, bounce: 0 }));
const dof: Dof3D = { aperture: 14, maxBlur: 16 };

const useRise = () => {
  const { fps } = useVideoConfig();
  return (from: number) => (i: number, n: number): Unit => {
    const at = from + stagger(i, n, { each: 1.1 });
    return { y: spring({ at, fps, from: 60, to: 0, ...springs.snappy }), opacity: tween({ at, dur: 5 }), weight: tween({ at, dur: 16, from: 300, to: 760 }) };
  };
};

/** Headline pair that rises in at `at` and fades out at `out`. */
const Headline: React.FC<{ a: string; b: string; at: number; out: number }> = ({ a, b, at, out }) => {
  const frame = useCurrentFrame();
  const rise = useRise();
  const o = 1 - tween({ at: out, dur: 8 })(frame);
  if (frame < at - 2 || o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 90, top: 300, opacity: o }}>
      <div style={{ ...S(104, 760, { color: P.sand }) }}><Split text={a} unit={rise(at)} /></div>
      <div style={{ ...S(104, 760), marginTop: 6 }}>
        <Split text={b} unit={(i, n) => ({ ...rise(at + 6)(i, n), weight: undefined, style: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: '1.14em', color: P.copper } })} />
      </div>
    </div>
  );
};

const BARS = [32, 45, 38, 56, 50, 64, 58, 72, 66, 80, 74, 92];
const ORDERS = [['#1042', 'Asha', '$120'], ['#1043', 'Ravi', '$86'], ['#1044', 'Meera', '$240'], ['#1045', 'Kabir', '$64']];

/** The dashboard on the laptop (plain React, 1280×800). */
const LaptopUi: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = tween({ at, dur: 10 })(frame);
  const revenue = Math.round(48210 * tween({ at: at + 8, dur: 40, ease: (t) => 1 - Math.pow(1 - t, 3) })(frame));
  return (
    <AbsoluteFill style={{ background: P.ink, opacity: on, padding: 56, fontFamily: FONT.sans, color: P.sand }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: P.brown }} />)}
        <div style={{ ...M(24, 500, { color: '#A88E6A', marginLeft: 18, textTransform: 'none', letterSpacing: '0.04em' }) }}>acme / orders</div>
      </div>
      <div style={{ display: 'flex', gap: 56, marginTop: 44 }}>
        <div style={{ flex: 1.4 }}>
          <div style={{ ...M(22, 500, { color: P.copper, letterSpacing: '0.16em' }) }}>REVENUE TODAY</div>
          <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>${revenue.toLocaleString('en-US')}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 300, marginTop: 30 }}>
            {BARS.map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h * spring({ at: at + 10 + i * 2, fps, from: 0, to: 1, ...springs.smooth })(frame)}%`, borderRadius: 10, background: i === BARS.length - 1 ? P.copper : '#4A3826' }} />
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...M(22, 500, { color: P.copper, letterSpacing: '0.16em' }) }}>LATEST</div>
          {ORDERS.map((o, i) => {
            const t = spring({ at: at + 20 + i * 5, fps, from: 0, to: 1, ...springs.snappy })(frame);
            return (
              <div key={o[0]} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, padding: '22px 26px', borderRadius: 18, background: '#2A1F15', opacity: t, transform: `translateX(${(1 - t) * 60}px)`, fontSize: 34 }}>
                <span style={{ color: '#A88E6A', fontFamily: FONT.mono }}>{o[0]}</span><span>{o[1]}</span><span style={{ color: P.copper, fontWeight: 600 }}>{o[2]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** The phone app (372×804): a new-order notification drops in. */
const PhoneUi: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ at: at + 26, fps, from: -160, to: 0, ...springs.bouncy })(frame);
  return (
    <AbsoluteFill style={{ background: P.ink, fontFamily: FONT.sans, color: P.sand, padding: '64px 26px 26px' }}>
      <div style={{ ...M(18, 500, { color: '#A88E6A', letterSpacing: '0.14em' }) }}>ACME</div>
      <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 8 }}>Orders</div>
      <div style={{ marginTop: 26, padding: '22px 22px', borderRadius: 26, background: '#2A1F15', border: `2px solid ${P.copper}`, transform: `translateY(${drop}px)`, opacity: frame > at + 26 ? 1 : 0 }}>
        <div style={{ ...M(16, 500, { color: P.copper, letterSpacing: '0.14em' }) }}>NEW ORDER</div>
        <div style={{ fontSize: 44, fontWeight: 700, marginTop: 6 }}>$1,240</div>
        <div style={{ fontSize: 22, color: '#A88E6A', marginTop: 2 }}>#1046 · just now</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 220, marginTop: 40 }}>
        {BARS.slice(4).map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h * spring({ at: at + 10 + i * 2, fps, from: 0, to: 1, ...springs.smooth })(frame)}%`, borderRadius: 8, background: i === 7 ? P.copper : '#4A3826' }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const ThreeReel: React.FC = () => {
  const frame = useCurrentFrame();
  const endIn: Motion = tween({ at: 214, dur: 10 });
  return (
    <Stage background={P.deep}>
      <Scene3D
        camera={camera} studio="warm" shadow={0.55} blur={{ samples: 6, shutter: 0.5 }}
        background={{ top: '#5B4632', bottom: '#1A130D', glow: 'rgba(244,217,160,0.28)', glowAt: [0.5, 0.42], glowSize: 0.75 }}
        post={{ bloom: { strength: 0.45, radius: 0.6, threshold: 1.4 }, dof, aberration: 0.5, vignette: 0.4 }}
      >
        <Laptop3D rig={laptop} finish="silver" screen={P.ink} glow={0.4} />
        {frame >= 108 && <Phone3D rig={phone} finish={{ color: P.brown, roughness: 0.35, metalness: 0.85, clearcoat: 0.6 }} screen={P.ink} glow={0.4} />}
      </Scene3D>
      <ScreenOverlay camera={camera} quad={laptop.screen} width={1280} height={800} radius={14} dof={dof} occluders={frame >= 108 ? [phone.outline] : []}>
        <LaptopUi at={30} />
      </ScreenOverlay>
      {frame >= 108 && (
        <ScreenOverlay camera={camera} quad={phone.screen} width={372} height={804} radius={46} dof={dof}>
          <PhoneUi at={118} />
        </ScreenOverlay>
      )}
      <Headline a="Your app," b="in 3D." at={6} out={96} />
      <Headline a="Live UI," b="on the glass." at={112} out={186} />
      <div style={{ position: 'absolute', left: 90, top: 300, opacity: endIn(frame) }}>
        <div style={{ ...M(30, 500, { color: P.sand, letterSpacing: '0.14em' }) }}>Built with</div>
        <div style={{ ...S(120, 760, { color: P.sand }), marginTop: 10 }}>
          cuekit<span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, color: P.copper }}>voltz</span>
        </div>
        <div style={{ ...M(30, 500, { color: '#C9B48E', marginTop: 18, textTransform: 'none', letterSpacing: '0.02em' }) }}>3D devices · live React UI · motion blur</div>
      </div>
    </Stage>
  );
};
