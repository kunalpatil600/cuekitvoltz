// Paths and config of the project the CLI runs in.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CWD = process.cwd();
export const CONFIG = path.join(CWD, 'cuekitvoltz.config.json');
export const KIT_DIR = path.join(CWD, 'cuekitvoltz');
export const THEMES_DIR = path.join(KIT_DIR, 'themes');

export const rel = (p) => path.relative(CWD, p) || '.';
export const fail = (msg) => {
  console.error(`cuekitvoltz: ${msg}`);
  process.exit(1);
};

/** Takes `--name [value]` off an argument list; a flag without a value returns true. */
export const takeFrom = (args) => (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const hasValue = args[i + 1] !== undefined && !args[i + 1].startsWith('--');
  const v = hasValue ? args[i + 1] : true;
  args.splice(i, hasValue ? 2 : 1);
  return v;
};

export const readConfig = () => {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  } catch {
    return null;
  }
};

/** Merges `patch` into cuekitvoltz.config.json (creating it). */
export const writeConfig = (patch) => {
  const cur = readConfig() ?? { version: 1 };
  const next = { ...cur, ...patch, voice: { ...cur.voice, ...patch.voice } };
  if (!next.voice || !Object.keys(next.voice).length) delete next.voice;
  fs.writeFileSync(CONFIG, JSON.stringify(next, null, 2) + '\n');
  return next;
};

/** A package from the project (so @remotion/* match its Remotion version), else from here. */
export const fromProject = async (name) => {
  const { createRequire } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  try {
    return await import(pathToFileURL(createRequire(path.join(CWD, 'package.json')).resolve(name)).href);
  } catch {
    try {
      return await import(name);
    } catch {
      fail(`${name} not found. Install it in your project: npm i -D ${name}`);
    }
  }
};

/** The file that calls registerRoot: --entry, else Config.setEntryPoint in remotion.config, else src/index.*; null if none. */
export const findEntry = (flag) => {
  if (typeof flag === 'string') return path.resolve(CWD, flag);
  for (const f of ['remotion.config.ts', 'remotion.config.js', 'remotion.config.mjs']) {
    const file = path.join(CWD, f);
    const m = fs.existsSync(file) && fs.readFileSync(file, 'utf8').match(/setEntryPoint\(\s*['"`]([^'"`]+)['"`]/);
    if (m) return path.resolve(CWD, m[1]);
  }
  const found = ['src/index.ts', 'src/index.tsx', 'src/index.js', 'src/index.jsx', 'remotion/index.ts', 'remotion/index.tsx'].map((f) => path.join(CWD, f)).find((f) => fs.existsSync(f));
  return found ?? null;
};

export const entryPoint = (flag) => findEntry(flag) ?? fail('no entry point found; pass --entry <file> (the file that calls registerRoot)');

/** Whether the project lists remotion in its package.json. */
export const isRemotionProject = () => {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(CWD, 'package.json'), 'utf8'));
    return Boolean(p.dependencies?.remotion ?? p.devDependencies?.remotion);
  } catch {
    return false;
  }
};

/** Adds lines to the project's .gitignore (created only in a git repo), skipping ones already there. */
export const ignore = (lines) => {
  const file = path.join(CWD, '.gitignore');
  if (!fs.existsSync(file) && !fs.existsSync(path.join(CWD, '.git'))) return;
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const have = new Set(cur.split(/\r?\n/).map((l) => l.trim()));
  const add = lines.filter((l) => !have.has(l));
  if (add.length) fs.writeFileSync(file, `${cur}${cur && !cur.endsWith('\n') ? '\n' : ''}# cuekitvoltz\n${add.join('\n')}\n`);
};
