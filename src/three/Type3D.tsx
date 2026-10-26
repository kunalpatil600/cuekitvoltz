import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { cancelRender, continueRender, delayRender } from 'remotion';
import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { materials } from './materials';
import type { MaterialParams } from './materials';
import { DEG, num, useMotion3D, vec } from './time';
import type { N, V3M } from './time';

// Extruded type and shapes. Fonts are plain .ttf files (pass a URL, e.g. staticFile('fonts/x.ttf')),
// parsed once with opentype.js (bundled with three) and turned into bevelled solids per glyph, so
// every letter can move on its own like 2D <Split>.

const fontCache = new Map<string, Promise<Font>>();
const fontReady = new Map<string, Font>();

export const loadFont3D = (url: string) => {
  let p = fontCache.get(url);
  if (!p) {
    p = new Promise<Font>((resolve, reject) => {
      new TTFLoader().load(url, (json) => {
        const f = new Font(json as never);
        fontReady.set(url, f);
        resolve(f);
      }, undefined, reject);
    });
    fontCache.set(url, p);
  }
  return p;
};

/** Loads fonts inside a Scene3D, holding the render until they're in and the canvas has redrawn. */
const useFonts3D = (urls: string[]) => {
  const key = urls.join('|');
  const [fonts, setFonts] = useState<Font[] | null>(() => (urls.every((u) => fontReady.has(u)) ? urls.map((u) => fontReady.get(u) as Font) : null));
  const handle = useRef<number | null>(null);
  const { advance } = useThree();
  useLayoutEffect(() => {
    if (fonts) return;
    let live = true;
    handle.current = delayRender(`Loading 3D fonts ${key}`);
    Promise.all(urls.map(loadFont3D)).then((f) => live && setFonts(f)).catch((e) => cancelRender(e));
    return () => {
      live = false;
      if (handle.current !== null) continueRender(handle.current);
      handle.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!fonts || handle.current === null) return;
    advance(0);
    continueRender(handle.current);
    handle.current = null;
  }, [fonts, advance]);
  return fonts;
};

export type Run3D = { text: string; font?: string; material?: MaterialParams; sideMaterial?: MaterialParams };
/** Per-glyph motion, offsets from the glyph's resting place (rotation in degrees, about its centre). */
export type Glyph3D = { position?: V3M; rotation?: V3M; scale?: N; visible?: N };

export type Text3DProps = {
  text: string | Run3D[];
  /** .ttf URL for runs without their own */
  font: string;
  /** em size in world units */
  size?: number;
  depth?: number;
  bevel?: number;
  material?: MaterialParams;
  /** material for the sides and bevel (defaults to `material`) */
  sideMaterial?: MaterialParams;
  align?: 'left' | 'center' | 'right';
  /** extra letter spacing, in em */
  tracking?: number;
  glyph?: (i: number, n: number) => Glyph3D;
  curveSegments?: number;
};

const matCache = new Map<string, THREE.MeshPhysicalMaterial>();
const physical = (p: MaterialParams) => {
  const key = JSON.stringify(p);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial(p);
    matCache.set(key, m);
  }
  return m;
};

type Placed = { geo: THREE.ExtrudeGeometry | null; x: number; mats: THREE.Material[] };

