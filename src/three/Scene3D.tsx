import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useFrame, useThree } from '@react-three/fiber';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { applyCamera, CAM_FAR, CAM_NEAR } from './camera';
import type { CameraRig } from './camera';
import { Studio } from './studio';
import type { StudioName, StudioSpec } from './studio';
import { Time3DContext, makeRegistry, num } from './time';
import type { N, Time3DRegistry } from './time';
import { useTheme } from '../theme/theme';

// <Scene3D>: one WebGL canvas with the kit's render pipeline.
//   1. motion blur: the scene is rendered at `samples` moments across the shutter (every
//      useMotion3D callback and the camera rig are re-evaluated at each) and averaged in HDR
//   2. bloom on what is brighter than white (emissive, hot highlights)
//   3. depth of field: golden-angle gather, focus from the camera rig
//   4. finish: chromatic aberration, vignette, neutral tone mapping, sRGB, dither

/** `threshold`: a pixel blooms when its brightest channel (linear HDR) passes it. */
export type Bloom3D = { strength?: number; radius?: number; threshold?: number };
/** `aperture`: blur radius in px (at 1080p) of something infinitely far (animatable); `focus` defaults to the rig's. */
export type Dof3D = { aperture?: N; focus?: N; maxBlur?: number };
export type Post3D = { bloom?: Bloom3D | false; dof?: Dof3D | false; aberration?: number; vignette?: number; exposure?: number };
/** A vertical gradient with an optional soft glow (`glowAt` in 0–1 frame coordinates). */
export type Backdrop3D = { top: string; bottom: string; glow?: string; glowAt?: [number, number]; glowSize?: number };

export type Scene3DProps = {
  camera: CameraRig;
  /** studio light preset, or false to light the scene yourself */
  studio?: StudioName | StudioSpec | false;
  studioIntensity?: number;
  studioRotate?: number;
  /** animated studio light level and reflection turn (see Studio `level` / `spin`) */
  studioLevel?: N;
  studioSpin?: N;
  /** shadow-catching floor height (false: none) */
  floor?: number | false;
  shadow?: number;
  background?: string | Backdrop3D | 'transparent';
  post?: Post3D;
  /** motion blur: sample count, or samples + shutter (fraction of a frame, default 0.5) */
  blur?: number | { samples: number; shutter?: number };
  width?: number;
  height?: number;
  style?: CSSProperties;
  children?: React.ReactNode;
};

export const DEFAULT_POST: Post3D = { bloom: { strength: 0.5, radius: 0.55, threshold: 1.4 }, aberration: 0.6, vignette: 0.3, exposure: 1 };

/** Blur radius in output pixels for something at `depth`, matching the DOF shader (for DOM overlays). */
export const cocPx = (depth: number, focus: number, dof: Dof3D, frameHeight: number, frameWidth = frameHeight, frame = 0) => {
  const k = Math.min(frameWidth, frameHeight) / 1080;
  const ap = num(dof.aperture ?? 0, frame) * k;
  return Math.min((dof.maxBlur ?? 18) * k, (ap * Math.abs(depth - focus)) / Math.max(depth, 1e-3));
};

const VS = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const ACCUM_FS = /* glsl */ `
uniform sampler2D tDiffuse; uniform float weight; varying vec2 vUv;
void main() { gl_FragColor = texture2D(tDiffuse, vUv) * weight; }`;

const DOF_FS = /* glsl */ `
#include <packing>
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 texel;
uniform float focus; uniform float aperture; uniform float maxBlur; uniform float radScale; uniform float near; uniform float far;
varying vec2 vUv;
float dist(vec2 uv) { return -perspectiveDepthToViewZ(unpackRGBAToDepth(texture2D(tDepth, uv)), near, far); }
float coc(float d) { return min(maxBlur, aperture * abs(d - focus) / max(d, 0.001)); }
void main() {
  vec4 color = texture2D(tColor, vUv);
  float cd = dist(vUv);
  float cs = coc(cd);
  float tot = 1.0;
  float radius = radScale;
  float ang = 0.0;
  for (int i = 0; i < 200; i++) {
    if (radius >= maxBlur) break;
    vec2 tc = vUv + vec2(cos(ang), sin(ang)) * texel * radius;
    vec4 sc = texture2D(tColor, tc);
    float sd = dist(tc);
    float ss = coc(sd);
    if (sd > cd) ss = clamp(ss, 0.0, cs * 2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, ss);
    color += mix(color / tot, sc, m);
    tot += 1.0;
    ang += 2.39996323;
    radius += radScale / radius;
  }
  gl_FragColor = color / tot;
}`;

// bloom picks pixels by their brightest channel, not luminance, so saturated reds and coppers glow
// as readily as white (luminance would need a red ~10× brighter than a white to bloom)
const HIGH_FS = /* glsl */ `
uniform sampler2D tDiffuse; uniform vec3 defaultColor; uniform float defaultOpacity; uniform float luminosityThreshold; uniform float smoothWidth;
varying vec2 vUv;
void main() {
  vec4 texel = min(texture2D(tDiffuse, vUv), vec4(6.0)); // tame mirror-highlight spikes (they bloom into squares)
  float v = max(texel.r, max(texel.g, texel.b));
  gl_FragColor = mix(vec4(defaultColor, defaultOpacity), texel, smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v));
}`;

