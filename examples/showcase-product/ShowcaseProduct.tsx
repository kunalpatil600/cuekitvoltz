import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Sfx } from '../shared/Sfx';
import { FONT, M, S } from '../shared/type';
import {
  Captions, Laptop3D, Phone3D, Scene3D, ScreenOverlay, Split, Stage, add, handheld, laptopRig, mixRigs, orbit, phoneRig, spring, springs, stagger, tween, voiceTrack,
} from 'cuekitvoltz';
import type { Dof3D, Unit } from 'cuekitvoltz';
import vo from './vo.json';

// cuekitvoltz showcase (shorts, dark palette): a product shot told by the voice director.
//   hook    the closed laptop on a black stage, the camera drifts in
//   laptop  the lid opens on "laptop", the app boots on "glass" (live React on the screen)
//   phone   the phone flies in on "phone" with motion blur, focus racks to it
//   end     wide shot of both, the end card lands on "cuekitvoltz"
const P = { black: '#171717', green: '#06110C', red: '#A31C1B', hot: '#E0403C', text: '#ECE6DC', dim: '#9A938A', panel: '#1F1F1F' };
const FPS = 30;
export const VO = voiceTrack(vo, FPS);
export const PRODUCT_DURATION = VO.frames;
const T = { open: VO.at('open'), laptop: VO.at('laptop'), glass: VO.at('glass'), mobile: VO.at('mobile'), phone: VO.at('phone'), end: VO.at('end'), brand: VO.at('brand') };

const laptop = laptopRig({ position: [0, 0, 0], rotation: [0, 12, 0], open: spring({ at: T.laptop - 6, fps: FPS, duration: 1.1, bounce: 0.22 }) });
const fly = (from: number, to: number) => spring({ at: T.phone - 12, fps: FPS, from, to, duration: 0.9, bounce: 0.18 });
const phone = phoneRig({
  position: [fly(4.2, 1.2), add(fly(3.6, 0.98), (f) => Math.sin(f * 0.06) * 0.03), fly(3.2, 1.25)],
  rotation: [(f) => -6 + Math.sin(f * 0.05) * 1.5, spring({ at: T.phone - 12, fps: FPS, from: -260, to: -16, duration: 1.0, bounce: 0.12 }), 4],
});

const shotHook = orbit({ target: [-0.15, 0.35, 0.1], az: tween({ at: 0, dur: T.open, from: 34, to: 22 }), el: tween({ at: 0, dur: T.open, from: 26, to: 16 }), dist: tween({ at: 0, dur: T.open, from: 17, to: 13.5 }), fov: 30 });
const shotScreen = orbit({ target: [0, 0.95, -0.4], az: (f) => 13 - (f - T.open) * 0.03, el: 7, dist: 9.4, fov: 30 });
const shotPhone = orbit({ target: [1.15, 1.5, 1.25], az: (f) => 4 - (f - T.phone) * 0.05, el: 4, dist: 5.6, fov: 30, focus: 5.65 });
const shotWide = orbit({ target: [0.35, 1.25, 0.1], az: (f) => 16 - (f - T.end) * 0.06, el: 10, dist: 11.6, fov: 30 });
const mix = (at: number, d = 1.3) => spring({ at, fps: FPS, duration: d, bounce: 0 });
const camera = handheld(mixRigs(mixRigs(mixRigs(shotHook, shotScreen, mix(T.open - 2, 1.2)), shotPhone, mix(T.phone - 4)), shotWide, mix(T.end - 2, 1.4)), { amount: 0.35 });
const dof: Dof3D = { aperture: 14, maxBlur: 16 };

const useRise = () => {
  const { fps } = useVideoConfig();
  return (from: number) => (i: number, n: number): Unit => {
    const at = from + stagger(i, n, { each: 1.1 });
    return { y: spring({ at, fps, from: 60, to: 0, ...springs.snappy }), opacity: tween({ at, dur: 5 }), weight: tween({ at, dur: 16, from: 300, to: 760 }) };
  };
};

const Headline: React.FC<{ a: string; b: string; at: number; bAt: number; out: number }> = ({ a, b, at, bAt, out }) => {
  const frame = useCurrentFrame();
  const rise = useRise();
  const o = 1 - tween({ at: out, dur: 8 })(frame);
  if (frame < at - 2 || o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 90, top: 300, opacity: o }}>
      <div style={{ ...S(100, 760, { color: P.text }) }}><Split text={a} unit={rise(at)} /></div>
      <div style={{ ...S(100, 760), marginTop: 6 }}>
        <Split text={b} unit={(i, n) => ({ ...rise(bAt)(i, n), weight: undefined, style: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: '1.14em', color: P.hot } })} />
      </div>
    </div>
  );
};

const BARS = [30, 42, 36, 55, 48, 62, 57, 70, 64, 78, 72, 94];
const ROWS = [['#2041', 'deploy', 'live'], ['#2042', 'checkout', '99.9%'], ['#2043', 'search', '38 ms'], ['#2044', 'payments', 'ok']];

