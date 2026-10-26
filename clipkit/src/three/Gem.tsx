import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { random } from 'remotion';
import * as THREE from 'three';
import { DEG, num, useMotion3D } from './time';
import type { N } from './time';

// A cut gemstone with real optics. The stone is built as the intersection of its facet planes (so it
// is exactly convex), and a fragment shader traces each view ray through it: Fresnel reflection on
// entry, refraction in, bounces off the inside faces (total internal reflection where it happens),
// and refraction out with a slightly different index per colour channel, which gives the fire.
// It lights itself from its own small studio, a cube map of emissive softboxes re-rendered every
// sample, so the panels can fade and turn while the stone sparkles.

export type Plane = { n: THREE.Vector3; d: number }; // inside: n·p <= d

/** The planes of a round brilliant cut with girdle diameter `size` (table up, centred on the girdle). */
export const roundBrilliant = (size = 1, { crown = 34.5, pavilion = 40.75, table = 0.57, girdle = 0.03 } = {}): Plane[] => {
  const R = size / 2;
  const planes: Plane[] = [];
  const add = (n: THREE.Vector3, p: THREE.Vector3) => planes.push({ n: n.normalize(), d: n.dot(p) });
  const dirAt = (az: number, tilt: number, up: 1 | -1) => new THREE.Vector3(Math.sin(tilt) * Math.cos(az), up * Math.cos(tilt), Math.sin(tilt) * Math.sin(az));
  const crownH = (R - (table * size) / 2) * Math.tan(crown * DEG);
  const g = girdle * size;
  // table
  add(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, crownH, 0));
  for (let k = 0; k < 8; k++) {
    const az = (k * 45) * DEG;
    // bezel (kite) facets through the girdle edge
    add(dirAt(az, crown * DEG, 1), new THREE.Vector3(R * Math.cos(az), 0, R * Math.sin(az)));
    // star facets, shallow, cutting the corners next to the table
    const sAz = az + 22.5 * DEG;
    const starN = dirAt(sAz, (crown - 13) * DEG, 1);
    add(starN, new THREE.Vector3(table * size * 0.53 * Math.cos(sAz), crownH, table * size * 0.53 * Math.sin(sAz)));
    // pavilion mains through the culet
    add(dirAt(az, pavilion * DEG, -1), new THREE.Vector3(R * Math.cos(az), -g, R * Math.sin(az)));
  }
  for (let k = 0; k < 16; k++) {
    const az = (k * 22.5 + 11.25) * DEG;
    // upper girdle facets
    add(dirAt(az, (crown + 8) * DEG, 1), new THREE.Vector3(R * Math.cos(az), 0, R * Math.sin(az)));
    // lower girdle facets
    add(dirAt(az, (pavilion + 1.6) * DEG, -1), new THREE.Vector3(R * Math.cos(az), -g, R * Math.sin(az)));
  }
  // girdle band
  for (let k = 0; k < 32; k++) {
    const az = (k * 11.25) * DEG;
    add(new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), new THREE.Vector3(R * Math.cos(az), 0, R * Math.sin(az)));
  }
  return planes;
};

