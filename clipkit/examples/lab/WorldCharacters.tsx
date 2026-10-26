import React from 'react';
import { useVideoConfig } from 'remotion';
import { Character, Outline, Stage, characterLooks, gestures, ink, performance, withGestures } from 'cuekitvoltz';
import type { CharacterLook, PoseKey } from 'cuekitvoltz';

// cuekitvoltz character rig (16:9): five looks, each performing poses on springs with automatic
// follow-through, gestures layered on top (wave, typing, nod, walk), self-blinking, breathing; one
// talks (mouth driven by a 0–1 motion), the last wears the sticker outline.
export const WORLD_CHARACTERS_DURATION = 160;

type Actor = { name: string; look: CharacterLook; keys: PoseKey[]; layers?: (fps: number) => ReturnType<typeof gestures.wave>[]; talk?: boolean; outline?: boolean };

const ACTORS: Actor[] = [
  { name: 'wave', look: characterLooks.dev, keys: [{ at: 0, pose: 'idle' }, { at: 24, pose: 'wave' }, { at: 120, pose: 'idle' }], layers: () => [gestures.wave({ from: 30, to: 116 })] },
  { name: 'point · present', look: characterLooks.designer, keys: [{ at: 0, pose: 'idle' }, { at: 20, pose: 'point' }, { at: 80, pose: 'present' }] },
  { name: 'think · nod · talk', look: characterLooks.founder, keys: [{ at: 0, pose: 'idle' }, { at: 18, pose: 'think' }, { at: 96, pose: 'idle', face: { mouth: 'smile' } }], layers: () => [gestures.nod({ at: 100 })], talk: true },
  { name: 'type', look: characterLooks.student, keys: [{ at: 0, pose: 'idle' }, { at: 16, pose: 'type' }], layers: () => [gestures.typing({ from: 24, to: 150 })] },
  { name: 'shrug · cheer · walk', look: characterLooks.ops, keys: [{ at: 0, pose: 'idle' }, { at: 20, pose: 'shrug' }, { at: 70, pose: 'cheer' }, { at: 108, pose: 'idle', face: { eyes: 'happy', mouth: 'grin' } }], layers: () => [gestures.walk({ from: 112, to: 158 })], outline: true },
];

const Actor: React.FC<{ a: Actor; x: number }> = ({ a, x }) => {
  const { fps } = useVideoConfig();
  const perf = performance(a.keys, fps);
  const pose = withGestures(perf.pose, ...(a.layers ? a.layers(fps) : []));
  const talk = a.talk ? (f: number) => (f > 104 && f < 150 ? 0.5 + 0.5 * Math.sin(f * 0.9) * Math.sin(f * 0.37) : 0) : undefined;
  const walkX = a.name.includes('walk') ? (f: number) => x + Math.max(0, Math.min(46, f - 112)) * 2.2 : () => x;
  const body = <Character pose={pose} face={perf.face} look={a.look} size={560} x={walkX} y={() => 900} talk={talk} seed={a.name} shadow={!a.outline} gaze={a.talk ? (f) => [f > 18 && f < 96 ? -0.6 : 0, f > 18 && f < 96 ? -0.7 : 0] : undefined} />;
  return a.outline ? <Outline width={6} color="#F5F5F7">{body}</Outline> : body;
};

export const WorldCharacters: React.FC = () => (
  <Stage>
    <div style={{ position: 'absolute', left: 60, top: 34, display: 'flex', alignItems: 'baseline', gap: 22 }}>
      <div style={{ font: `600 26px ${ink.font.mono}`, letterSpacing: '0.16em', color: ink.text }}>CUEKITVOLTZ · CHARACTER RIG</div>
      <div style={{ font: `500 22px ${ink.font.mono}`, letterSpacing: '0.08em', color: ink.muted }}>poses on springs · auto follow-through · blink · breath · talk</div>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 900, height: 2, background: 'rgba(255,255,255,0.08)' }} />
    {ACTORS.map((a, i) => (
      <React.Fragment key={a.name}>
        <Actor a={a} x={230 + i * 365} />
        <div style={{ position: 'absolute', left: 230 + i * 365, top: 950, transform: 'translateX(-50%)', font: `500 24px ${ink.font.mono}`, letterSpacing: '0.08em', color: ink.muted, whiteSpace: 'nowrap' }}>{a.name}</div>
      </React.Fragment>
    ))}
  </Stage>
);
