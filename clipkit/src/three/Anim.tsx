import React, { useRef } from 'react';
import type * as THREE from 'three';
import { DEG, num, useMotion3D, vec } from './time';
import type { N, V3M } from './time';

export type AnimProps = {
  position?: V3M;
  /** degrees, XYZ order */
  rotation?: V3M;
  scale?: N | V3M;
  /** hidden while the motion is ≤ 0 */
  visible?: N;
  children?: React.ReactNode;
};

/**
 * A group whose transform follows Motion functions. Evaluated at every sub-frame sample, so whatever
 * is inside gets real motion blur from <Scene3D blur>.
 */
export const Anim: React.FC<AnimProps> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, visible, children }) => {
  const ref = useRef<THREE.Group>(null);
  useMotion3D((t) => {
    const g = ref.current;
    if (!g) return;
    const p = vec(position, t);
    const r = vec(rotation, t);
    g.position.set(p[0], p[1], p[2]);
    g.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG);
    if (Array.isArray(scale)) {
      const s = vec(scale, t);
      g.scale.set(s[0] || 1e-4, s[1] || 1e-4, s[2] || 1e-4);
    } else {
      const s = num(scale, t) || 1e-4;
      g.scale.set(s, s, s);
    }
    g.visible = visible === undefined || num(visible, t) > 0;
  });
  return <group ref={ref}>{children}</group>;
};