const OUT_FS = /* glsl */ `
uniform sampler2D tDiffuse; uniform float aberration; uniform float vignette; uniform float exposure; uniform vec2 res;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 d = vUv - 0.5;
  vec4 c = texture2D(tDiffuse, vUv);
  if (aberration > 0.0) {
    vec2 o = d * aberration / max(res.x, res.y) * 8.0;
    c.r = texture2D(tDiffuse, vUv - o).r;
    c.b = texture2D(tDiffuse, vUv + o).b;
  }
  vec2 dv = d * vec2(res.x / max(res.x, res.y), res.y / max(res.x, res.y)) * 2.0;
  c.rgb *= mix(1.0, smoothstep(1.25, 0.25, length(dv)), vignette);
  c.rgb *= exposure;
  #ifdef TONE_MAPPING
  c.rgb = toneMapping(c.rgb);
  #endif
  c = linearToOutputTexel(c);
  c.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = c;
}`;

const backdropTexture = (b: Backdrop3D, w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.max(2, Math.round((256 * h) / w));
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, b.top);
  g.addColorStop(1, b.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  if (b.glow) {
    const [gx, gy] = b.glowAt ?? [0.5, 0.4];
    const r = (b.glowSize ?? 0.6) * Math.max(c.width, c.height);
    const rg = ctx.createRadialGradient(gx * c.width, gy * c.height, 0, gx * c.width, gy * c.height, r);
    rg.addColorStop(0, b.glow);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

const makePipeline = (gl: THREE.WebGLRenderer) => {
  const v = gl.getDrawingBufferSize(new THREE.Vector2());
  const w = v.x;
  const h = v.y;
  const hdr = { type: THREE.HalfFloatType, depthBuffer: false };
  const sample = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const accum = new THREE.WebGLRenderTarget(w, h, hdr);
  const dofOut = new THREE.WebGLRenderTarget(w, h, hdr);
  const depth = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, blending: THREE.NoBlending });
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.5, 0.9);
  bloom.materialHighPassFilter.fragmentShader = HIGH_FS;
  bloom.materialHighPassFilter.needsUpdate = true;
  (bloom.highPassUniforms as Record<string, THREE.IUniform>).smoothWidth.value = 0.4;
  const accMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, weight: { value: 1 } }, vertexShader: VS, fragmentShader: ACCUM_FS, depthTest: false, depthWrite: false,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, blendEquation: THREE.AddEquation,
  });
  const dofMat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null }, tDepth: { value: depth.texture }, texel: { value: new THREE.Vector2(1 / w, 1 / h) }, focus: { value: 5 }, aperture: { value: 0 },
      maxBlur: { value: 18 }, radScale: { value: 1 }, near: { value: CAM_NEAR }, far: { value: CAM_FAR },
    },
    vertexShader: VS, fragmentShader: DOF_FS, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });
  const outMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, aberration: { value: 0 }, vignette: { value: 0 }, exposure: { value: 1 }, res: { value: new THREE.Vector2(w, h) } },
    vertexShader: VS, fragmentShader: OUT_FS, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });
  const quad = new FullScreenQuad(accMat);
  const dispose = () => {
    [sample, accum, dofOut, depth].forEach((t) => t.dispose());
    [depthMat, accMat, dofMat, outMat].forEach((m) => m.dispose());
    bloom.dispose();
    quad.dispose();
  };
  return { w, h, sample, accum, dofOut, depth, depthMat, bloom, accMat, dofMat, outMat, quad, dispose };
};

type PipelineProps = { rig: CameraRig; post: Post3D; samples: number; shutter: number; background: Scene3DProps['background']; reg: Time3DRegistry };

