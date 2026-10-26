import React, { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import { spring, springs } from '../motion/spring';
import { tween } from '../motion/tween';
import { useTheme } from '../theme/theme';
import type { VoiceTrack, VoWord } from './track';

// Shorts-style captions straight from the voice track: the line is cut into short phrases, each word
// arrives as it's spoken, the word being said lights up, and *emphasised* words take the accent.

type Group = { words: VoWord[]; from: number; to: number };

const phrases = (track: VoiceTrack, maxWords: number): Group[] => {
  const out: Group[] = [];
  track.data.lines.forEach((line, li) => {
    const first = out.length;
    let cur: VoWord[] = [];
    const flush = () => {
      if (cur.length) out.push({ words: cur, from: cur[0][1], to: cur[cur.length - 1][2] });
      cur = [];
    };
    line.words.forEach((w, i) => {
      const prev = line.words[i - 1];
      if (cur.length && (cur.length >= maxWords || /[.,!?;:—]$/.test(prev[0]) || w[1] - prev[2] > 0.35)) flush();
      cur.push(w);
    });
    flush();
    // a phrase holds until the next one starts (or a beat after the line ends)
    const next = track.data.lines[li + 1];
    const mine = out.slice(first);
    mine.forEach((g, k) => {
      g.to = mine[k + 1] ? mine[k + 1].from : Math.min(line.end + 0.45, next ? next.start : Infinity);
    });
  });
  return out;
};

export type CaptionsProps = {
  track: VoiceTrack;
  /** centre line of the captions in px */
  y?: number;
  x?: number;
  width?: number;
  size?: number;
  maxWords?: number;
  /** 'pop': words spring in as they're spoken; 'karaoke': the whole phrase shows, the spoken word lights up */
  mode?: 'pop' | 'karaoke';
  color?: string;
  /** the word being spoken */
  active?: string;
  /** *emphasised* words */
  accent?: string;
  /** outline/shadow colour for contrast over busy pictures */
  outline?: string;
  /** hide while this returns true (e.g. over a title card) */
  hidden?: (frame: number) => boolean;
  style?: CSSProperties;
};

export const Captions: React.FC<CaptionsProps> = ({
  track, y = 1300, x = 540, width = 900, size = 64, maxWords = 4, mode = 'pop', color, active, accent, outline, hidden, style,
}) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const groups = useMemo(() => phrases(track, maxWords), [track, maxWords]);
  const t = frame / track.fps;
  const g = groups.find((p) => t >= p.from - 2 / track.fps && t < p.to);
  if (!g || hidden?.(frame)) return null;
  const fill = color ?? theme.text;
  return (
    <div
      style={{
        position: 'absolute', left: x - width / 2, top: y, width, transform: 'translateY(-50%)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        columnGap: size * 0.26, rowGap: size * 0.08, font: `800 ${size}px/1.08 ${theme.font.sans}`, letterSpacing: '-0.02em', textAlign: 'center',
        textShadow: `0 ${size * 0.06}px ${size * 0.22}px ${outline ?? theme.captions?.outline ?? 'rgba(0,0,0,0.55)'}`, ...style,
      }}
    >
      {g.words.map(([text, s, e, emph], i) => {
        const at = track.frame(s);
        const pop = mode === 'pop' ? spring({ at: at - 1.5, fps: track.fps, from: 0.7, to: 1, ...springs.pop })(frame) : 1;
        const o = mode === 'pop' ? tween({ at: at - 1.5, dur: 3 })(frame) : 1;
        const speaking = t >= s - 0.02 && t < e + 0.06;
        const c = speaking ? active ?? theme.captions?.active ?? theme.accent : emph ? accent ?? theme.captions?.accent ?? theme.accent : fill;
        return (
          <span key={`${s}-${i}`} style={{ display: 'inline-block', color: c, opacity: o, transform: `scale(${pop})`, transformOrigin: '50% 70%' }}>
            {text}
          </span>
        );
      })}
    </div>
  );
};
