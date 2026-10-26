// Themes: suggested palettes, custom palettes, and everything derived from them (fonts, iso colours,
// 3D light and background, captions). Each theme lives in its own folder, cuekitvoltz/themes/<name>/:
//   theme.json    what you chose (edit it, then `theme build <name>`)
//   theme.ts      the generated Theme for <Stage theme={theme}>
//   preview.svg   a swatch card
// cuekitvoltz/theme.ts re-exports the active one.
import fs from 'node:fs';
import path from 'node:path';
import { contrast, luminance, mix, parseHex, readable, rgba, swatch } from './color.mjs';
import { ask, choose, confirm, interactive } from './prompt.mjs';
import { KIT_DIR, THEMES_DIR, fail, readConfig, rel, takeFrom, writeConfig } from './project.mjs';

export const PRESETS = {
  sand: { label: 'Sand', hint: 'warm brown, sand and copper', colors: { bg: '#3A2C1F', surface: '#5B4632', text: '#F4D9A0', accent: '#C8792C' }, fonts: 'editorial' },
  ember: { label: 'Ember', hint: 'green-black and deep red', colors: { bg: '#06110C', surface: '#171717', text: '#F2EEE8', accent: '#A31C1B' }, fonts: 'editorial' },
  studio: { label: 'Studio', hint: 'white high-key, ink and blue', colors: { bg: '#F4F5F7', surface: '#FFFFFF', text: '#16181D', accent: '#3B5BDB' }, fonts: 'clean' },
  midnight: { label: 'Midnight', hint: 'near-black with a violet-pink spectrum', colors: { bg: '#07070B', surface: '#15151C', text: '#F5F5F7', accent: '#7D7AFF', accent2: '#FF6FB5' }, fonts: 'editorial' },
  neon: { label: 'Neon', hint: 'ink blue, mint and magenta', colors: { bg: '#0A0A14', surface: '#141428', text: '#EDEBFF', accent: '#00E5A8', accent2: '#FF3EA5' }, fonts: 'grotesk' },
  paper: { label: 'Paper', hint: 'warm paper, ink and vermilion', colors: { bg: '#F3EDE2', surface: '#FBF7F0', text: '#1E1A16', accent: '#D9480F' }, fonts: 'classic' },
};

// Font pairings: structure (sans), the one emotional word (serif italic), labels (mono). All OFL, all
// loaded through @remotion/google-fonts.
export const FONTS = {
  editorial: { label: 'Editorial', hint: 'Geist / Instrument Serif / Geist Mono', names: ['Geist', 'Instrument Serif', 'Geist Mono'] },
  clean: {
    label: 'Clean', hint: 'Inter / Newsreader / JetBrains Mono', names: ['Inter', 'Newsreader', 'JetBrains Mono'],
    sans: { module: 'Inter', variable: true }, serif: { module: 'Newsreader', style: 'italic', variable: true }, mono: { module: 'JetBrainsMono', variable: true },
  },
  grotesk: {
    label: 'Grotesk', hint: 'Space Grotesk / Fraunces / Space Mono', names: ['Space Grotesk', 'Fraunces', 'Space Mono'],
    sans: { module: 'SpaceGrotesk', variable: true }, serif: { module: 'Fraunces', style: 'italic', variable: true }, mono: { module: 'SpaceMono', weights: ['400', '700'] },
  },
  plex: {
    label: 'Plex', hint: 'IBM Plex Sans / IBM Plex Serif / IBM Plex Mono', names: ['IBM Plex Sans', 'IBM Plex Serif', 'IBM Plex Mono'],
    sans: { module: 'IBMPlexSans', variable: true }, serif: { module: 'IBMPlexSerif', style: 'italic', weights: ['400', '500'] }, mono: { module: 'IBMPlexMono', weights: ['400', '500', '700'] },
  },
  classic: {
    label: 'Classic', hint: 'DM Sans / DM Serif Display / DM Mono', names: ['DM Sans', 'DM Serif Display', 'DM Mono'],
    sans: { module: 'DMSans', variable: true }, serif: { module: 'DMSerifDisplay', style: 'italic', weights: ['400'] }, mono: { module: 'DMMono', weights: ['400', '500'] },
  },
};

