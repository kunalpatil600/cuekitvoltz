import type { Motion } from '../core/motion';

// The voice director (direct.py) writes vo.json: the voice-over's sections, anchors, every word's
// time and per-frame mouth curves. voiceTrack() turns it into frame-based helpers, so a video built
// TTS-first never hand-times anything: scenes start at sections, beats land on anchors, captions and
// lip-sync follow the words.

/** [text, start s, end s, emphasis 0|1, spoken form when it differs from the text] */
export type VoWord = [string, number, number, number] | [string, number, number, number, string];
export type VoLine = { section: string | null; emotion: string | null; start: number; end: number; text: string; words: VoWord[] };
export type VoData = {
  version: number;
  id: string;
  voice: string;
  fps: number;
  duration: number;
  /** path of the wav under public/ (pass it through staticFile in your video) */
  audio: string;
  sections: Record<string, number>;
  anchors: Record<string, number>;
  lines: VoLine[];
  mouth: { open: number[]; visemes: string };
};

/** X rest · M lips closed · F lip under teeth · L tongue · S teeth · E wide · A open · O round · U pucker */
export type Viseme = 'X' | 'M' | 'F' | 'L' | 'S' | 'E' | 'A' | 'O' | 'U';

export type VoiceTrack = {
  data: VoData;
  fps: number;
  /** total length in frames (set the composition's durationInFrames to this) */
  frames: number;
  /** frame of a section or anchor (throws on a typo, so a renamed anchor can't silently drift) */
  at: (name: string) => number;
  /** frame of the n-th spoken occurrence of a word (case and punctuation ignored) */
  word: (text: string, nth?: number) => number;
  /** seconds → frames at the video's fps */
  frame: (seconds: number) => number;
  /** mouth open 0–1 (feed <Character talk>) */
  mouth: Motion;
  /** mouth shape (feed <Character viseme>) */
  viseme: Motion<Viseme>;
  /** the line being spoken (or about to be, within `lookahead` frames), with its index */
  lineAt: (frame: number, lookahead?: number) => { line: VoLine; index: number } | null;
  /** 0–1: how much the voice is speaking now (eased in and out over `fade` frames around each line) */
  speaking: (frame: number, fade?: number) => number;
  /** a volume curve for music: `base` normally, `under` while the voice speaks (pass it to <Audio volume>) */
  duck: (base: number, under: number, fade?: number) => (frame: number) => number;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

/** `json` is vo.json as imported (its inferred type is looser than VoData, so it's taken as is). */
export const voiceTrack = (json: unknown, fps: number): VoiceTrack => {
  const data = json as VoData;
  const frame = (s: number) => s * fps;
  const clash = Object.keys(data.anchors).filter((k) => k in data.sections);
  if (clash.length) throw new Error(`voiceTrack: "${clash.join('", "')}" names both a section and an anchor; rename one in the script`);
  const points: Record<string, number> = { ...data.sections, ...data.anchors };
  const words = data.lines.flatMap((l) => l.words);
  const src = data.fps;
  const sample = (f: number) => {
    const i = (f / fps) * src;
    const a = Math.floor(i);
    const o = data.mouth.open;
    if (a < 0 || a >= o.length) return 0;
    const b = Math.min(o.length - 1, a + 1);
    return o[a] + (o[b] - o[a]) * (i - a);
  };
  const speaking = (f: number, fade = 8) => {
    const t = f / fps;
    const pad = fade / fps;
    let v = 0;
    for (const l of data.lines) {
      if (t < l.start - pad || t > l.end + pad) continue;
      const k = t < l.start ? 1 - (l.start - t) / pad : t > l.end ? 1 - (t - l.end) / pad : 1;
      v = Math.max(v, k);
    }
    return v * v * (3 - 2 * v);
  };
  return {
    data,
    fps,
    speaking,
    duck: (base, under, fade = 8) => (f) => base + (under - base) * speaking(f, fade),
    frames: Math.ceil(data.duration * fps),
    frame,
    at: (name) => {
      if (!(name in points)) throw new Error(`voiceTrack: no section or anchor "${name}" (have: ${Object.keys(points).join(', ')})`);
      return frame(points[name]);
    },
    word: (text, nth = 0) => {
      const hits = words.filter((w) => norm(w[0]) === norm(text));
      if (!hits[nth]) throw new Error(`voiceTrack: word "${text}" #${nth} not in the script`);
      return frame(hits[nth][1]);
    },
    mouth: sample,
    viseme: (f) => {
      const i = Math.round((f / fps) * src);
      return (data.mouth.visemes[i] ?? 'X') as Viseme;
    },
    lineAt: (f, lookahead = 0) => {
      const t = f / fps;
      const index = data.lines.findIndex((l, i) => {
        const next = data.lines[i + 1];
        return t >= l.start - lookahead / fps && t < (next ? next.start - lookahead / fps : Infinity);
      });
      return index === -1 ? null : { line: data.lines[index], index };
    },
  };
};

/**
 * Scene lengths for <Scenes> from the voice's sections: scene i runs from section i to section i+1,
 * each cut centred on the boundary. `starts` are the scenes' first frames (to turn voice frames into
 * scene-relative ones).
 */
export const voiceScenes = (track: VoiceTrack, sections: string[], cuts: number[]) => {
  const starts: number[] = [0];
  const scenes: number[] = [];
  for (let i = 1; i < sections.length; i++) {
    const end = Math.round(track.at(sections[i]) + cuts[i - 1] / 2);
    scenes.push(end - starts[i - 1]);
    starts.push(end - cuts[i - 1]);
  }
  scenes.push(track.frames - starts[starts.length - 1]);
  return { scenes, starts };
};
