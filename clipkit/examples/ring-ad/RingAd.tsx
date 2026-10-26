import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { Anim, Gem, Scene3D, Stage, add, ease, lightTent, lookAt, mixRigs, orbit, spring, tween } from 'cuekitvoltz';
import type { CameraRig, Motion, StudioSpec } from 'cuekitvoltz';

// 30 s luxury solitaire commercial (vertical, 24 fps), high-key white studio: one platinum ring with a
// round brilliant diamond, one continuous camera move in six shots. The diamond is ray-traced in a
// shader (refraction, internal reflection, dispersion) inside a light tent with black flags; the metal
// reflects a bright studio with dark strips that sweeps across it.
//   1  0–4 s    out of white, the ring resolves, slow dolly-in
//   2  4–8 s    macro glide across the facets, shallow focus
//   3  8–13 s   pull back to the whole ring, key and cool rim come up
//   4  13–19 s  one 360° turn, natural motion blur
//   5  19–24 s  three-quarter angle, a long light sweeps the band
//   6  24–30 s  settle into the hero angle, a glint crosses the stone, hold with space for a logo
export const RING_FPS = 24;
export const RING_DURATION = 30 * RING_FPS;
const s = (sec: number) => sec * RING_FPS;
const T = { macro: s(4), full: s(8), spin: s(13), sweep: s(19), hero: s(24) };

// ---------------------------------------------------------------- the ring
const D = 0.82; // diamond girdle diameter
const YG = 1.53; // girdle height above the band's centre
const platinum = { color: '#E4E7EC', metalness: 1, roughness: 0.075, clearcoat: 0.3, clearcoatRoughness: 0.05 };

const prongPath = (az: number) => {
  const p = (r: number, y: number) => new THREE.Vector3(r * Math.cos(az), y, r * Math.sin(az));
  return new THREE.CatmullRomCurve3([p(0.1, 1.04), p(0.24, 1.22), p(0.37, YG - 0.17), p(0.425, YG - 0.01), p(0.385, YG + 0.075)], false, 'centripetal');
};

