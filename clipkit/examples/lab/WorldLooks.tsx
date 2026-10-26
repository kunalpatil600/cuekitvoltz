import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { S } from '../shared/type';
import {
  Character, Database, IsoLink, IsoScene, Laptop, Look, Outline, Server, Stage, characterLooks, gestures, ink, isoRoute, isoView, performance, spring, springs, tween, withGestures,
} from 'cuekitvoltz';
import type { LookPack } from 'cuekitvoltz';

// cuekitvoltz style packs (16:9): one small scene (iso objects + a character) rendered through each
// look: flat, film, print (halftone), duotone, sticker outline, and film + sticker together.
export const WORLD_LOOKS_DURATION = 90;
const SCALE = 557 / 1920;
const view = isoView({ origin: [1180, 300], unit: 130 });

const Mini: React.FC<{ sticker?: boolean }> = ({ sticker }) => {
  const { fps } = useVideoConfig();
  const perf = performance([{ at: 0, pose: 'wave' }], fps);
  const pose = withGestures(perf.pose, gestures.wave({ from: 0, to: 200 }));
  const things = (
    <>
      <IsoScene view={view}>
        <IsoLink path={isoRoute([1.9, 3.2], [3.4, 2.4])} packets={[{ at: tween({ at: 20, dur: 40, ease: (t) => t }) }]} />
        <Laptop x={0.4} y={2.6} />
        <Server x={2.5} y={1.2} rise={spring({ at: 0, fps, ...springs.bouncy })} />
        <Database x={3.9} y={2.4} />
      </IsoScene>
      <Character pose={pose} face={perf.face} look={characterLooks.dev} size={640} x={() => 420} y={() => 1000} shadow={!sticker} seed="mini" />
    </>
  );
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #2A1A6B 0%, #0E3B5C 55%, #3A1030 100%)' }}>
      <div style={{ position: 'absolute', left: 110, top: 90, ...S(120, 760) }}>Look packs</div>
      {sticker ? <Outline width={7}>{things}</Outline> : <AbsoluteFill>{things}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

const CELLS: { name: string; pack: LookPack; sticker?: boolean }[] = [
  { name: 'flat', pack: 'flat' },
  { name: 'film', pack: 'film' },
  { name: 'print · halftone', pack: 'print' },
  { name: 'duotone', pack: 'duotone' },
  { name: 'sticker outline', pack: 'flat', sticker: true },
  { name: 'film + sticker', pack: 'film', sticker: true },
];

export const WorldLooks: React.FC = () => (
  <Stage>
    <div style={{ position: 'absolute', left: 60, top: 34, display: 'flex', alignItems: 'baseline', gap: 22 }}>
      <div style={{ font: `600 26px ${ink.font.mono}`, letterSpacing: '0.16em', color: ink.text }}>CUEKITVOLTZ · STYLE PACKS</div>
      <div style={{ font: `500 22px ${ink.font.mono}`, letterSpacing: '0.08em', color: ink.muted }}>procedural · no image files · one wrapper</div>
    </div>
    {CELLS.map((c, i) => {
      const left = 85 + (i % 3) * 597, top = 130 + Math.floor(i / 3) * 420;
      return (
        <div key={c.name} style={{ position: 'absolute', left, top }}>
          <div style={{ font: `600 22px ${ink.font.mono}`, color: ink.text, marginBottom: 12 }}>{c.name}</div>
          <div style={{ position: 'relative', width: 557, height: 313, overflow: 'hidden', borderRadius: 12, outline: `1.5px solid ${ink.line}` }}>
            <div style={{ position: 'relative', width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: '0 0' }}>
              <Sequence width={1920} height={1080} durationInFrames={WORLD_LOOKS_DURATION} name={c.name}>
                <Look pack={c.pack}><Mini sticker={c.sticker} /></Look>
              </Sequence>
            </div>
          </div>
        </div>
      );
    })}
  </Stage>
);

/** One look at full size (for close inspection and README stills). */
export const LookSolo: React.FC<{ pack?: LookPack; sticker?: boolean }> = ({ pack = 'print', sticker }) => (
  <Look pack={pack}><Mini sticker={sticker} /></Look>
);
