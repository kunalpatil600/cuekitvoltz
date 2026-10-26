import React from 'react';
import { Html5Audio, Sequence, staticFile } from 'remotion';

// One-shot sound effects from public/sfx/ (generated procedurally). Example helper, not part of the kit.
export type SfxName = 'click-soft' | 'impact' | 'riser' | 'whoosh' | 'whoosh-soft' | 'chime' | 'glass';

export const Sfx: React.FC<{ at: number; name: SfxName | null; volume?: number }> = ({ at, name, volume = 0.6 }) => {
  if (!name) return null;
  return (
    <Sequence from={Math.max(0, Math.round(at))} durationInFrames={90} layout="none">
      <Html5Audio src={staticFile(`sfx/${name}.mp3`)} volume={volume} />
    </Sequence>
  );
};