/** The convex solid bounded by `planes`: flat-shaded triangles plus the planes that really form faces. */
export const convexSolid = (planes: Plane[]) => {
  const eps = 1e-6;
  const verts: THREE.Vector3[] = [];
  const inside = (v: THREE.Vector3) => planes.every((p) => p.n.dot(v) <= p.d + 1e-5);
  const c = new THREE.Vector3();
  for (let i = 0; i < planes.length; i++) {
    for (let j = i + 1; j < planes.length; j++) {
      const n23 = new THREE.Vector3();
      for (let k = j + 1; k < planes.length; k++) {
        const [a, b, d] = [planes[i], planes[j], planes[k]];
        n23.crossVectors(b.n, d.n);
        const det = a.n.dot(n23);
        if (Math.abs(det) < eps) continue;
        c.copy(n23).multiplyScalar(a.d)
          .add(new THREE.Vector3().crossVectors(d.n, a.n).multiplyScalar(b.d))
          .add(new THREE.Vector3().crossVectors(a.n, b.n).multiplyScalar(d.d))
          .divideScalar(det);
        if (inside(c) && !verts.some((v) => v.distanceToSquared(c) < 1e-10)) verts.push(c.clone());
      }
    }
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const faces: Plane[] = [];
  for (const p of planes) {
    const on = verts.filter((v) => Math.abs(p.n.dot(v) - p.d) < 1e-5);
    if (on.length < 3) continue;
    faces.push(p);
    const center = on.reduce((s, v) => s.add(v), new THREE.Vector3()).divideScalar(on.length);
    const u = new THREE.Vector3().subVectors(on[0], center).normalize();
    const w = new THREE.Vector3().crossVectors(p.n, u);
    const sorted = on.map((v) => ({ v, a: Math.atan2(new THREE.Vector3().subVectors(v, center).dot(w), new THREE.Vector3().subVectors(v, center).dot(u)) })).sort((x, y) => x.a - y.a).map((x) => x.v);
    for (let t = 1; t < sorted.length - 1; t++) {
      for (const v of [sorted[0], sorted[t], sorted[t + 1]]) {
        positions.push(v.x, v.y, v.z);
        normals.push(p.n.x, p.n.y, p.n.z);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return { geometry, faces };
};

/** A softbox in the gem's studio: direction (azimuth/elevation, degrees), size and brightness. */
export type GemLight = { az: number; el: number; w: number; h: number; power: N; color?: string };

const VS = /* glsl */ `
varying vec3 vLocal; varying vec3 vNormal;
void main() { vLocal = position; vNormal = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const fs = (planes: number, bounces: number) => /* glsl */ `
uniform samplerCube envMap; uniform float envLevel; uniform vec4 planes[${planes}];
uniform mat3 toWorld; uniform vec3 camLocal; uniform vec3 ior; uniform vec3 tint; uniform float fire;
uniform vec3 viewDir; uniform float lens; uniform float lensSize;
varying vec3 vLocal; varying vec3 vNormal;
// the camera itself blocks the light behind it: what a real stone reflects back at the lens is dark
vec3 env(vec3 d) {
  vec3 w = normalize(toWorld * d);
  float c = dot(w, viewDir);
  float block = lens * smoothstep(cos(lensSize), cos(lensSize * 0.55), c);
  return textureCube(envMap, w).rgb * envLevel * (1.0 - block);
}
float schlick(float cosT, float r0) { return r0 + (1.0 - r0) * pow(1.0 - cosT, 5.0); }
void main() {
  vec3 V = normalize(vLocal - camLocal);
  vec3 n = normalize(vNormal);
  float n1 = ior.g;
  float r0 = pow((n1 - 1.0) / (n1 + 1.0), 2.0);
  float F = schlick(clamp(dot(-V, n), 0.0, 1.0), r0);
  vec3 col = env(reflect(V, n)) * F;
  vec3 p = vLocal;
  vec3 r = refract(V, n, 1.0 / n1);
  float w = 1.0 - F;
  vec3 acc = vec3(0.0);
  vec3 spread = (ior - n1) * fire + n1;
  for (int b = 0; b < ${bounces}; b++) {
    float tmin = 1e9; vec3 nh = vec3(0.0, 1.0, 0.0);
    for (int i = 0; i < ${planes}; i++) {
      vec3 pn = planes[i].xyz;
      float dn = dot(r, pn);
      if (dn > 1e-5) {
        float t = (planes[i].w - dot(p, pn)) / dn;
        if (t > 1e-5 && t < tmin) { tmin = t; nh = pn; }
      }
    }
    p += r * tmin;
    float c = dot(r, nh);
    float k = 1.0 - n1 * n1 * (1.0 - c * c);
    if (k > 0.0) {
      float Fe = schlick(sqrt(k), r0);
      vec3 oR = refract(r, -nh, spread.r);
      vec3 oG = refract(r, -nh, spread.g);
      vec3 oB = refract(r, -nh, spread.b);
      vec3 out3 = vec3(env(oR).r, env(oG).g, env(oB).b);
      acc += w * (1.0 - Fe) * out3;
      w *= Fe;
    }
    r = reflect(r, nh);
    if (w < 0.004) break;
  }
  acc += w * env(r) * 0.25;
  gl_FragColor = vec4(col + acc * tint, 1.0);
}`;

export type GemProps = {
  /** girdle diameter, world units */
  size?: number;
  planes?: Plane[];
  /** softboxes of the gem's own studio (default: a crisp jewellery studio) */
  lights?: GemLight[];
  /** overall light level, animatable (0 = dark) */
  level?: N;
  /** turns the gem's studio about the vertical axis, degrees (a light sweep) */
  spin?: N;
  /** refractive index per channel (diamond by default) */
  ior?: [number, number, number];
  /** 0 = no dispersion, 1 = real diamond, more = more fire */
  fire?: number;
  tint?: string;
  bounces?: number;
  /** brightness of the dim dome behind the softboxes (keeps the darkest facets from going pure black) */
  dome?: N;
  /** 0–1: how dark the camera's own reflection is (draws the classic dark arrows in a bright studio) */
  lens?: number;
  /** angular radius of that dark zone, degrees */
  lensSize?: number;
};

/**
 * The default stone studio: a field of small and medium softboxes in every direction (seeded), so the
 * stone throws sharp light-and-dark facets from any angle, the way a jeweller's light tent does.
 */
export const jewelleryStudio: GemLight[] = [
  { az: 0, el: 82, w: 3, h: 3, power: 2.5 },
  ...Array.from({ length: 48 }, (_, i) => ({
    az: random(`gem-az-${i}`) * 360,
    el: Math.asin(random(`gem-el-${i}`) * 1.7 - 0.7) / DEG,
    w: 0.4 + random(`gem-w-${i}`) * 1.8,
    h: 0.4 + random(`gem-h-${i}`) * 1.8,
    power: 2 + random(`gem-p-${i}`) * 7,
  })),
];

/**
 * High-key light tent: use with `dome` ≈ 1. The bright dome lights the stone from everywhere, black
 * flags draw its dark facets (contrast is what makes a diamond read as a diamond), and small hot spots
 * give the glints.
 */
export const lightTent: GemLight[] = [
  ...Array.from({ length: 22 }, (_, i) => ({
    az: random(`tent-az-${i}`) * 360, el: -25 + random(`tent-el-${i}`) * 70, w: 1.2 + random(`tent-w-${i}`) * 3, h: 1.2 + random(`tent-h-${i}`) * 3, power: 0, color: '#000000',
  })),
  ...Array.from({ length: 18 }, (_, i) => ({
    az: random(`tent-saz-${i}`) * 360, el: Math.asin(random(`tent-sel-${i}`) * 1.6 - 0.6) / DEG, w: 0.35, h: 0.35, power: 6 + random(`tent-sp-${i}`) * 9,
  })),
  { az: 0, el: 84, w: 3, h: 3, power: 3 },
];

/** A gemstone traced with refraction, internal reflection and dispersion; it lights itself. */
export const Gem: React.FC<GemProps> = ({ size = 1, planes, lights = jewelleryStudio, level = 1, spin = 0, ior = [2.407, 2.418, 2.43], fire = 1, tint = '#FFFFFF', bounces = 6, dome = 0.06, lens = 0.92, lensSize = 26 }) => {
  const { gl } = useThree();
  const solid = useMemo(() => convexSolid(planes ?? roundBrilliant(size)), [planes, size]);
  const studio = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');
    const target = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const camera = new THREE.CubeCamera(0.1, 50, target);
    const rig = new THREE.Group();
    scene.add(rig);
    const panels = lights.map((l) => {
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(l.color ?? '#FFFFFF'), side: THREE.DoubleSide });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(l.w, l.h), mat);
      const az = l.az * DEG;
      const el = l.el * DEG;
      m.position.set(8 * Math.cos(el) * Math.sin(az), 8 * Math.sin(el), 8 * Math.cos(el) * Math.cos(az));
      m.lookAt(0, 0, 0);
      rig.add(m);
      return { mat, light: l };
    });
    return { scene, target, camera, rig, panels };
  }, [lights]);
  const material = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: {
        envMap: { value: studio.target.texture }, envLevel: { value: 1 }, planes: { value: solid.faces.map((p) => new THREE.Vector4(p.n.x, p.n.y, p.n.z, p.d)) },
        toWorld: { value: new THREE.Matrix3() }, camLocal: { value: new THREE.Vector3() }, ior: { value: new THREE.Vector3(...ior) }, tint: { value: new THREE.Color(tint) }, fire: { value: fire },
        viewDir: { value: new THREE.Vector3(0, 0, 1) }, lens: { value: lens }, lensSize: { value: lensSize * DEG },
      },
      vertexShader: VS,
      fragmentShader: fs(solid.faces.length, bounces),
    }),
    [studio, solid, ior, tint, fire, bounces, lens, lensSize],
  );
  useEffect(() => () => {
    material.dispose();
    solid.geometry.dispose();
    studio.target.dispose();
  }, [material, solid, studio]);

  const mesh = useRef<THREE.Mesh>(null);
  const white = useMemo(() => new THREE.Color('#FFFFFF'), []);
  useMotion3D((t) => {
    // the studio's state at this sample: brightness per panel and the sweep angle
    const lv = num(level, t);
    studio.rig.rotation.y = num(spin, t) * DEG;
    for (const p of studio.panels) p.mat.color.copy(new THREE.Color(p.light.color ?? white)).multiplyScalar(num(p.light.power, t) * lv);
    (studio.scene.background as THREE.Color).setScalar(num(dome, t) * lv);
    material.uniforms.envLevel.value = 1;
    const prev = gl.getRenderTarget();
    studio.camera.update(gl, studio.scene);
    gl.setRenderTarget(prev);
  });
  // camera and orientation in the stone's own space, for every render (each motion-blur sample too).
  // A layout effect: @remotion/three renders the frame from a sibling's passive effect, which would run
  // before a passive effect here and draw the first frame without the camera.
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const inv = new THREE.Matrix4();
    const camPos = new THREE.Vector3();
    const gemPos = new THREE.Vector3();
    m.onBeforeRender = (_r, _s, camera) => {
      m.updateMatrixWorld();
      inv.copy(m.matrixWorld).invert();
      camPos.setFromMatrixPosition(camera.matrixWorld);
      material.uniforms.camLocal.value.copy(camPos).applyMatrix4(inv);
      material.uniforms.toWorld.value.setFromMatrix4(m.matrixWorld);
      material.uniforms.viewDir.value.copy(camPos).sub(gemPos.setFromMatrixPosition(m.matrixWorld)).normalize();
    };
  }, [material]);
  return <mesh ref={mesh} geometry={solid.geometry} material={material} />;
};
