// Where content may go on each platform frame. Shorts/Reels/TikTok cover the top bar, the bottom
// caption block and a right-hand button column; landscape keeps title-safe side margins.
export type Rect = { x: number; y: number; w: number; h: number };
export type SafeArea = { name: string; rect: Rect; avoid: Rect[]; minText: number };
export type SafePreset = 'auto' | 'shorts' | 'landscape' | 'square';

const PRESETS: Record<Exclude<SafePreset, 'auto'>, SafeArea & { width: number; height: number }> = {
  shorts: { name: 'shorts', width: 1080, height: 1920, rect: { x: 90, y: 240, w: 900, h: 1240 }, avoid: [{ x: 960, y: 1000, w: 120, h: 920 }], minText: 30 },
  landscape: { name: 'landscape', width: 1920, height: 1080, rect: { x: 120, y: 80, w: 1680, h: 920 }, avoid: [], minText: 24 },
  square: { name: 'square', width: 1080, height: 1080, rect: { x: 60, y: 60, w: 960, h: 960 }, avoid: [], minText: 28 },
};

const scaleRect = (r: Rect, sx: number, sy: number): Rect => ({ x: r.x * sx, y: r.y * sy, w: r.w * sx, h: r.h * sy });

/** The safe area for a frame size, from the preset closest to its aspect ratio (or the one named). */
export const safeAreaFor = (width: number, height: number, preset: SafePreset = 'auto'): SafeArea => {
  const ratio = width / height;
  const key = preset !== 'auto' ? preset : ratio < 0.8 ? 'shorts' : ratio > 1.25 ? 'landscape' : 'square';
  const p = PRESETS[key];
  const sx = width / p.width, sy = height / p.height;
  return { name: p.name, rect: scaleRect(p.rect, sx, sy), avoid: p.avoid.map((r) => scaleRect(r, sx, sy)), minText: p.minText * Math.min(sx, sy) };
};
