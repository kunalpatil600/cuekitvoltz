import React from 'react';
import { Stage } from 'cuekitvoltz';

// A deliberately broken layout that layout QA must flag: one overlap, two unsafe (past the right
// edge, under the button column), one too-small and one clipped. The allowed watermark, the clean
// line and the per-glyph line must pass. Check: npm run stills -- qa-fixture 0 --qa
const text = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: 'absolute', fontSize: size, fontWeight: 700, lineHeight: 1.05, whiteSpace: 'nowrap', ...extra });

export const QaFixture: React.FC = () => (
  <Stage>
    <div style={text(100, { left: 90, top: 330 })}>Overlapping</div>
    <div style={text(56, { left: 90, top: 372, color: '#8E8E99' })}>this body sits on top</div>
    <div style={text(60, { left: 600, top: 560 })}>Runs past the edge</div>
    <div style={text(60, { left: 90, top: 760 })}>This one is fine</div>
    <div style={{ position: 'absolute', left: 90, top: 960, fontSize: 80, fontWeight: 700 }}>
      {[...'Per-glyph line'].map((ch, i) => <span key={i} style={{ display: 'inline-block', letterSpacing: '-0.06em', whiteSpace: 'pre' }}>{ch}</span>)}
    </div>
    <div style={{ position: 'absolute', left: 90, top: 1120, width: 420, height: 80, overflow: 'hidden', background: '#15151C', borderRadius: 12 }}>
      <div style={text(60, { left: 16, top: 6 })}>Clipped by its box</div>
    </div>
    <div style={text(30, { left: 946, top: 1240 })}>Hi</div>
    <div style={text(18, { left: 90, top: 1340, fontWeight: 500, color: '#8E8E99' })}>A footnote far too small to read on a phone</div>
    <div data-qa-allow="unsafe small" style={text(22, { right: 40, bottom: 40, color: '#8E8E99' })}>watermark (allowed)</div>
  </Stage>
);
