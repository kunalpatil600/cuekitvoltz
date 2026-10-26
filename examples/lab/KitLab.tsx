import React from 'react';
import { Sequence, useVideoConfig } from 'remotion';
import { Compare, MotionGraph, OnionSkin, Stage, ink, onionFrames } from 'cuekitvoltz';
import { BASE_CARD_AT, BASE_CARD_Y, BASELINE_DURATION, BaseCard, Baseline, baseCardX } from './Baseline';
import { AfterCard, BaselineAfter, afterCardX } from './BaselineAfter';

// cuekitvoltz lab (16:9): the baseline scene next to its upgraded version, with the instruments
// used to judge motion from stills: position and speed graphs of card 1, and onion skins of card 1
// before and after over the same frames.
export const KIT_LAB_DURATION = BASELINE_DURATION;

/** One card alone on a transparent strip, onion-skinned. */
const OnionStrip: React.FC<{ top: number; label: string; frames: number[]; children: React.ReactNode }> = ({ top, label, frames, children }) => (
  <>
    <div style={{ position: 'absolute', left: 1170, top, font: `500 16px ${ink.font.mono}`, letterSpacing: '0.08em', color: ink.muted }}>{label}</div>
    <div style={{ position: 'absolute', left: 1170, top: top + 26, width: 690, height: 166, overflow: 'hidden', borderRadius: 14, outline: `1.5px solid ${ink.line}`, background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ position: 'relative', width: 1080, height: 260, transform: `scale(${690 / 1080})`, transformOrigin: '0 0' }}>
        <Sequence width={1080} height={260} durationInFrames={BASELINE_DURATION} name={label}>
          <OnionSkin frames={frames}>{children}</OnionSkin>
        </Sequence>
      </div>
    </div>
  </>
);

export const KitLab: React.FC = () => {
  const { fps } = useVideoConfig();
  const series = [
    { label: 'before', motion: baseCardX(0), color: ink.muted },
    { label: 'after', motion: afterCardX(0, fps), color: ink.ramp[0] },
  ];
  const from = BASE_CARD_AT[0] - 4, to = BASE_CARD_AT[0] + 36;
  const onion = onionFrames(BASE_CARD_AT[0] + 1, BASE_CARD_AT[0] + 16, 9); // the travel and the settle
  return (
    <Stage>
      <div style={{ position: 'absolute', left: 60, top: 34, display: 'flex', alignItems: 'baseline', gap: 22 }}>
        <div style={{ font: `600 24px ${ink.font.mono}`, letterSpacing: '0.16em', color: ink.text }}>CUEKITVOLTZ LAB</div>
        <div style={{ font: `500 20px ${ink.font.mono}`, letterSpacing: '0.08em', color: ink.muted }}>phase 1 · motion core</div>
      </div>
      <Compare
        style={{ left: 60, top: 92 }} scale={0.47} gap={36}
        source={{ width: 1080, height: 1920, durationInFrames: BASELINE_DURATION }}
        panels={[
          { label: 'Before', note: 'plain Remotion', node: <Baseline /> },
          { label: 'After', note: 'springs · blur · follow-through', node: <BaselineAfter /> },
        ]}
      />
      <MotionGraph title="Card 1 x · position" series={series} from={from} to={to} width={690} height={262} style={{ left: 1170, top: 92 }} />
      <MotionGraph title="Card 1 x · speed" kind="speed" series={series} from={from} to={to} width={690} height={262} style={{ left: 1170, top: 370 }} />
      <OnionStrip top={648} label={`ONION · BEFORE · FRAMES ${onion[0]}–${onion[onion.length - 1]}`} frames={onion}>
        <BaseCard i={0} top={20} />
      </OnionStrip>
      <OnionStrip top={852} label="ONION · AFTER · SAME FRAMES" frames={onion}>
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${20 - BASE_CARD_Y[0]}px)` }}>
          <AfterCard i={0} />
        </div>
      </OnionStrip>
    </Stage>
  );
};
