import React from 'react';
import { Cpu, Database, Terminal, Zap } from 'lucide';
import { staticFile, useVideoConfig } from 'remotion';
import { Anim, Icon3D, Scene3D, Stage, Text3D, handheld, ink, materials, orbit, spring, springs, tween } from 'cuekitvoltz';
import type { MaterialParams } from 'cuekitvoltz';

// cuekitvoltz 3D type and icons (16:9, dark palette): Lucide icons rebuilt as tubes and drawn on,
// spinning in fast enough to show the sub-frame motion blur; an extruded title drops in glyph by
// glyph; the focus racks from the icons to the title. `blur` (input prop) sets the sample count.
export const THREE_TYPE_DURATION = 150;
const P = { black: '#171717', green: '#06110C', red: '#A31C1B', light: '#ECE6DC' };
const ICONS: { icon: typeof Cpu; mat: MaterialParams }[] = [
  { icon: Terminal, mat: materials.chrome() },
  { icon: Zap, mat: materials.neon(P.red, 5) },
  { icon: Database, mat: materials.glossy(P.black) },
  { icon: Cpu, mat: materials.metal('#D9D4CC') },
];
const FOCUS_ICONS = 7.9;
const FOCUS_TITLE = 10.4;

export const ThreeType: React.FC<{ blur?: number }> = ({ blur = 12 }) => {
  const { fps } = useVideoConfig();
  const cam = handheld(orbit({ target: [0, 1.05, 0], az: (f) => -7 + f * 0.09, el: 7, dist: 9.2, fov: 32 }), { amount: 0.6 });
  const focus = tween({ at: 84, dur: 22, from: FOCUS_ICONS, to: FOCUS_TITLE });
  const sans = staticFile('fonts/Geist-ExtraBold.ttf');
  const serif = staticFile('fonts/InstrumentSerif-Italic.ttf');
  return (
    <Stage background={P.green}>
      <Scene3D
        camera={cam} studio="ember" shadow={0.6} blur={{ samples: blur, shutter: 0.5 }}
        background={{ top: '#0B1912', bottom: '#020504', glow: 'rgba(163,28,27,0.22)', glowAt: [0.5, 0.95], glowSize: 0.6 }}
        post={{ bloom: { strength: 0.7, radius: 0.6, threshold: 1.3 }, dof: { aperture: 16, focus }, aberration: 0.8, vignette: 0.4 }}
      >
        <Anim position={[0, 1.55, -1.2]}>
          <Text3D
            font={sans} size={1.15} depth={0.32} bevel={0.025} tracking={-0.02}
            text={[{ text: 'cuekit', material: materials.chrome() }, { text: 'voltz', font: serif, material: materials.glossy(P.red) }]}
            glyph={(i) => ({
              position: [0, spring({ at: 60 + i * 2.2, fps, from: 2.4, to: 0, ...springs.bouncy }), 0],
              rotation: [spring({ at: 60 + i * 2.2, fps, from: -70, to: 0, ...springs.smooth }), 0, 0],
              visible: (f) => f - (60 + i * 2.2),
            })}
          />
        </Anim>
        {ICONS.map((it, i) => (
          <Anim
            key={i}
            position={[-2.85 + i * 1.9, 0.62, 1.3]}
            rotation={[0, spring({ at: 8 + i * 6, fps, from: -420, to: 0, duration: 1.1, bounce: 0.12 }), 0]}
            scale={spring({ at: 8 + i * 6, fps, from: 0.3, to: 1, ...springs.pop })}
            visible={(f) => f - (8 + i * 6)}
          >
            <Icon3D icon={it.icon} size={1.15} stroke={2.2} draw={tween({ at: 10 + i * 6, dur: 34 })} material={it.mat} />
          </Anim>
        ))}
      </Scene3D>
      <div style={{ position: 'absolute', left: 60, top: 34, display: 'flex', alignItems: 'baseline', gap: 22 }}>
        <div style={{ font: `600 26px ${ink.font.mono}`, letterSpacing: '0.16em', color: P.light }}>CUEKITVOLTZ · 3D TYPE + ICONS</div>
        <div style={{ font: `500 22px ${ink.font.mono}`, letterSpacing: '0.08em', color: '#D9443F' }}>
          {blur > 1 ? `motion blur ×${blur}` : 'motion blur off'} · bloom · rack focus · handheld camera
        </div>
      </div>
    </Stage>
  );
};
