import React from 'react';
import { RefreshCw } from 'lucide';
import { Easing, useVideoConfig } from 'remotion';
import { IconTile } from '../shared/DrawIcon';
import { MotionBlur, MotionGraph, Move, Stage, add, ink, keys, spring, springFrames, springs, tween } from 'cuekitvoltz';
import type { Motion, SpringConfig } from 'cuekitvoltz';

// cuekitvoltz motion presets (16:9): every named spring next to the cubic ease-out a hand-made scene
// uses today, each pill carrying its own motion blur and stretch, with a speed graph per row.
// Bottom: a fast spin without blur vs with sub-frame MotionBlur. Doubles as the README demo.
export const MOTION_PRESETS_DURATION = 130;
const GO = 12, BACK = 70, TRAVEL = 940, LEFT = 470;

type Row = { name: string; note: string; x: Motion };

const Pill: React.FC<{ x: Motion; color: string }> = ({ x, color }) => (
  <Move x={x} stretch={0.0012}>
    <div style={{ width: 84, height: 48, borderRadius: 24, background: color, boxShadow: `0 0 28px ${color}66` }} />
  </Move>
);

const Spin: React.FC<{ blur: boolean }> = ({ blur }) => (
  <div style={{ position: 'relative', width: 600, height: 120 }}>
    <div style={{ position: 'absolute', left: 0, top: 44, font: `500 22px ${ink.font.mono}`, letterSpacing: '0.08em', color: ink.muted }}>
      {blur ? 'ROTATE · MOTIONBLUR ×8' : 'ROTATE · NO BLUR'}
    </div>
    <div style={{ position: 'absolute', left: 400, top: 0, width: 120, height: 120 }}>
      <MotionBlur samples={blur ? 8 : 1} active={(f) => f > 18 && f < 58}>
        <Move rotate={keys([[20, 0], [56, 720]])} shutter={0}>
          <IconTile icon={RefreshCw} size={110} at={-30} />
        </Move>
      </MotionBlur>
    </div>
  </div>
);

export const MotionPresets: React.FC = () => {
  const { fps } = useVideoConfig();
  const there = (cfg: SpringConfig): Motion => add(spring({ at: GO, fps, to: TRAVEL, ...cfg }), spring({ at: BACK, fps, to: -TRAVEL, ...cfg }));
  const cubic = Easing.out(Easing.cubic);
  const rows: Row[] = [
    { name: 'cubic out', note: 'plain interpolate · 18 f', x: add(tween({ at: GO, dur: 18, to: TRAVEL, ease: cubic }), tween({ at: BACK, dur: 18, to: -TRAVEL, ease: cubic })) },
    ...Object.entries(springs).map(([name, cfg]) => ({ name, note: `${cfg.duration} s · bounce ${cfg.bounce} · settles ${springFrames(cfg, fps)} f`, x: there(cfg) })),
  ];
  return (
    <Stage>
      <div style={{ position: 'absolute', left: 60, top: 40, display: 'flex', alignItems: 'baseline', gap: 22 }}>
        <div style={{ font: `600 26px ${ink.font.mono}`, letterSpacing: '0.16em', color: ink.text }}>CUEKITVOLTZ · MOTION PRESETS</div>
        <div style={{ font: `500 22px ${ink.font.mono}`, letterSpacing: '0.08em', color: ink.muted }}>springs with motion blur + stretch</div>
      </div>
      {rows.map((r, i) => {
        const color = i === 0 ? ink.muted : ink.ramp[(i - 1) % ink.ramp.length];
        return (
          <div key={r.name} style={{ position: 'absolute', left: 0, top: 120 + i * 98, width: 1920, height: 98 }}>
            <div style={{ position: 'absolute', left: 60, top: 18, font: `600 26px ${ink.font.mono}`, color: i === 0 ? ink.muted : ink.text }}>{r.name}</div>
            <div style={{ position: 'absolute', left: 60, top: 54, font: `500 19px ${ink.font.mono}`, color: ink.muted, letterSpacing: '0.04em' }}>{r.note}</div>
            <div style={{ position: 'absolute', left: LEFT + 42, top: 48, width: TRAVEL, height: 2, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', left: LEFT, top: 25 }}><Pill x={r.x} color={color} /></div>
            <MotionGraph compact kind="speed" series={[{ label: r.name, motion: r.x, color }]} from={GO - 2} to={BACK + 40} width={330} height={84} style={{ left: 1530, top: 7 }} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 60, top: 930 }}><Spin blur={false} /></div>
      <div style={{ position: 'absolute', left: 1000, top: 930 }}><Spin blur /></div>
    </Stage>
  );
};
