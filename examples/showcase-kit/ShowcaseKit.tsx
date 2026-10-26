import React from 'react';
import { Cpu, Database, Terminal, Zap } from 'lucide';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Sfx } from '../shared/Sfx';
import { FONT, M, S } from '../shared/type';
import {
  Anim, Captions, Character, Cloud, Cut, Database as IsoDb, Icon3D, IsoLink, IsoScene, Laptop, Laptop3D, Look, Move, Phone3D, Router, Scene, Scene3D, Scenes,
  ScreenOverlay, Server, Split, Stage, Text3D, add, blob, characterLooks, constant, ease, handheld, isoView, laptopRig, materials, orbit, performance, phoneRig, push, spring,
  springs, stagger, tween, voiceScenes, voiceTrack, whip, zoomThrough,
} from 'cuekitvoltz';
import type { Box, CharacterLook, Motion, Unit } from 'cuekitvoltz';
import { LaptopUi, PhoneUi } from '../showcase-product/ShowcaseProduct';
import vo from './vo.json';

// cuekitvoltz hero reel (16:9, dark palette, for the README): one scene per feature, the voice
// director's sections cut the scenes and its anchors land every beat.
const P = { black: '#171717', green: '#06110C', red: '#A31C1B', hot: '#E0403C', text: '#ECE6DC', dim: '#9A938A' };
const FPS = 30;
export const VO = voiceTrack(vo, FPS);
export const KIT_DURATION = VO.frames;
const SECTIONS = ['title', 'motion', 'cuts', 'world', 'three', 'voice'];
const CUTS = [16, 16, 18, 16, 16];
const { scenes: SCENES, starts: STARTS } = voiceScenes(VO, SECTIONS, CUTS);
/** a voice frame, relative to scene `i` */
const rel = (i: number, f: number) => f - STARTS[i];
const host: CharacterLook = { ...characterLooks.dev, shirt: P.red, pants: P.black, shoes: P.text, hair: '#1A1A1A' };

const Dark: React.FC<{ overscan?: number; children?: React.ReactNode }> = ({ overscan = 1, children }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ transform: `scale(${overscan})`, background: `radial-gradient(90% 90% at 50% 40%, #10231A 0%, ${P.green} 45%, #020403 100%)` }} />
    {children}
  </AbsoluteFill>
);

const useRise = () => {
  const { fps } = useVideoConfig();
  return (from: number) => (i: number, n: number): Unit => {
    const at = from + stagger(i, n, { each: 1.1 });
    return { y: spring({ at, fps, from: 60, to: 0, ...springs.snappy }), opacity: tween({ at, dur: 5 }), weight: tween({ at, dur: 16, from: 300, to: 760 }) };
  };
};
const red = (u: (i: number, n: number) => Unit) => (i: number, n: number): Unit => ({
  ...u(i, n), weight: undefined, style: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400, fontSize: '1.12em', color: P.hot },
});
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'absolute', left: 120, top: 96, ...M(26, 500, { color: P.dim, letterSpacing: '0.16em' }) }}>{children}</div>
);

// ---------------------------------------------------------------- 1 title: 3D type + drawn icons
const Title: React.FC = () => {
  const { fps } = useVideoConfig();
  const brand = rel(0, VO.word('cuekitvoltz'));
  const cam = handheld(orbit({ target: [0, 1.05, 0], az: (f) => -6 + f * 0.08, el: 7, dist: 9.4, fov: 32 }), { amount: 0.5 });
  const sans = staticFile('fonts/Geist-ExtraBold.ttf');
  const serif = staticFile('fonts/InstrumentSerif-Italic.ttf');
  const icons = [Terminal, Zap, Database, Cpu];
  return (
    <Stage background="#030303">
      <Scene3D
        camera={cam} studio="ember" shadow={0.6} blur={{ samples: 8 }}
        background={{ top: '#0B1912', bottom: '#020504', glow: 'rgba(163,28,27,0.24)', glowAt: [0.5, 0.95], glowSize: 0.6 }}
        post={{ bloom: { strength: 0.65, radius: 0.6, threshold: 1.3 }, aberration: 0.7, vignette: 0.4 }}
      >
        <Anim position={[0, 1.55, -1.2]}>
          <Text3D
            font={sans} size={1.15} depth={0.32} bevel={0.025} tracking={-0.02}
            text={[{ text: 'cuekit', material: materials.chrome() }, { text: 'voltz', font: serif, material: materials.glossy(P.red) }]}
            glyph={(i) => ({
              position: [0, spring({ at: brand - 6 + i * 1.6, fps, from: 2.4, to: 0, ...springs.bouncy }), 0],
              rotation: [spring({ at: brand - 6 + i * 1.6, fps, from: -70, to: 0, ...springs.smooth }), 0, 0],
              visible: (f) => f - (brand - 6 + i * 1.6),
            })}
          />
        </Anim>
        {icons.map((icon, i) => (
          <Anim key={i} position={[-2.85 + i * 1.9, 0.62, 1.3]} rotation={[0, spring({ at: 2 + i * 4, fps, from: -300, to: 0, duration: 1.0, bounce: 0.12 }), 0]} visible={(f) => f - (2 + i * 4)}>
            <Icon3D icon={icon} size={1.1} stroke={2.2} draw={tween({ at: 4 + i * 4, dur: 28 })} material={i === 1 ? materials.neon(P.red, 5) : i === 3 ? materials.metal('#D9D4CC') : i === 2 ? materials.glossy(P.black) : materials.chrome()} />
          </Anim>
        ))}
      </Scene3D>
    </Stage>
  );
};