/** Extruded, bevelled text; each glyph can animate on its own via `glyph`. */
export const Text3D: React.FC<Text3DProps> = ({
  text, font, size = 1, depth = 0.25, bevel = 0.02, material = materials.glossy('#F5F5F7'), sideMaterial, align = 'center', tracking = 0, glyph, curveSegments = 10,
}) => {
  const runs: Run3D[] = typeof text === 'string' ? [{ text }] : text;
  const urls = Array.from(new Set(runs.map((r) => r.font ?? font)));
  const fonts = useFonts3D(urls);
  const layoutKey = JSON.stringify([runs, font, size, depth, bevel, material, sideMaterial, align, tracking, curveSegments]);
  const placed = useMemo<Placed[]>(() => {
    if (!fonts) return [];
    const out: Placed[] = [];
    let pen = 0;
    const mid = size * 0.36; // pivot height: about half the cap height
    for (const run of runs) {
      const f = fonts[urls.indexOf(run.font ?? font)];
      const data = f.data as unknown as { resolution: number; glyphs: Record<string, { ha: number }> };
      const scale = size / data.resolution;
      const face = physical(run.material ?? material);
      const side = physical(run.sideMaterial ?? sideMaterial ?? run.material ?? material);
      for (const ch of Array.from(run.text)) {
        const g = data.glyphs[ch] ?? data.glyphs['?'];
        const adv = (g?.ha ?? data.resolution * 0.3) * scale + tracking * size;
        let geo: THREE.ExtrudeGeometry | null = null;
        let cx = adv / 2;
        if (ch.trim()) {
          geo = new THREE.ExtrudeGeometry(f.generateShapes(ch, size), {
            depth, curveSegments, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 3,
          });
          geo.computeBoundingBox();
          const bb = geo.boundingBox as THREE.Box3;
          cx = (bb.min.x + bb.max.x) / 2;
          geo.translate(-cx, -mid, -depth / 2);
        }
        out.push({ geo, x: pen + cx, mats: [face, side] });
        pen += adv;
      }
    }
    const shift = align === 'left' ? 0 : align === 'right' ? -pen : -pen / 2;
    out.forEach((p) => (p.x += shift));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonts, layoutKey]);
  useEffect(() => () => placed.forEach((p) => p.geo?.dispose()), [placed]);

  const refs = useRef<(THREE.Group | null)[]>([]);
  const mid = size * 0.36;
  useMotion3D((t) => {
    placed.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = glyph?.(i, placed.length) ?? {};
      const o = a.position ? vec(a.position, t) : [0, 0, 0];
      const r = a.rotation ? vec(a.rotation, t) : [0, 0, 0];
      const s = a.scale === undefined ? 1 : num(a.scale, t);
      g.position.set(p.x + o[0], mid + o[1], o[2]);
      g.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG);
      g.scale.setScalar(Math.max(1e-4, s));
      g.visible = a.visible === undefined || num(a.visible, t) > 0;
    });
  });
  return (
    <group>
      {placed.map((p, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          {p.geo && <mesh geometry={p.geo} material={p.mats} />}
        </group>
      ))}
    </group>
  );
};

const flipWinding = (geo: THREE.BufferGeometry) => {
  for (const name of Object.keys(geo.attributes)) {
    const a = geo.attributes[name] as THREE.BufferAttribute;
    const n = a.itemSize;
    const arr = a.array as Float32Array;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const t = arr[(i + 1) * n + k];
        arr[(i + 1) * n + k] = arr[(i + 2) * n + k];
        arr[(i + 2) * n + k] = t;
      }
    }
    a.needsUpdate = true;
  }
};

export type Extrude3DProps = {
  /** SVG path data (filled shapes; holes follow the usual SVG rules) */
  d: string;
  /** world size of the longer side */
  size?: number;
  depth?: number;
  bevel?: number;
  material?: MaterialParams;
  sideMaterial?: MaterialParams;
  curveSegments?: number;
};

/** Any filled SVG path as a bevelled solid, centred on the origin (y up). */
export const Extrude3D: React.FC<Extrude3DProps> = ({ d, size = 1, depth = 0.2, bevel = 0.03, material = materials.glossy('#7D7AFF'), sideMaterial, curveSegments = 24 }) => {
  const geo = useMemo(() => {
    const { paths } = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
    const shapes = paths.flatMap((p) => SVGLoader.createShapes(p));
    const box = new THREE.Box2();
    shapes.forEach((s) => s.getPoints(8).forEach((p) => box.expandByPoint(p)));
    const span = Math.max(box.max.x - box.min.x, box.max.y - box.min.y) || 1;
    const k = size / span;
    const g = new THREE.ExtrudeGeometry(shapes, {
      depth: depth / k, curveSegments, bevelEnabled: bevel > 0, bevelThickness: bevel / k, bevelSize: (bevel * 0.7) / k, bevelSegments: 4,
    });
    g.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -depth / k / 2);
    g.scale(k, -k, k); // SVG is y-down
    flipWinding(g);
    return g;
  }, [d, size, depth, bevel, curveSegments]);
  useEffect(() => () => geo.dispose(), [geo]);
  const mats = useMemo(() => [physical(material), physical(sideMaterial ?? material)], [material, sideMaterial]);
  return <mesh geometry={geo} material={mats} />;
};
