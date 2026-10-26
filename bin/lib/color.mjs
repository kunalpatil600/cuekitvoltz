// Colour math for themes: parsing, mixing, WCAG contrast, and nudging a colour until it reads.

export const parseHex = (input) => {
  const m = String(input).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${h.toUpperCase()}`;
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** a → b by t (0–1), in sRGB. */
export const mix = (a, b, t) => {
  const x = rgb(a), y = rgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};

export const rgba = (hex, alpha) => `rgba(${rgb(hex).join(',')},${alpha})`;

/** WCAG relative luminance, 0 (black) to 1 (white). */
export const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio, 1 to 21. */
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** `fg`, or the closest lighter/darker version of it that reaches `min` contrast on `bg`. */
export const readable = (fg, bg, min) => {
  if (contrast(fg, bg) >= min) return fg;
  const target = luminance(bg) > 0.18 ? '#000000' : '#FFFFFF';
  for (let t = 0.04; t <= 1.0001; t += 0.04) {
    const c = mix(fg, target, t);
    if (contrast(c, bg) >= min) return c;
  }
  return target;
};

const truecolor = () => process.stdout.isTTY && !process.env.NO_COLOR;

/** A coloured block for the terminal (plain text when colours are off). */
export const swatch = (hex, width = 4) => (truecolor() ? `\x1b[48;2;${rgb(hex).join(';')}m${' '.repeat(width)}\x1b[0m` : `[${hex}]`);