// ---------------------------------------------------------------- 2 motion: springs + blur
const PRESETS: { name: keyof typeof springs }[] = [{ name: 'snappy' }, { name: 'smooth' }, { name: 'bouncy' }, { name: 'heavy' }, { name: 'pop' }];
const MotionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = useRise();
  const sp = rel(1, VO.at('springs'));
  const bl = rel(1, VO.at('blur'));
  return (
    <Dark>
      <Chip>01 · MOTION</Chip>
      <div style={{ position: 'absolute', left: 120, top: 300, ...S(110, 760, { color: P.text }) }}><Split text="Real physics," unit={rise(sp - 4)} /></div>
      <div style={{ position: 'absolute', left: 120, top: 430, ...S(96, 760) }}><Split text="real motion blur." unit={red(rise(bl - 4))} /></div>
      {PRESETS.map((p, i) => {
        const at = sp + i * 3;
        const kick = bl + i * 1.5;
        // drop in on the preset's own spring; on "blur", whip left and spring back so the smear shows
        const y = spring({ at, fps, from: -300, to: 430, ...springs[p.name] });
        const x = add(constant(1000 + i * 175), add(tween({ at: kick, dur: 4, from: 0, to: -320, ease: ease.in }), spring({ at: kick + 4, fps, from: 0, to: 320, duration: 0.55, bounce: 0.25 })));
        return (
          <React.Fragment key={p.name}>
            <Move x={x} y={y} stretch={0.003}>
              <div style={{ width: 140, height: 140, borderRadius: 38, background: i === 2 ? P.red : '#1E1E1E', border: `2px solid ${i === 2 ? P.hot : '#2E2E2E'}`, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
            </Move>
            <div style={{ position: 'absolute', left: 1000 + i * 175, width: 140, top: 600, textAlign: 'center', ...M(24, 500, { color: P.dim, letterSpacing: '0.1em' }), opacity: tween({ at: at + 6, dur: 6 })(frame) }}>{p.name}</div>
          </React.Fragment>
        );
      })}
    </Dark>
  );
};

// ---------------------------------------------------------------- 3 cuts: the transition is the demo
const KINDS = ['push', 'whip', 'wipe', 'iris', 'blob', 'zoom'];
const tile = (i: number): Box => ({ x: 1000 + (i % 3) * 270, y: 300 + Math.floor(i / 3) * 270, w: 240, h: 240, r: 40 });
const ZOOM_TILE = tile(5);
const Cuts: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = useRise();
  const cut = rel(2, VO.at('cut'));
  return (
    <Dark overscan={1.8}>
      <Chip>02 · TRANSITIONS</Chip>
      <div style={{ position: 'absolute', left: 120, top: 300, ...S(110, 760, { color: P.text }) }}><Split text="Cuts like" unit={rise(2)} /></div>
      <div style={{ position: 'absolute', left: 120, top: 430, ...S(110, 760) }}><Split text="an editor." unit={red(rise(cut - 2))} /></div>
      {KINDS.map((k, i) => {
        const b = tile(i);
        const hot = i === 5 && frame > cut;
        return (
          <Move key={k} x={constant(b.x)} y={spring({ at: 2 + i * 2, fps, from: b.y + 80, to: b.y, ...springs.snappy })} opacity={tween({ at: 2 + i * 2, dur: 6 })} scale={spring({ at: 2 + i * 2, fps, from: 0.8, to: 1, ...springs.pop })}>
            <div style={{
              width: b.w, height: b.h, borderRadius: b.r, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: hot ? P.red : '#151515', border: `2px solid ${hot ? P.hot : '#2A2A2A'}`, ...M(30, 600, { color: hot ? '#fff' : P.text, letterSpacing: '0.1em' }),
            }}>{k}</div>
          </Move>
        );
      })}
    </Dark>
  );
};

