import React, { useMemo, useRef } from 'react';
import type { IconNode } from 'lucide';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { materials } from './materials';
import type { MaterialParams } from './materials';
import { num, useMotion3D } from './time';
import type { N } from './time';

// Line icons in 3D. A Lucide icon is strokes with round caps and joins, so it is rebuilt as tubes
// along each stroke with spheres at the corners and ends: the same drawing, now solid and lit.
// `draw` reveals it stroke by stroke, with a round pen tip at the head, like DrawIcon in 2D.

const CORNER = Math.cos((35 * Math.PI) / 180);

/** A polyline as a curve, parameterised by arc length (TubeGeometry samples it evenly). */
class Polyline3 extends THREE.Curve<THREE.Vector3> {
  private cum: number[] = [0];
  constructor(private pts: THREE.Vector3[]) {
    super();
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  }
  get length() {
    return this.cum[this.cum.length - 1];
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const L = Math.min(1, Math.max(0, t)) * this.length;
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < L) i++;
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    return target.copy(this.pts[i - 1]).lerp(this.pts[i], (L - this.cum[i - 1]) / seg);
  }
}

type Piece = { kind: 'tube'; curve: Polyline3; from: number; len: number; first: number; count: number; segs: number } | { kind: 'dot'; at: number; first: number; count: number };

export const iconSvg = (icon: IconNode) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${icon
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k, v]) => k !== 'key' && v !== undefined).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('')}</svg>`;

/** Stroke runs of an icon in 3D units (24-unit box mapped to `size`, centred, y up). */
const iconRuns = (icon: IconNode, size: number) => {
  const k = size / 24;
  const runs: { pts: THREE.Vector3[]; closed: boolean }[] = [];
  for (const sp of new SVGLoader().parse(iconSvg(icon)).paths) {
    for (const sub of sp.subPaths) {
      const raw = sub.getPoints(16).map((p) => new THREE.Vector3((p.x - 12) * k, (12 - p.y) * k, 0));
      const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-4 * size);
      if (pts.length < 2) continue;
      const closed = sub.autoClose || pts[0].distanceTo(pts[pts.length - 1]) < 1e-3 * size;
      if (closed && pts[0].distanceTo(pts[pts.length - 1]) > 1e-4 * size) pts.push(pts[0].clone());
      runs.push({ pts, closed });
    }
  }
  return runs;
};

const isCorner = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
  const u = b.clone().sub(a).normalize();
  const v = c.clone().sub(b).normalize();
  return u.dot(v) < CORNER;
};

const buildIcon = (icon: IconNode, size: number, stroke: number, radial: number) => {
  const r = (stroke / 2) * (size / 24);
  const geos: THREE.BufferGeometry[] = [];
  const pieces: Piece[] = [];
  let L = 0;
  let index = 0;
  const addDot = (p: THREE.Vector3) => {
    const g = new THREE.SphereGeometry(r, radial, Math.max(6, radial / 2));
    g.translate(p.x, p.y, p.z);
    const count = (g.index as THREE.BufferAttribute).count;
    pieces.push({ kind: 'dot', at: L, first: index, count });
    geos.push(g);
    index += count;
  };
  const addTube = (pts: THREE.Vector3[]) => {
    const curve = new Polyline3(pts);
    // fine enough that a partial draw grows smoothly behind the pen tip
    const segs = Math.min(400, Math.max(pts.length * 3, Math.ceil(curve.length / (size / 48))));
    const g = new THREE.TubeGeometry(curve, segs, r, radial, false);
    const count = (g.index as THREE.BufferAttribute).count;
    pieces.push({ kind: 'tube', curve, from: L, len: curve.length, first: index, count, segs });
    geos.push(g);
    index += count;
    L += curve.length;
  };
  for (const { pts, closed } of iconRuns(icon, size)) {
    const n = pts.length;
    const startCorner = closed && n > 2 && isCorner(pts[n - 2], pts[0], pts[1]);
    if (!closed || startCorner) addDot(pts[0]);
    let run = [pts[0]];
    for (let i = 1; i < n; i++) {
      run.push(pts[i]);
      if (i < n - 1 && isCorner(pts[i - 1], pts[i], pts[i + 1])) {
        addTube(run);
        addDot(pts[i]);
        run = [pts[i]];
      }
    }
    addTube(run);
    addDot(pts[n - 1]);
  }
  const geometry = mergeGeometries(geos) as THREE.BufferGeometry;
  geos.forEach((g) => g.dispose());
  return { geometry, pieces, total: L, radius: r, perSeg: radial * 6 };
};

export type Icon3DProps = {
  icon: IconNode;
  /** world size of the icon's 24-unit box */
  size?: number;
  /** stroke width in icon units (Lucide draws at 2) */
  stroke?: number;
  /** 0–1: how much of the icon is drawn */
  draw?: N;
  material?: MaterialParams;
  /** tube smoothness */
  radial?: number;
};

/** A Lucide line icon as lit 3D tubes, optionally drawn on. */
export const Icon3D: React.FC<Icon3DProps> = ({ icon, size = 1, stroke = 2, draw = 1, material = materials.glossy('#F5F5F7'), radial = 14 }) => {
  const built = useMemo(() => buildIcon(icon, size, stroke, radial), [icon, size, stroke, radial]);
  const mesh = useRef<THREE.Mesh>(null);
  const tip = useRef<THREE.Mesh>(null);
  useMotion3D((t) => {
    const p = Math.min(1, Math.max(0, num(draw, t)));
    const L = p * built.total;
    let count = 0;
    let head: THREE.Vector3 | null = null;
    for (const pc of built.pieces) {
      if (pc.kind === 'dot') {
        if (pc.at <= L + 1e-6 && p > 0) count = pc.first + pc.count;
        continue;
      }
      if (L >= pc.from + pc.len) count = pc.first + pc.count;
      else if (L > pc.from) {
        const u = (L - pc.from) / pc.len;
        count = pc.first + built.perSeg * Math.floor(pc.segs * u);
        head = pc.curve.getPoint(u);
        break;
      } else break;
    }
    if (mesh.current) mesh.current.geometry.setDrawRange(0, p >= 1 ? Infinity : count);
    if (tip.current) {
      tip.current.visible = head !== null;
      if (head) tip.current.position.copy(head);
    }
  });
  return (
    <group>
      <mesh ref={mesh} geometry={built.geometry}>
        <meshPhysicalMaterial {...material} />
      </mesh>
      <mesh ref={tip} visible={false}>
        <sphereGeometry args={[built.radius, radial, Math.max(6, radial / 2)]} />
        <meshPhysicalMaterial {...material} />
      </mesh>
    </group>
  );
};
