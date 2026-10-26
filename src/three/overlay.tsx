import React from 'react';
import type { CSSProperties } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { V3 } from '../world/iso/project';
import { projectPoint } from './camera';
import type { CameraRig } from './camera';
import { cocPx } from './Scene3D';
import type { Dof3D } from './Scene3D';
import type { Quad } from './devices';

// DOM on top of a 3D scene, placed with the same camera rig: live React content on a device's
// glass (perspective-correct via a homography) and labels pinned to 3D points.

type P2 = [number, number];

/** CSS matrix3d mapping a w×h box onto four screen points (top-left, top-right, bottom-right, bottom-left). */
export const quadMatrix = (w: number, h: number, [p0, p1, p2, p3]: [P2, P2, P2, P2]) => {
  const dx1 = p1[0] - p2[0];
  const dx2 = p3[0] - p2[0];
  const dx3 = p0[0] - p1[0] + p2[0] - p3[0];
  const dy1 = p1[1] - p2[1];
  const dy2 = p3[1] - p2[1];
  const dy3 = p0[1] - p1[1] + p2[1] - p3[1];
  const det = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const hh = (dx1 * dy3 - dx3 * dy1) / det;
  const a = p1[0] - p0[0] + g * p1[0];
  const b = p3[0] - p0[0] + hh * p3[0];
  const d = p1[1] - p0[1] + g * p1[1];
  const e = p3[1] - p0[1] + hh * p3[1];
  // rows: [a/w, b/h, 0, p0x] [d/w, e/h, 0, p0y] [0, 0, 1, 0] [g/w, hh/h, 0, 1], written column-major
  return [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, p0[0], p0[1], 0, 1];
};

export type ScreenOverlayProps = {
  camera: CameraRig;
  quad: (t: number) => Quad;
  /** layout size of the content in px (pick the screen's aspect) */
  width: number;
  height: number;
  /** corner radius in content px */
  radius?: number;
  /** pass the scene's DOF so the screen blurs with the rest */
  dof?: Dof3D | false;
  /** strength of the glass reflection */
  glare?: number;
  /** outlines of 3D things in front of this screen (e.g. `phone.outline`): cut out of the overlay */
  occluders?: ((t: number) => V3[])[];
  /** size of the 3D frame (defaults to the composition) */
  frameWidth?: number;
  frameHeight?: number;
  style?: CSSProperties;
  children: React.ReactNode;
};

/** Live React content on a 3D screen, warped into place with perspective. Hidden when the screen faces away. */
export const ScreenOverlay: React.FC<ScreenOverlayProps> = ({ camera, quad, width, height, radius = 0, dof, glare = 0.5, occluders, frameWidth, frameHeight, style, children }) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const fw = frameWidth ?? vc.width;
  const fh = frameHeight ?? vc.height;
  const pts = quad(frame).map((p) => projectPoint(camera, frame, p, fw, fh));
  if (pts.some((p) => !p.front)) return null;
  const [a, b, , d] = pts;
  // facing the camera: top-left → top-right → bottom-left turns clockwise on screen (y down)
  const facing = (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x) > 0;
  if (!facing) return null;
  const m = quadMatrix(width, height, pts.map((p) => [p.x, p.y]) as [P2, P2, P2, P2]);
  const depth = pts.reduce((s, p) => s + p.depth, 0) / 4;
  const focus = dof ? (dof.focus === undefined ? camera(frame).focus : typeof dof.focus === 'number' ? dof.focus : dof.focus(frame)) : 0;
  const blur = dof ? cocPx(depth, focus, dof, fh, fw, frame) : 0;
  // holes where something in front covers the screen (even-odd: the frame minus each outline)
  const holes = (occluders ?? [])
    .map((o) => o(frame).map((p) => projectPoint(camera, frame, p, fw, fh)))
    .filter((ps) => ps.every((p) => p.front))
    .map((ps) => `M${ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}Z`);
  const clipPath = holes.length ? `path(evenodd, 'M0,0H${fw}V${fh}H0Z${holes.join('')}')` : undefined;
  return (
    // device UI is part of the picture: layout QA skips it
    <AbsoluteFill data-qa-ignore style={{ width: fw, height: fh, filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : undefined, clipPath, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width, height, transformOrigin: '0 0', transform: `matrix3d(${m.map((v) => v.toFixed(8)).join(',')})`, borderRadius: radius, overflow: 'hidden', ...style }}>
        {children}
        {glare > 0 && (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(118deg, rgba(255,255,255,${0.16 * glare}) 0%, rgba(255,255,255,${0.04 * glare}) 38%, rgba(255,255,255,0) 52%)` }} />
        )}
      </div>
    </AbsoluteFill>
  );
};

/** A DOM element pinned to a 3D point (centred on it unless `style` moves it). */
export const Pin3D: React.FC<{ camera: CameraRig; at: V3 | ((t: number) => V3); frameWidth?: number; frameHeight?: number; style?: CSSProperties; children: React.ReactNode }> = ({
  camera, at, frameWidth, frameHeight, style, children,
}) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const p = projectPoint(camera, frame, typeof at === 'function' ? at(frame) : at, frameWidth ?? vc.width, frameHeight ?? vc.height);
  if (!p.front) return null;
  return <div style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%, -50%)', ...style }}>{children}</div>;
};
