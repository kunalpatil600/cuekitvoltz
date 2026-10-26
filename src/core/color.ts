// Small, dependency-free color math for shading (hex in, hex out).
export type Rgb = [number, number, number];

export const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};

export const rgbToHex = (rgb: Rgb) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

export const mixColor = (a: string, b: string, t: number) => {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
};

/** k > 1 lightens toward white (k = 2 is white), k < 1 darkens toward black (k = 0 is black). */
export const shade = (hex: string, k: number) => (k >= 1 ? mixColor(hex, '#ffffff', Math.min(1, k - 1)) : mixColor(hex, '#000000', 1 - Math.max(0, k)));

export const withAlpha = (hex: string, a: number) => `rgba(${hexToRgb(hex).join(',')},${a})`;