export const LaptopUi: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = tween({ at, dur: 10 })(frame);
  const users = Math.round(18420 * tween({ at: at + 6, dur: 36, ease: (t) => 1 - Math.pow(1 - t, 3) })(frame));
  return (
    <AbsoluteFill style={{ background: '#0E0E0E', opacity: on, padding: 56, fontFamily: FONT.sans, color: P.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: '#2C2C2C' }} />)}
        <div style={{ ...M(24, 500, { color: P.dim, marginLeft: 18, textTransform: 'none', letterSpacing: '0.04em' }) }}>acme / live</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, ...M(22, 600, { color: P.hot, letterSpacing: '0.14em' }) }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: P.hot, opacity: 0.5 + 0.5 * Math.sin(frame * 0.3) }} />LIVE
        </div>
      </div>
      <div style={{ display: 'flex', gap: 56, marginTop: 44 }}>
        <div style={{ flex: 1.4 }}>
          <div style={{ ...M(22, 500, { color: P.hot, letterSpacing: '0.16em' }) }}>ACTIVE USERS</div>
          <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{users.toLocaleString('en-US')}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 300, marginTop: 30 }}>
            {BARS.map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h * spring({ at: at + 8 + i * 2, fps, from: 0, to: 1, ...springs.smooth })(frame)}%`, borderRadius: 10, background: i === BARS.length - 1 ? P.red : '#2A2A2A' }} />
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...M(22, 500, { color: P.hot, letterSpacing: '0.16em' }) }}>SERVICES</div>
          {ROWS.map((r, i) => {
            const t = spring({ at: at + 16 + i * 5, fps, from: 0, to: 1, ...springs.snappy })(frame);
            return (
              <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, padding: '22px 26px', borderRadius: 18, background: P.green, border: '1.5px solid #12261B', opacity: t, transform: `translateX(${(1 - t) * 60}px)`, fontSize: 34 }}>
                <span style={{ color: P.dim, fontFamily: FONT.mono }}>{r[0]}</span><span>{r[1]}</span><span style={{ color: P.hot, fontWeight: 600 }}>{r[2]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const PhoneUi: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ at: at + 14, fps, from: -160, to: 0, ...springs.bouncy })(frame);
  return (
    <AbsoluteFill style={{ background: '#0E0E0E', fontFamily: FONT.sans, color: P.text, padding: '64px 26px 26px' }}>
      <div style={{ ...M(18, 500, { color: P.dim, letterSpacing: '0.14em' }) }}>ACME</div>
      <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 8 }}>Live</div>
      <div style={{ marginTop: 26, padding: '22px 22px', borderRadius: 26, background: P.green, border: `2px solid ${P.red}`, transform: `translateY(${drop}px)`, opacity: frame > at + 14 ? 1 : 0 }}>
        <div style={{ ...M(16, 500, { color: P.hot, letterSpacing: '0.14em' }) }}>DEPLOY</div>
        <div style={{ fontSize: 44, fontWeight: 700, marginTop: 6 }}>Shipped</div>
        <div style={{ fontSize: 22, color: P.dim, marginTop: 2 }}>v2.4 · just now</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 220, marginTop: 40 }}>
        {BARS.slice(4).map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h * spring({ at: at + 6 + i * 2, fps, from: 0, to: 1, ...springs.smooth })(frame)}%`, borderRadius: 8, background: i === 7 ? P.red : '#2A2A2A' }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const ShowcaseProduct: React.FC<{ music?: boolean }> = ({ music = true }) => {
  const frame = useCurrentFrame();
  const rise = useRise();
  const showPhone = frame >= T.phone - 14;
  const endIn = tween({ at: T.brand - 4, dur: 10 })(frame);
  return (
    <Stage background="#030303">
      <Scene3D
        camera={camera} studio="ember" shadow={0.6} blur={{ samples: 6, shutter: 0.5 }}
        background={{ top: '#0D1A13', bottom: '#020403', glow: 'rgba(163,28,27,0.30)', glowAt: [0.5, 0.62], glowSize: 0.7 }}
        post={{ bloom: { strength: 0.5, radius: 0.6, threshold: 1.3 }, dof, aberration: 0.6, vignette: 0.45 }}
      >
        <Laptop3D rig={laptop} finish="silver" screen="#0E0E0E" glow={0.4} />
        {showPhone && <Phone3D rig={phone} finish={{ color: P.black, roughness: 0.3, metalness: 0.8, clearcoat: 0.8 }} screen="#0E0E0E" glow={0.4} />}
      </Scene3D>
      <ScreenOverlay camera={camera} quad={laptop.screen} width={1280} height={800} radius={14} dof={dof} occluders={showPhone ? [phone.outline] : []}>
        <LaptopUi at={VO.word('Live') - 2} />
      </ScreenOverlay>
      {showPhone && (
        <ScreenOverlay camera={camera} quad={phone.screen} width={372} height={804} radius={46} dof={dof}>
          <PhoneUi at={T.phone} />
        </ScreenOverlay>
      )}
      <Headline a="Better than a" b="screenshot." at={VO.word('better') - 2} bAt={VO.word('screenshot') - 3} out={T.laptop + 20} />
      <div style={{ position: 'absolute', left: 90, top: 300, opacity: endIn }}>
        <div style={{ ...M(30, 500, { color: P.dim, letterSpacing: '0.14em' }) }}>Made with</div>
        <div style={{ ...S(124, 760, { color: P.text }), marginTop: 10 }}>
          <Split text="cuekit" count={11} unit={rise(T.brand - 4)} />
          <Split text="voltz" start={6} count={11} unit={(i, n) => ({ ...rise(T.brand - 4)(i, n), weight: undefined, style: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, color: P.hot } })} />
        </div>
      </div>
      <Captions track={VO} y={1400} size={56} color={P.text} active="#FFFFFF" accent={P.hot} />
      <Audio src={staticFile(VO.data.audio)} />
      {music && <Audio src={staticFile('music/lofi-01.mp3')} volume={VO.duck(0.1, 0.04)} />}
      <Sfx at={T.laptop - 6} name="whoosh-soft" volume={0.25} />
      <Sfx at={T.phone - 12} name="whoosh" volume={0.3} />
    </Stage>
  );
};