const WHITE = '#FFFFFF';
const BLACK = '#000000';

/** Problems a palette has, with the fix to suggest. */
export const checkPalette = (colors) => {
  const notes = [];
  const textRatio = contrast(colors.text, colors.bg);
  const fixes = {};
  if (textRatio < 4.5) {
    fixes.text = readable(colors.text, colors.bg, 4.5);
    notes.push(`Text on background is ${textRatio.toFixed(1)}:1; it needs 4.5:1 to read on a phone. Suggested text colour: ${fixes.text}.`);
  }
  const accentRatio = contrast(colors.accent, colors.bg);
  if (accentRatio < 3) {
    notes.push(`Accent on background is ${accentRatio.toFixed(1)}:1. Shapes keep ${colors.accent}; captions and highlighted words use ${readable(colors.accent, colors.bg, 3)}, a version that reaches 3:1.`);
  }
  return { notes, fixes };
};

/** Every colour the theme needs, derived from the 3–5 you chose. */
export const derive = (spec) => {
  const { bg, text, accent } = spec.colors;
  const accent2 = spec.colors.accent2 ?? null;
  const dark = luminance(bg) < 0.2;
  const surface = spec.colors.surface ?? mix(bg, text, 0.07);
  const accentText = readable(accent, bg, 3);
  const good = readable(dark ? '#34D399' : '#12A150', bg, 3);
  const iso = dark
    ? {
      body: mix(bg, text, 0.22), silver: mix(text, bg, 0.2), screen: mix(bg, BLACK, 0.5), accent, violet: accent2 ?? mix(accent, text, 0.4),
      warm: accent2 ?? accent, good, cloud: mix(text, WHITE, 0.5), pcb: mix(bg, accent, 0.2), phone: mix(bg, text, 0.12), platform: mix(bg, text, 0.06),
    }
    : {
      body: mix(text, bg, 0.3), silver: mix(bg, text, 0.2), screen: mix(text, BLACK, 0.3), accent, violet: accent2 ?? mix(accent, text, 0.4),
      warm: accent2 ?? accent, good, cloud: WHITE, pcb: mix(text, accent, 0.25), phone: mix(text, bg, 0.15), platform: mix(bg, text, 0.08),
    };
  // dark: softboxes tinted by the text colour, an accent kicker, the background as the room;
  // light: a high-key white studio with two dark strips so metal has something to reflect
  const studio = dark
    ? {
      panels: [
        { color: mix(WHITE, text, 0.35), power: 3.2, at: [0, 6, 1], size: [7, 4] },
        { color: mix(WHITE, text, 0.2), power: 3.4, at: [-6, 2, 1.5], size: [1.8, 6] },
        { color: accent, power: 5, at: [6, 1.2, -1], size: [1.8, 5] },
        { color: mix(WHITE, text, 0.5), power: 1.3, at: [1.5, 1, 6], size: [4, 3] },
        { color: surface, power: 1, at: [0, -6, 0], size: [16, 16] },
        { color: mix(bg, BLACK, 0.2), power: 1.2, at: [0, 2, -7], size: [16, 8] },
      ],
      bg: mix(bg, BLACK, 0.5),
      key: { at: [-3, 7, 4], color: mix(WHITE, text, 0.25), power: 2 },
      rim: { at: [5, 2.5, -4], color: accent2 ?? accent, power: 2.4 },
    }
    : {
      panels: [
        { color: WHITE, power: 2.4, at: [0, 7, 0.5], size: [7, 6] },
        { color: WHITE, power: 2.2, at: [-6, 2, 3], size: [3, 6] },
        { color: mix(WHITE, accent, 0.08), power: 2.2, at: [6, 2, 3], size: [3, 6] },
        { color: text, power: 1, at: [-4.5, 1.5, -4.5], size: [1.2, 6] },
        { color: text, power: 1, at: [4.5, 1.5, -4.5], size: [1.2, 6] },
        { color: mix(bg, text, 0.06), power: 1, at: [0, -6, 0], size: [16, 16] },
      ],
      bg: mix(bg, text, 0.2),
      key: { at: [0.6, 9, 1.8], color: WHITE, power: 1.6 },
      rim: { at: [-3, 2, -6], color: mix(WHITE, accent, 0.15), power: 1.2 },
    };
  const backdrop = dark
    ? { top: mix(bg, text, 0.06), bottom: mix(bg, BLACK, 0.4), glow: rgba(accent, 0.2), glowAt: [0.5, 0.42], glowSize: 0.6 }
    : { top: mix(bg, WHITE, 0.6), bottom: mix(bg, text, 0.1), glow: 'rgba(255,255,255,0.75)', glowAt: [0.5, 0.42], glowSize: 0.6 };
  return {
    mode: dark ? 'dark' : 'light',
    tokens: {
      name: spec.name, bg, surface, line: rgba(text, 0.14), text, muted: readable(mix(text, bg, 0.42), bg, 3.5), accent,
      ramp: accent2 ? [accent, accent2] : [mix(accent, WHITE, 0.3), accent], good, bad: readable(dark ? '#FF3B4E' : '#D92D3A', bg, 3),
    },
    iso, studio, backdrop,
    captions: { active: accentText, accent: accent2 ? readable(accent2, bg, 3) : accentText, outline: dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)' },
  };
};