const Ring: React.FC<{ level: Motion; spin: Motion }> = ({ level, spin }) => {
  const geo = useMemo(() => {
    const prongs = Array.from({ length: 6 }, (_, k) => {
      const path = prongPath((k * 60 + 30) * (Math.PI / 180));
      return { tube: new THREE.TubeGeometry(path, 48, 0.034, 16, false), tip: path.getPoint(1), base: path.getPoint(0) };
    });
    return {
      band: new THREE.TorusGeometry(1, 0.115, 64, 256),
      gallery: new THREE.TorusGeometry(0.27, 0.022, 16, 96),
      gallery2: new THREE.TorusGeometry(0.15, 0.02, 16, 72),
      prongs,
    };
  }, []);
  const m = <meshPhysicalMaterial {...platinum} />;
  return (
    <group>
      <mesh geometry={geo.band}>{m}</mesh>
      <mesh geometry={geo.gallery} rotation-x={Math.PI / 2} position-y={YG - 0.2}>{m}</mesh>
      <mesh geometry={geo.gallery2} rotation-x={Math.PI / 2} position-y={1.2}>{m}</mesh>
      {geo.prongs.map((p, i) => (
        <group key={i}>
          <mesh geometry={p.tube}>{m}</mesh>
          <mesh position={p.tip}><sphereGeometry args={[0.037, 20, 14]} />{m}</mesh>
        </group>
      ))}
      <group position-y={YG}>
        <Gem size={D} lights={lightTent} dome={1.05} level={level} spin={spin} fire={1.15} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- light: a high-key white studio
const studio: StudioSpec = {
  panels: [
    { color: '#FFFFFF', power: 2.4, at: [0, 7, 0.5], size: [7, 6] },
    { color: '#FFFFFF', power: 2.2, at: [-6, 2, 3], size: [3, 6] },
    { color: '#F2F6FF', power: 2.2, at: [6, 2, 3], size: [3, 6] },
    { color: '#000000', power: 1, at: [-4.5, 1.5, -4.5], size: [1.2, 6] },
    { color: '#000000', power: 1, at: [4.5, 1.5, -4.5], size: [1.2, 6] },
    { color: '#000000', power: 1, at: [0, -2, 6], size: [5, 0.8] },
    { color: '#E8EAEE', power: 1, at: [0, -6, 0], size: [16, 16] },
  ],
  bg: '#B9BDC5',
  key: { at: [0.6, 9, 1.8], color: '#FFFFFF', power: 1.6 },
  rim: { at: [-3, 2, -6], color: '#DCE8FF', power: 1.2 },
};

/** The opening resolve, and a little extra light for the macro. */
const resolve = tween({ at: 0, dur: 54, ease: ease.inOut });
const macroUp = (f: number) => tween({ at: T.macro - 14, dur: 24 })(f) * (1 - tween({ at: T.full - 10, dur: 40 })(f));
const metalLevel: Motion = (f) => 0.55 + 0.45 * resolve(f) + 0.15 * macroUp(f);
const gemLevel: Motion = (f) => 0.5 + 0.5 * resolve(f) - 0.08 * macroUp(f);
/** the light sweep (shot 5) and the hero glint (shot 6), as a turn of the whole studio */
const sweep: Motion = add(tween({ at: T.sweep, dur: s(5), from: 0, to: 140, ease: ease.inOut }), tween({ at: T.hero + 18, dur: 40, from: 0, to: 55, ease: ease.inOut }));

// ---------------------------------------------------------------- the ring's own motion
const ringYaw: Motion = (f) =>
  -28 + tween({ at: 0, dur: T.spin, from: 0, to: 28, ease: ease.inOut })(f)
  + tween({ at: T.spin, dur: s(6), from: 0, to: 360, ease: ease.inOut })(f)
  + tween({ at: T.sweep, dur: s(5), from: 0, to: 40 })(f)
  + spring({ at: T.hero, fps: RING_FPS, from: 0, to: 22, duration: 2.2, bounce: 0 })(f);
const bob: Motion = (f) => Math.sin((f / RING_FPS) * 1.1) * 0.03;

// ---------------------------------------------------------------- camera: six shots, one move
const shot1: CameraRig = lookAt({ position: [0.3, 2.1, tween({ at: 0, dur: T.macro + 12, from: 7.4, to: 5.6, ease: ease.out })], target: [0, 1.32, 0], fov: 24 });
const shot2: CameraRig = orbit({ target: [0, YG - 0.02, 0], az: tween({ at: T.macro, dur: s(4) + 12, from: -24, to: 22 }), el: 14, dist: tween({ at: T.macro, dur: s(4), from: 2.6, to: 2.2 }), fov: 24 });
const shot3: CameraRig = orbit({ target: [0, 0.38, 0], az: tween({ at: T.full, dur: s(5), from: 16, to: 10 }), el: 7, dist: tween({ at: T.full, dur: s(5), from: 10.6, to: 10.1 }), fov: 25 });
const shot4: CameraRig = orbit({ target: [0, 0.38, 0], az: tween({ at: T.spin, dur: s(6), from: 10, to: 2 }), el: tween({ at: T.spin, dur: s(6), from: 7, to: 11 }), dist: 10.1, fov: 25 });
const shot5: CameraRig = orbit({ target: [0, 0.5, 0], az: tween({ at: T.sweep, dur: s(5), from: 34, to: 40 }), el: 15, dist: tween({ at: T.sweep, dur: s(5), from: 9.2, to: 8.8 }), fov: 25 });
const shot6: CameraRig = orbit({ target: [0, 1.05, 0], az: tween({ at: T.hero, dur: s(6), from: 30, to: 26 }), el: 11, dist: tween({ at: T.hero, dur: s(6), from: 10.4, to: 11.8, ease: ease.out }), fov: 25 });
const mix = (at: number, dur: number) => tween({ at, dur, ease: ease.inOut });
const camera: CameraRig = mixRigs(
  mixRigs(mixRigs(mixRigs(mixRigs(shot1, shot2, mix(T.macro - 14, 28)), shot3, mix(T.full - 6, 42)), shot4, mix(T.spin - 8, 16)), shot5, mix(T.sweep - 14, 30)),
  shot6, mix(T.hero - 10, 40),
);

// depth of field: shallow for the macro, barely there elsewhere
const aperture: Motion = (f) => 3 + 23 * (mix(T.macro - 10, 20)(f) - mix(T.full - 6, 30)(f));

const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.5 }) => (
  <Sequence from={Math.max(0, Math.round(at))}><Audio src={staticFile(src)} volume={volume} /></Sequence>
);

export const RingAd: React.FC<{ music?: boolean }> = () => {
  const frame = useCurrentFrame();
  const white = 1 - tween({ at: 0, dur: 36, ease: ease.inOut })(frame);
  return (
    <Stage background="#000">
      <Scene3D
        camera={camera} studio={studio} floor={-1.55} shadow={0.16} studioLevel={metalLevel} studioSpin={sweep} blur={{ samples: 8, shutter: 0.5 }}
        background={{ top: '#F7F8FA', bottom: '#D8DBE1', glow: 'rgba(255,255,255,0.75)', glowAt: [0.5, 0.42], glowSize: 0.6 }}
        post={{ bloom: { strength: 0.2, radius: 0.4, threshold: 2.6 }, dof: { aperture, maxBlur: 22 }, aberration: 0.15, vignette: 0.14 }}
      >
        <Anim position={[0, bob, 0]} rotation={[4, ringYaw, 0]}>
          <Ring level={gemLevel} spin={sweep} />
        </Anim>
      </Scene3D>
      {/* out of white */}
      <AbsoluteFill style={{ background: '#FFFFFF', opacity: white }} />
      <Sfx at={0} src="sfx/ring/drone.mp3" volume={0.85} />
      <Sfx at={s(1.2)} src="sfx/riser.mp3" volume={0.22} />
      <Sfx at={T.macro + 6} src="sfx/chime.mp3" volume={0.28} />
      <Sfx at={T.spin - 6} src="sfx/ring/bass-sweep.mp3" volume={0.6} />
      <Sfx at={T.sweep + 10} src="sfx/ring/shimmer.mp3" volume={0.5} />
      <Sfx at={T.sweep + s(2.6)} src="sfx/ring/shimmer.mp3" volume={0.35} />
      <Sfx at={T.hero + 6} src="sfx/impact.mp3" volume={0.32} />
      <Sfx at={T.hero + 20} src="sfx/glass.mp3" volume={0.18} />
    </Stage>
  );
};