// ---------------------------------------------------------------- 4 world: iso network + a talking host
const view = isoView({ origin: [640, 390], unit: 88 });
const World: React.FC = () => {
  const { fps } = useVideoConfig();
  const rise = useRise();
  const start = STARTS[3];
  const hostAt = rel(3, VO.at('host'));
  const perf = performance([{ at: 0, pose: 'idle' }, { at: 6, pose: 'present' }, { at: hostAt - 4, pose: 'point', face: { mouth: 'grin' } }], fps);
  const mouth: Motion = (f) => VO.mouth(f + start);
  const viseme = (f: number) => VO.viseme(f + start);
  const r = (i: number): Motion => spring({ at: 2 + i * 3, fps, ...springs.bouncy });
  const loop = (offset: number) => (f: number) => ((f + offset) % 40) / 40;
  return (
    <Dark overscan={2.4}>
      <Chip>03 · VISUAL WORLD</Chip>
      <div style={{ position: 'absolute', left: 120, top: 150, ...S(72, 760, { color: P.text }) }}><Split text="Iso worlds," unit={rise(4)} /></div>
      <div style={{ position: 'absolute', left: 120, top: 234, ...S(60, 760) }}><Split text="hosts that talk." unit={red(rise(hostAt - 2))} /></div>
      <IsoScene view={view}>
        <IsoLink path={[[4.6, 5.0, 0], [3.3, 5.0, 0], [3.3, 4.6, 0]]} color={P.text} draw={tween({ at: 6, dur: 12 })} packets={[{ at: loop(0), color: P.text }]} />
        <IsoLink path={[[2.6, 4.2, 0], [2.6, 2.4, 0], [4.2, 2.4, 0], [4.2, 2.2, 0]]} color={P.hot} draw={tween({ at: 9, dur: 12 })} packets={[{ at: loop(14), color: P.hot }]} />
        <IsoLink path={[[6.0, 2.4, 0], [6.6, 2.4, 0], [6.6, 3.4, 0]]} color={P.hot} draw={tween({ at: 12, dur: 12 })} packets={[{ at: loop(27), color: P.hot }]} />
        <Laptop x={4.4} y={4.6} rise={r(0)} open={spring({ at: 4, fps, ...springs.bouncy })} color="#9A9A9A" screen="#0E0E0E" glow={P.red} shown={tween({ at: 10, dur: 30 })} />
        <Router x={2.2} y={4.2} rise={r(1)} color="#2A2A2A" led={P.hot} />
        <Cloud x={1.0} y={1.6} z={1.8} rise={r(2)} color="#CFC8BE" />
        <Server x={4.2} y={1.4} rise={r(3)} seed="k1" color="#222222" accent={P.hot} />
        <Server x={5.4} y={1.4} rise={r(4)} seed="k2" color="#222222" accent={P.hot} />
        <IsoDb x={6.4} y={3.4} rise={r(5)} color={P.red} glow={P.hot} />
      </IsoScene>
      <Character pose={perf.pose} face={perf.face} look={host} size={700} x={() => 1520} y={() => 1010} talk={mouth} viseme={viseme} seed="kit-host" />
    </Dark>
  );
};

// ---------------------------------------------------------------- 5 three: devices with live UI
const mac = laptopRig({ position: [-0.9, 0, 0], rotation: [0, 18, 0], open: 1 });
const fone = phoneRig({ position: [1.9, 0.95, 0.7], rotation: [-6, -18, 3] });
const Three: React.FC = () => {
  const rise = useRise();
  const gpu = rel(4, VO.at('gpu'));
  const cam = handheld(orbit({ target: [0.3, 0.9, 0], az: (f) => 14 - f * 0.08, el: 9, dist: 7.6, fov: 30, focus: 7.4 }), { amount: 0.4 });
  const dof = { aperture: 10, maxBlur: 12 };
  return (
    <Stage background="#030303">
      <Scene3D
        camera={cam} studio="ember" shadow={0.6} blur={{ samples: 6 }}
        background={{ top: '#0D1A13', bottom: '#020403', glow: 'rgba(163,28,27,0.28)', glowAt: [0.55, 0.7], glowSize: 0.7 }}
        post={{ bloom: { strength: 0.5, radius: 0.6, threshold: 1.3 }, dof, aberration: 0.5, vignette: 0.45 }}
      >
        <Laptop3D rig={mac} finish="space" screen="#0E0E0E" glow={0.4} />
        <Phone3D rig={fone} finish={{ color: P.black, roughness: 0.3, metalness: 0.8, clearcoat: 0.8 }} screen="#0E0E0E" glow={0.4} />
      </Scene3D>
      <ScreenOverlay camera={cam} quad={mac.screen} width={1280} height={800} radius={14} dof={dof} occluders={[fone.outline]}>
        <LaptopUi at={-30} />
      </ScreenOverlay>
      <ScreenOverlay camera={cam} quad={fone.screen} width={372} height={804} radius={46} dof={dof}>
        <PhoneUi at={-20} />
      </ScreenOverlay>
      <Chip>04 · 3D</Chip>
      <div style={{ position: 'absolute', left: 120, top: 160, ...S(80, 760, { color: P.text }) }}><Split text="Real 3D," unit={rise(2)} /></div>
      <div style={{ position: 'absolute', left: 120, top: 252, ...S(72, 760) }}><Split text="on your GPU." unit={red(rise(gpu - 3))} /></div>
    </Stage>
  );
};