// ------------------------------------------------------------------ files
/** A JS value as TypeScript source with single quotes. */
const ts = (v, ind = '') => {
  if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.every((x) => typeof x !== 'object') ? `[${v.map((x) => ts(x)).join(', ')}]` : `[\n${v.map((x) => `${ind}  ${ts(x, `${ind}  `)},`).join('\n')}\n${ind}]`;
  const flat = Object.values(v).every((x) => typeof x !== 'object' || (Array.isArray(x) && x.every((y) => typeof y !== 'object')));
  const entries = Object.entries(v).map(([k, x]) => `${k}: ${ts(x, `${ind}  `)}`);
  return flat && entries.join(', ').length < 110 ? `{ ${entries.join(', ')} }` : `{\n${entries.map((e) => `${ind}  ${e},`).join('\n')}\n${ind}}`;
};

const fontSource = (id) => {
  const f = FONTS[id];
  if (!f.sans) return { imports: [], kitImports: ['kitFonts'], expr: 'kitFonts' };
  const imports = [];
  const slots = [['sans', 'loadSans', 'sans-serif'], ['serif', 'loadSerif', 'serif'], ['mono', 'loadMono', 'monospace']].map(([slot, alias, fallback]) => {
    const d = f[slot];
    imports.push(`import { ${d.variable ? 'loadVariableFont' : 'loadFont'} as ${alias} } from '@remotion/google-fonts/${d.module}';`);
    const style = d.style ?? 'normal';
    const call = d.variable ? `${alias}('${style}', latin)` : `${alias}('${style}', { weights: [${d.weights.map((w) => `'${w}'`).join(', ')}], ...latin })`;
    return `${slot}: \`\${${call}.fontFamily}, ${fallback}\``;
  });
  return { imports, kitImports: [], expr: `{\n    ${slots.join(',\n    ')},\n  }`, latin: true };
};

