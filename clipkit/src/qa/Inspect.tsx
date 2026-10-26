import React, { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import { flushSync } from 'react-dom';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Rect, SafeArea } from '../stage/safe-area';

// Layout QA: measures every visible piece of text in the rendered frame and flags what a reviewer
// would catch in a still:
//   unsafe   outside the platform-safe area, or under the platform's button column
//   overlap  two separate pieces of text on top of each other
//   small    below the platform's minimum readable size
//   clipped  cut off by an overflow-hidden box
// Each frame logs `QA:{frame, issues}` to the browser console (collected by the stills script with --qa)
// and draws numbered boxes over the problems. Mark intentional exceptions on an element or an
// ancestor with data-qa-allow="unsafe overlap small clipped", and dev-only UI with data-qa-ignore.
// Judge settled frames: mid-transition frames overlap by design.

export type IssueKind = 'unsafe' | 'overlap' | 'small' | 'clipped';
export type Issue = { kind: IssueKind; text: string; box: Rect; detail: string };

type Block = { el: Element; text: string; rects: Rect[]; size: number };

const union = (rs: Rect[]): Rect => {
  const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};
const intersect = (a: Rect, b: Rect): Rect | null => {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
};
// a text node's rect is the font's full content area, taller than the glyphs: compare the middle 70%
const core = (r: Rect): Rect => ({ x: r.x, y: r.y + r.h * 0.15, w: r.w, h: r.h * 0.7 });
const allows = (el: Element, kind: IssueKind) => (el.closest('[data-qa-allow]')?.getAttribute('data-qa-allow') ?? '').split(/\s+/).includes(kind);

/** Product of the 2D scale factors from el up to root (rotate and skew don't count as scale). */
const scaleOf = (el: Element, root: Element) => {
  let s = 1;
  for (let n: Element | null = el; n && n !== root; n = n.parentElement) {
    const t = getComputedStyle(n).transform;
    if (t && t !== 'none') {
      const m = new DOMMatrix(t);
      s *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    }
  }
  return s;
};
const opacityOf = (el: Element, root: Element) => {
  let o = 1;
  for (let n: Element | null = el; n && n !== root; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
    o *= parseFloat(cs.opacity);
  }
  return o;
};
// per-glyph spans (inline-block) belong to the line that holds them
const INLINE = new Set(['inline', 'inline-block', 'contents']);
const blockOf = (el: Element, root: Element) => {
  let n = el;
  while (n !== root && n.parentElement && INLINE.has(getComputedStyle(n).display)) n = n.parentElement;
  return n;
};