const Pipeline: React.FC<PipelineProps> = (props) => {
  const { gl, scene, camera, size } = useThree();
  const frame = useCurrentFrame();
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const live = useRef(props);
  live.current = props;

  useLayoutEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.VSMShadowMap;
  }, [gl]);

  const bgKey = JSON.stringify(props.background ?? null);
  useLayoutEffect(() => {
    const b = props.background;
    if (b === undefined || b === 'transparent') {
      scene.background = null;
      return;
    }
    if (typeof b === 'string') {
      scene.background = new THREE.Color(b);
      return;
    }
    const tex = backdropTexture(b, size.width, size.height);
    scene.background = tex;
    return () => tex.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, bgKey, size.width, size.height]);

  const pipe = useMemo(() => makePipeline(gl), [gl, size.width, size.height]);
  useEffect(() => () => pipe.dispose(), [pipe]);

  useFrame(() => {
    const { rig, post, samples, shutter, reg } = live.current;
    const f = frameRef.current;
    const cam = camera as THREE.PerspectiveCamera;
    cam.aspect = pipe.w / pipe.h;
    // every clear below is explicit: with autoClear each quad draw would wipe the accumulation
    gl.autoClear = false;
    const transparent = scene.background === null;
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = o.userData.shadow !== false;
        o.receiveShadow = o.userData.receive !== false;
      }
    });

    // 1. accumulate the shutter
    const n = Math.max(1, Math.round(samples));
    pipe.quad.material = pipe.accMat;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? f : f - (shutter * i) / (n - 1);
      reg.run(t);
      applyCamera(cam, rig(t));
      gl.setRenderTarget(pipe.sample);
      gl.setClearColor(0x000000, transparent ? 0 : 1);
      gl.clear();
      gl.render(scene, cam);
      pipe.accMat.uniforms.tDiffuse.value = pipe.sample.texture;
      pipe.accMat.uniforms.weight.value = 1 / n;
      pipe.accMat.blending = i === 0 ? THREE.NoBlending : THREE.CustomBlending;
      gl.setRenderTarget(pipe.accum);
      pipe.quad.render(gl);
    }
    // back to the frame itself for depth and anything read after
    reg.run(f);
    const state = rig(f);
    applyCamera(cam, state);

    // 2. bloom (in place)
    const bloom = post.bloom;
    if (bloom) {
      pipe.bloom.strength = bloom.strength ?? 0.5;
      pipe.bloom.radius = bloom.radius ?? 0.55;
      pipe.bloom.threshold = bloom.threshold ?? 1.4;
      pipe.bloom.render(gl, pipe.dofOut, pipe.accum, 0, false);
    }

    // 3. depth of field
    let src = pipe.accum;
    const dof = post.dof;
    if (dof && num(dof.aperture ?? 0, f) > 0) {
      const bg = scene.background;
      scene.background = null;
      scene.overrideMaterial = pipe.depthMat;
      gl.setRenderTarget(pipe.depth);
      gl.setClearColor(0xffffff, 1);
      gl.clear();
      gl.render(scene, cam);
      scene.overrideMaterial = null;
      scene.background = bg;
      const k = Math.min(pipe.w, pipe.h) / 1080;
      const maxBlur = (dof.maxBlur ?? 18) * k;
      const u = pipe.dofMat.uniforms;
      u.tColor.value = pipe.accum.texture;
      u.focus.value = dof.focus === undefined ? state.focus : num(dof.focus, f);
      u.aperture.value = num(dof.aperture ?? 0, f) * k;
      u.maxBlur.value = maxBlur;
      u.radScale.value = Math.max(0.6, (maxBlur * maxBlur) / 360);
      pipe.quad.material = pipe.dofMat;
      gl.setRenderTarget(pipe.dofOut);
      pipe.quad.render(gl);
      src = pipe.dofOut;
    }

    // 4. finish to the canvas
    const u = pipe.outMat.uniforms;
    u.tDiffuse.value = src.texture;
    u.aberration.value = post.aberration ?? 0;
    u.vignette.value = post.vignette ?? 0;
    u.exposure.value = post.exposure ?? 1;
    pipe.quad.material = pipe.outMat;
    gl.setRenderTarget(null);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    pipe.quad.render(gl);
  }, 1);
  return null;
};

/**
 * A WebGL scene rendered through the kit pipeline (sub-frame motion blur, bloom, depth of field,
 * filmic finish). Children are react-three-fiber elements; animate them with `Anim` or
 * `useMotion3D` so they take part in motion blur.
 */
export const Scene3D: React.FC<Scene3DProps> = ({
  camera, studio: studioIn, studioIntensity = 1, studioRotate = 0, studioLevel, studioSpin, floor = 0, shadow = 0.45, background: backgroundIn, post = DEFAULT_POST, blur = 1, width, height, style, children,
}) => {
  const theme = useTheme();
  const studio = studioIn ?? theme.studio ?? 'product';
  const background = backgroundIn ?? theme.backdrop ?? '#0A0A10';
  const vc = useVideoConfig();
  const w = width ?? vc.width;
  const h = height ?? vc.height;
  const reg = useMemo(makeRegistry, []);
  const samples = typeof blur === 'number' ? blur : blur.samples;
  const shutter = typeof blur === 'number' ? 0.5 : blur.shutter ?? 0.5;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, ...style }}>
      <ThreeCanvas
        width={w} height={h} camera={{ fov: 30, near: CAM_NEAR, far: CAM_FAR, position: [0, 0, 6] }}
        gl={{ antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      >
        <Time3DContext.Provider value={reg}>
          <Pipeline rig={camera} post={post} samples={samples} shutter={shutter} background={background} reg={reg} />
          {studio !== false && <Studio preset={studio} intensity={studioIntensity} rotate={studioRotate} level={studioLevel} spin={studioSpin} floor={floor} shadow={shadow} />}
          {children}
        </Time3DContext.Provider>
      </ThreeCanvas>
    </div>
  );
};