export const themeSource = (spec) => {
  const d = derive(spec);
  const font = fontSource(spec.fonts);
  const kit = ['ink', ...font.kitImports, 'makeTheme'].sort();
  const body = { ...d.tokens };
  const lines = [
    `// cuekitvoltz theme "${spec.name}" (${d.mode}), generated from theme.json by \`npx cuekitvoltz theme build ${spec.name}\`.`,
    '// Put it on the root of a video, <Stage theme={theme}>: colours, fonts, iso objects, <Scene3D> light and',
    '// background, and <Captions> follow it; props you set on a component still win.',
    `import { ${kit.join(', ')} } from 'cuekitvoltz';`,
    "import type { Theme } from 'cuekitvoltz';",
    ...font.imports,
    '',
    ...(font.latin ? ["const latin = { subsets: ['latin' as const] };", ''] : []),
    'export const theme: Theme = makeTheme(ink, {',
    ...Object.entries(body).map(([k, v]) => `  ${k}: ${ts(v, '  ')},`),
    `  font: ${font.expr},`,
    `  iso: ${ts(d.iso, '  ')},`,
    `  studio: ${ts(d.studio, '  ')},`,
    `  backdrop: ${ts(d.backdrop, '  ')},`,
    `  captions: ${ts(d.captions, '  ')},`,
    '});',
    '',
    'export default theme;',
    '',
  ];
  return lines.join('\n');
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const previewSvg = (spec) => {
  const d = derive(spec);
  const t = d.tokens;
  const [sans, serif, mono] = FONTS[spec.fonts].names;
  const chips = [['bg', t.bg], ['surface', t.surface], ['text', t.text], ['muted', t.muted], ['accent', t.accent], ...(spec.colors.accent2 ? [['accent 2', spec.colors.accent2]] : []), ['good', t.good], ['bad', t.bad]];
  const w = 1200, h = 675;
  const cw = 120, gap = 16, x0 = 72;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><radialGradient id="g" cx="0.75" cy="0.2" r="0.7"><stop offset="0" stop-color="${t.accent}" stop-opacity="0.22"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="${t.bg}"/>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <text x="${x0}" y="92" fill="${t.muted}" font-family="'${mono}', monospace" font-size="22" letter-spacing="3">CUEKITVOLTZ THEME · ${esc(spec.name.toUpperCase())} · ${d.mode.toUpperCase()}</text>
  <text x="${x0}" y="200" fill="${t.text}" font-family="'${sans}', system-ui, sans-serif" font-size="92" font-weight="800" letter-spacing="-3">Make it <tspan fill="${d.captions.active}" font-family="'${serif}', serif" font-style="italic" font-weight="400">move.</tspan></text>
  <text x="${x0}" y="262" fill="${t.muted}" font-family="'${sans}', system-ui, sans-serif" font-size="30">${esc(sans)} · ${esc(serif)} italic · ${esc(mono)}</text>
  <rect x="${x0}" y="310" width="560" height="84" rx="20" fill="${t.surface}" stroke="${t.line}"/>
  <text x="${x0 + 30}" y="365" font-family="'${sans}', system-ui, sans-serif" font-size="38" font-weight="800" fill="${t.text}">the <tspan fill="${d.captions.active}">spoken</tspan> word <tspan fill="${d.captions.accent}">lights</tspan> up</text>
  ${chips.map(([name, hex], i) => {
    const x = x0 + i * (cw + gap);
    return `<rect x="${x}" y="450" width="${cw}" height="${cw}" rx="18" fill="${hex}" stroke="${t.line}"/>
  <text x="${x}" y="606" fill="${t.text}" font-family="'${mono}', monospace" font-size="18">${name}</text>
  <text x="${x}" y="632" fill="${t.muted}" font-family="'${mono}', monospace" font-size="18">${hex}</text>`;
  }).join('\n  ')}
</svg>
`;
};

const themeDir = (name) => path.join(THEMES_DIR, name);
const readSpec = (name) => {
  const f = path.join(themeDir(name), 'theme.json');
  if (!fs.existsSync(f)) fail(`no theme "${name}" (looked for ${rel(f)})`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
};
export const themeNames = () => (fs.existsSync(THEMES_DIR) ? fs.readdirSync(THEMES_DIR).filter((n) => fs.existsSync(path.join(THEMES_DIR, n, 'theme.json'))).sort() : []);

const writeFiles = (spec) => {
  const dir = themeDir(spec.name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'theme.json'), JSON.stringify({ name: spec.name, preset: spec.preset ?? null, colors: spec.colors, fonts: spec.fonts }, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'theme.ts'), themeSource(spec));
  fs.writeFileSync(path.join(dir, 'preview.svg'), previewSvg(spec));
  return dir;
};

export const activateTheme = (name) => {
  readSpec(name);
  fs.mkdirSync(KIT_DIR, { recursive: true });
  fs.writeFileSync(path.join(KIT_DIR, 'theme.ts'), `// The active cuekitvoltz theme (\`npx cuekitvoltz theme use <name>\` switches it).\nexport { theme, default } from './themes/${name}/theme';\n`);
  writeConfig({ theme: name });
};

export const saveTheme = (spec, { activate = true } = {}) => {
  const dir = writeFiles(spec);
  if (activate) activateTheme(spec.name);
  console.log(`  theme "${spec.name}" -> ${rel(dir)}/ (theme.json, theme.ts, preview.svg)${activate ? ', now active' : ''}`);
  return dir;
};

const slug = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const freeName = (base) => {
  let n = slug(base) || 'theme';
  for (let i = 2; fs.existsSync(themeDir(n)); i++) n = `${slug(base)}-${i}`;
  return n;
};

const paletteLine = (c) => [c.bg, c.surface, c.text, c.accent, c.accent2].filter(Boolean).map((h) => swatch(h, 3)).join('');

// ------------------------------------------------------------------ interactive
const askHex = async (label, fallback, optional = false) => {
  for (;;) {
    const a = await ask(`  ${label}${optional ? ' (Enter to skip)' : ''}`, fallback ?? '');
    if (optional && !a) return null;
    const hex = parseHex(a);
    if (hex) return hex;
    console.log('  Please enter a hex colour like #1A2B3C.');
  }
};

const askFonts = async (fallback) => {
  const ids = Object.keys(FONTS);
  const i = await choose('Which font pairing? (structure / the emotional word / labels)', ids.map((id) => ({ label: `${FONTS[id].label}: ${FONTS[id].hint}` })), Math.max(0, ids.indexOf(fallback)));
  return ids[i];
};

/** Suggested palette or the user's own; returns a spec, or null to skip. */
export const pickTheme = async ({ allowSkip = true } = {}) => {
  const mode = await choose('Would you like to set up a colour theme for your videos?', [
    { label: 'Pick a suggested palette' },
    { label: 'Create my own palette', hint: 'background, text and accent colours (hex), plus an optional second accent' },
    ...(allowSkip ? [{ label: 'Skip for now', hint: 'videos use the default dark theme; add one later with npx cuekitvoltz theme add' }] : []),
  ]);
  if (mode === 2) return null;
  if (mode === 0) {
    const ids = Object.keys(PRESETS);
    const i = await choose('Suggested palettes:', ids.map((id) => ({ label: `${paletteLine(PRESETS[id].colors)}  ${PRESETS[id].label}: ${PRESETS[id].hint}`, hint: `fonts: ${FONTS[PRESETS[id].fonts].hint}` })));
    const p = PRESETS[ids[i]];
    const fonts = (await confirm(`Use the ${FONTS[p.fonts].label} fonts (${FONTS[p.fonts].hint})?`, true)) ? p.fonts : await askFonts(p.fonts);
    const name = slug(await ask('Name this theme', freeName(ids[i])));
    return { name, preset: ids[i], colors: { ...p.colors }, fonts };
  }
  console.log('\nYour palette (hex colours):');
  const colors = { bg: await askHex('Background'), text: await askHex('Text'), accent: await askHex('Accent') };
  const accent2 = await askHex('Second accent', null, true);
  if (accent2) colors.accent2 = accent2;
  const { notes, fixes } = checkPalette(colors);
  for (const n of notes) console.log(`  ! ${n}`);
  if (fixes.text && (await confirm(`  Use ${fixes.text} for text instead?`, true))) colors.text = fixes.text;
  console.log(`  ${paletteLine(colors)}`);
  const fonts = await askFonts('editorial');
  const name = slug(await ask('Name this theme', freeName('my-theme')));
  return { name, preset: null, colors, fonts };
};

// ------------------------------------------------------------------ commands
const presetsCmd = () => {
  for (const [id, p] of Object.entries(PRESETS)) console.log(`${paletteLine(p.colors)}  ${id.padEnd(9)} ${p.hint}  ·  fonts: ${p.fonts}`);
  console.log(`\nfont pairings: ${Object.entries(FONTS).map(([id, f]) => `${id} (${f.hint})`).join(', ')}`);
};

const addCmd = async (take, args) => {
  const preset = take('--preset');
  const colorsFlag = take('--colors');
  const fontsFlag = take('--fonts');
  const surface = take('--surface');
  const fix = Boolean(take('--fix'));
  const force = Boolean(take('--force'));
  const noUse = Boolean(take('--no-use'));
  let spec;
  if (typeof preset === 'string') {
    const p = PRESETS[preset] ?? fail(`unknown preset "${preset}"; presets: ${Object.keys(PRESETS).join(', ')}`);
    spec = { name: slug(args[0] ?? preset), preset, colors: { ...p.colors }, fonts: p.fonts };
  } else if (typeof colorsFlag === 'string') {
    const hex = colorsFlag.split(',').map(parseHex);
    if (hex.length < 3 || hex.some((h) => !h)) fail('--colors takes background,text,accent[,accent2] as hex, e.g. --colors "#101418,#F2EEE8,#E8590C"');
    const colors = { bg: hex[0], text: hex[1], accent: hex[2], ...(hex[3] ? { accent2: hex[3] } : {}) };
    spec = { name: slug(args[0] ?? 'my-theme'), preset: null, colors, fonts: 'editorial' };
  } else if (interactive()) {
    spec = await pickTheme({ allowSkip: false });
  } else {
    fail('pass --preset <name> or --colors "#bg,#text,#accent[,#accent2]" (see: npx cuekitvoltz theme presets)');
  }
  if (typeof surface === 'string') spec.colors.surface = parseHex(surface) ?? fail('--surface takes a hex colour');
  if (typeof fontsFlag === 'string') spec.fonts = FONTS[fontsFlag] ? fontsFlag : fail(`unknown font pairing "${fontsFlag}"; pairings: ${Object.keys(FONTS).join(', ')}`);
  if (!spec.name) fail('theme names use letters, numbers and dashes');
  if (fs.existsSync(themeDir(spec.name)) && !force) fail(`theme "${spec.name}" already exists (--force replaces it, or pick another name)`);
  const { notes, fixes } = checkPalette(spec.colors);
  for (const n of notes) console.log(`  ! ${n}`);
  if (fixes.text && fix) {
    spec.colors.text = fixes.text;
    console.log(`  text colour set to ${fixes.text} (--fix)`);
  } else if (fixes.text) console.log('  (pass --fix to use the suggested text colour)');
  saveTheme(spec, { activate: !noUse });
};

const listCmd = () => {
  const active = readConfig()?.theme;
  const names = themeNames();
  if (!names.length) return console.log('No themes yet. Add one: npx cuekitvoltz theme add');
  for (const n of names) {
    const s = readSpec(n);
    console.log(`${n === active ? '*' : ' '} ${paletteLine(s.colors)}  ${n.padEnd(16)} ${s.preset ? `preset ${s.preset}` : 'custom'} · fonts ${s.fonts}`);
  }
  if (active) console.log('\n* active (cuekitvoltz/theme.ts)');
};

const buildCmd = (args) => {
  const names = args.length ? args : themeNames();
  for (const n of names) {
    const spec = readSpec(n);
    writeFiles({ ...spec, name: n });
    console.log(`  rebuilt ${rel(themeDir(n))}/theme.ts and preview.svg`);
  }
};

export const themeCommand = async (args) => {
  const [sub, ...rest] = args;
  const take = takeFrom(rest);
  if (sub === 'presets') return presetsCmd();
  if (sub === 'add') return addCmd(take, rest);
  if (sub === 'list' || !sub) return listCmd();
  if (sub === 'use') {
    if (!rest[0]) fail('usage: npx cuekitvoltz theme use <name>');
    activateTheme(rest[0]);
    return console.log(`  "${rest[0]}" is now the active theme (cuekitvoltz/theme.ts)`);
  }
  if (sub === 'build') return buildCmd(rest);
  fail(`unknown theme command "${sub}" (presets, add, list, use, build)`);
};