const measure = (root: HTMLElement, safe: SafeArea, compWidth: number): Issue[] => {
  const rootRect = root.getBoundingClientRect();
  const k = compWidth / rootRect.width; // viewport px -> composition px (Studio scales the player)
  const toComp = (r: DOMRect): Rect => ({ x: (r.left - rootRect.left) * k, y: (r.top - rootRect.top) * k, w: r.width * k, h: r.height * k });

  const blocks = new Map<Element, Block>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!node.textContent?.trim() || !el || el.closest('[data-qa-ignore]') || opacityOf(el, root) < 0.15) continue;
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5).map(toComp);
    if (!rects.length) continue;
    // SVG text has no CSS box to scale from: size checks cover HTML text only
    const size = el instanceof SVGElement ? Infinity : parseFloat(getComputedStyle(el).fontSize) * scaleOf(el, root);
    const owner = blockOf(el, root);
    const b = blocks.get(owner) ?? { el: owner, text: '', rects: [], size: Infinity };
    b.text += node.textContent;
    b.rects.push(...rects);
    b.size = Math.min(b.size, size);
    blocks.set(owner, b);
  }
  const list = [...blocks.values()].map((b) => ({ ...b, text: b.text.replace(/\s+/g, ' ').trim().slice(0, 48), box: union(b.rects) }));

  const issues: Issue[] = [];
  const s = safe.rect;
  for (const b of list) {
    const { box } = b;
    if (!allows(b.el, 'unsafe')) {
      const over = Math.max(s.x - box.x, box.x + box.w - (s.x + s.w), s.y - box.y, box.y + box.h - (s.y + s.h));
      const underUi = safe.avoid.some((z) => { const hit = intersect(core(box), z); return hit && hit.w * hit.h > 100; });
      if (over > 2) issues.push({ kind: 'unsafe', text: b.text, box, detail: `${Math.round(over)} px outside the safe area` });
      else if (underUi) issues.push({ kind: 'unsafe', text: b.text, box, detail: 'under the platform button column' });
    }
    if (b.size < safe.minText - 0.5 && !allows(b.el, 'small')) {
      issues.push({ kind: 'small', text: b.text, box, detail: `${Math.round(b.size)} px text (min ${Math.round(safe.minText)})` });
    }
    if (!allows(b.el, 'clipped')) {
      for (let n: Element | null = b.el; n && n !== root; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const clip = toComp(n.getBoundingClientRect());
        const cut = b.rects.some((r) => {
          const tol = Math.max(2, r.h * 0.18);
          return r.x < clip.x - 2 || r.x + r.w > clip.x + clip.w + 2 || r.y < clip.y - tol || r.y + r.h > clip.y + clip.h + tol;
        });
        if (cut) {
          issues.push({ kind: 'clipped', text: b.text, box, detail: 'cut off by an overflow-hidden box' });
          break;
        }
      }
    }
  }
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.el.contains(b.el) || b.el.contains(a.el) || allows(a.el, 'overlap') || allows(b.el, 'overlap')) continue;
      let best: Rect | null = null;
      for (const ra of a.rects) {
        for (const rb of b.rects) {
          const hit = intersect(core(ra), core(rb));
          if (hit && hit.w >= 6 && hit.h >= 6 && (!best || hit.w * hit.h > best.w * best.h)) best = hit;
        }
      }
      if (best && best.w * best.h >= 100) issues.push({ kind: 'overlap', text: `${a.text} × ${b.text}`, box: best, detail: `${Math.round(best.w)}×${Math.round(best.h)} px of text on text` });
    }
  }
  return issues;
};

const COLOR: Record<IssueKind, string> = { unsafe: '#FF9F0A', overlap: '#FF3B4E', small: '#FFD60A', clipped: '#BF5AF2' };

/** Runs layout QA on every frame inside `root` (mounted by <Stage> when rendered with { qa: true }). */
export const Inspect: React.FC<{ root: RefObject<HTMLDivElement | null>; safe: SafeArea }> = ({ root, safe }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const [issues, setIssues] = useState<Issue[]>([]);
  useLayoutEffect(() => {
    // hold the frame until it's measured and the boxes are drawn, so the still shows them
    const handle = delayRender(`qa: measuring frame ${frame}`);
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
    // Remotion first mounts the composition in an off-screen, zero-size container and moves it onto
    // the canvas a moment later: wait until the root has its real size before measuring
    let tries = 0;
    const attempt = () => {
      if (done) return;
      const el = root.current;
      if (!el || (el.getBoundingClientRect().width < 1 && ++tries < 120)) return void setTimeout(attempt, 16);
      if (el.getBoundingClientRect().width < 1) return finish();
      const found = measure(el, safe, width);
      console.log(`QA:${JSON.stringify({ frame, issues: found })}`);
      flushSync(() => setIssues(found));
      finish();
    };
    document.fonts.ready.then(attempt);
    return finish;
  }, [frame, root, safe, width]);
  return (
    <AbsoluteFill data-qa-ignore style={{ pointerEvents: 'none' }}>
      {issues.map((it, i) => (
        <div key={i} style={{ position: 'absolute', left: it.box.x - 6, top: it.box.y - 6, width: it.box.w + 12, height: it.box.h + 12, border: `3px solid ${COLOR[it.kind]}`, borderRadius: 6 }}>
          <div style={{ position: 'absolute', left: -3, top: -34, padding: '3px 10px', borderRadius: 4, background: COLOR[it.kind], color: '#000', font: '600 20px monospace', whiteSpace: 'nowrap' }}>
            {i + 1} {it.kind}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
