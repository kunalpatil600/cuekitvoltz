import React from 'react';
import { Database, Globe, Network, Server } from 'lucide';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { Shell } from '../shared/Scene';
import { Chip, M, MixReveal, S } from '../shared/type';
import { IconTile } from '../shared/DrawIcon';
import type { IconNode } from '../shared/DrawIcon';
import { Stage } from 'cuekitvoltz';
import type { Motion } from 'cuekitvoltz';

// The "before" of the cuekitvoltz lab: a typical hand-made Remotion scene (interpolate,
// cubic easing, fades, no motion blur). Every kit phase re-builds it as the "after", so the
// upgrade is judged on the same content.
export const BASELINE_DURATION = 120;
export const BASE_CARD_AT = [34, 46, 58];
export const BASE_CARD_DUR = 18;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Card i's x position: slides in from the right edge with an ease-out cubic. */
export const baseCardX = (i: number): Motion => (f) =>
  interpolate(f, [BASE_CARD_AT[i], BASE_CARD_AT[i] + BASE_CARD_DUR], [1080, 90], { ...clamp, easing: Easing.out(Easing.cubic) });

export const CARDS: { icon: IconNode; title: string; sub: string }[] = [
  { icon: Globe, title: 'Browser', sub: 'sends GET /api/user' },
  { icon: Server, title: 'API server', sub: 'checks auth, routes' },
  { icon: Database, title: 'Database', sub: 'returns the row' },
];
export const BASE_CARD_Y = [660, 920, 1180];

export const BaseCard: React.FC<{ i: number; top?: number }> = ({ i, top = BASE_CARD_Y[i] }) => {
  const frame = useCurrentFrame();
  const c = CARDS[i];
  return (
    <div style={{
      position: 'absolute', left: baseCardX(i)(frame), top, width: 900, height: 220, borderRadius: 36, display: 'flex', alignItems: 'center', gap: 40, padding: '0 40px',
      background: 'rgba(20,20,30,0.78)', border: '1.5px solid rgba(255,255,255,0.14)', boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
    }}>
      <IconTile icon={c.icon} size={140} at={BASE_CARD_AT[i] + 4} />
      <div>
        <div style={S(60, 700)}>{c.title}</div>
        <div style={M(28, 500, { marginTop: 14 })}>{c.sub}</div>
      </div>
    </div>
  );
};

export const Baseline: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage background={false}>
      <Shell layer="back" palette="indigo">
        <Chip at={4} icon={Network}>System design</Chip>
        <MixReveal at={10} size={104} parts={['One request,']} style={{ left: 90, top: 340 }} />
        <MixReveal at={22} size={104} parts={[{ t: 'six', serif: true, ramp: 'spectrum' }, ' hops.']} style={{ left: 90, top: 452 }} />
        {[0, 1].map((i) => (
          <div key={i} style={{
            position: 'absolute', left: 160, top: BASE_CARD_Y[i] + 220, width: 3, background: 'rgba(255,255,255,0.3)',
            height: interpolate(frame, [BASE_CARD_AT[i + 1], BASE_CARD_AT[i + 1] + 14], [0, 40], clamp),
          }} />
        ))}
        {CARDS.map((_, i) => <BaseCard key={i} i={i} />)}
      </Shell>
    </Stage>
  );
};