// ---------------------------------------------------------------- 6 voice: the host, captions, end card
const VoiceEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = useRise();
  const start = STARTS[5];
  const acts = rel(5, VO.word('acts'));
  const oss = rel(5, VO.word('Open'));
  const remo = rel(5, VO.at('remotion'));
  const perf = performance([{ at: 0, pose: 'idle' }, { at: 4, pose: 'wave' }, { at: oss - 4, pose: 'cheer', face: { eyes: 'happy', mouth: 'grin' } }], fps);
  const mouth: Motion = (f) => VO.mouth(f + start);
  const viseme = (f: number) => VO.viseme(f + start);
  const bars = Array.from({ length: 24 }, (_, i) => i);
  return (
    <Dark>
      <Chip>05 · VOICE</Chip>
      <div style={{ position: 'absolute', left: 120, top: 280, ...S(110, 760, { color: P.text }) }}><Split text="A voice" unit={rise(2)} /></div>
      <div style={{ position: 'absolute', left: 120, top: 410, ...S(110, 760) }}><Split text="that acts." unit={red(rise(acts - 3))} /></div>
      <div style={{ position: 'absolute', left: 120, top: 600, display: 'flex', alignItems: 'center', gap: 8, height: 90 }}>
        {bars.map((i) => {
          const v = VO.mouth(frame + start - i * 0.6);
          return <div key={i} style={{ width: 12, height: 10 + v * 80 * (0.6 + 0.4 * Math.sin(i * 1.7) ** 2), borderRadius: 6, background: i % 5 === 0 ? P.hot : '#3A3A3A' }} />;
        })}
      </div>
      <div style={{ position: 'absolute', left: 120, top: 760, opacity: tween({ at: oss - 2, dur: 8 })(frame) }}>
        <div style={{ ...S(84, 760, { color: P.text }) }}>
          <Split text="cuekit" count={11} unit={rise(oss - 2)} />
          <Split text="voltz" start={6} count={11} unit={red(rise(oss - 2))} />
        </div>
        <div style={{ ...M(28, 500, { color: P.dim, letterSpacing: '0.12em', marginTop: 12 }), opacity: tween({ at: remo - 2, dur: 8 })(frame) }}>Open source · for Remotion · directed by Claude</div>
      </div>
      <Character pose={perf.pose} face={perf.face} look={host} size={760} x={() => 1440} y={() => 1030} talk={mouth} viseme={viseme} seed="kit-host-2" />
    </Dark>
  );
};

export const ShowcaseKit: React.FC<{ music?: boolean }> = ({ music = true }) => (
  <Stage background="#030303">
    <Look pack="film">
      <Scenes>
        <Scene duration={SCENES[0]} name="title"><Title /></Scene>
        <Cut duration={CUTS[0]} kind={push({ dir: 'left' })} />
        <Scene duration={SCENES[1]} name="motion"><MotionScene /></Scene>
        <Cut duration={CUTS[1]} kind={whip({ dir: 'up' })} />
        <Scene duration={SCENES[2]} name="cuts"><Cuts /></Scene>
        <Cut duration={CUTS[2]} kind={zoomThrough({ box: ZOOM_TILE, blur: 12 })} />
        <Scene duration={SCENES[3]} name="world"><World /></Scene>
        <Cut duration={CUTS[3]} kind={blob({ x: 1, y: 1, color: P.red })} />
        <Scene duration={SCENES[4]} name="three"><Three /></Scene>
        <Cut duration={CUTS[4]} kind={push({ dir: 'up' })} />
        <Scene duration={SCENES[5]} name="voice"><VoiceEnd /></Scene>
      </Scenes>
    </Look>
    <Captions track={VO} y={958} size={44} maxWords={6} color={P.text} active="#FFFFFF" accent={P.hot} />
    <Audio src={staticFile(VO.data.audio)} />
    {music && <Audio src={staticFile('music/lofi-01.mp3')} volume={VO.duck(0.1, 0.04)} />}
    {STARTS.slice(1).map((s) => <Sfx key={s} at={s - 2} name="whoosh-soft" volume={0.22} />)}
  </Stage>
);
