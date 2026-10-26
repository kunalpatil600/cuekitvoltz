// First-run setup: what's on this machine (doctor), the big downloads (with consent), the default
// voice, and the init wizard that walks through theme -> downloads -> voice -> starter.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { choose, closePrompts, confirm, interactive } from './prompt.mjs';
import { CWD, PKG, fail, findEntry, fromProject, ignore, isRemotionProject, readConfig, rel, takeFrom, writeConfig } from './project.mjs';
import { FONTS, PRESETS, checkPalette, pickTheme, saveTheme } from './themes.mjs';
import { writeStarter } from './starter.mjs';
import { parseHex } from './color.mjs';

const VENV = path.join(CWD, '.venv-voice');
const venvPython = (dir = VENV) => path.join(dir, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
export const pythonPath = () => process.env.CUEKITVOLTZ_PYTHON ?? venvPython();

const ok = (cmd, args = ['--version']) => spawnSync(cmd, args, { stdio: 'ignore' }).status === 0;
const output = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};

const gpu = () => {
  const n = output('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader']);
  if (n) return { kind: 'nvidia', name: n.split('\n')[0].replace(', ', ' · ') };
  if (process.platform === 'darwin' && process.arch === 'arm64') return { kind: 'apple', name: 'Apple Silicon' };
  return null;
};

/** How to make a Python 3.11 venv here: uv (which fetches 3.11 itself), or a python3.11 on the PATH. */
const python311 = () => {
  if (ok('uv')) return { tool: 'uv' };
  for (const [cmd, args] of [['python3.11', []], ['py', ['-3.11']]]) if (ok(cmd, [...args, '--version'])) return { tool: 'python', cmd, args };
  if (/^Python 3\.11\./.test(output('python3', ['--version']) ?? '')) return { tool: 'python', cmd: 'python3', args: [] };
  return null;
};

const hfHub = () => path.join(process.env.HF_HOME ?? path.join(os.homedir(), '.cache', 'huggingface'), 'hub');
const torchHome = () => process.env.TORCH_HOME ?? path.join(os.homedir(), '.cache', 'torch');
const filled = (dir) => fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
const freeGB = (dir) => {
  try {
    const s = fs.statfsSync(dir);
    return (s.bavail * s.bsize) / 1e9;
  } catch {
    return null;
  }
};

export const machine = () => {
  const py = pythonPath();
  const env = fs.existsSync(py);
  let engines = { kokoro: false, chatterbox: false };
  if (env) {
    const r = output(py, ['-c', "import importlib.util as u; print(int(bool(u.find_spec('kokoro'))), int(bool(u.find_spec('chatterbox'))))"]);
    if (r) engines = { kokoro: r.startsWith('1'), chatterbox: r.endsWith('1') };
  }
  let remotion = null;
  try { remotion = JSON.parse(fs.readFileSync(path.join(CWD, 'node_modules/remotion/package.json'), 'utf8')).version; } catch { /* not installed */ }
  const browsers = path.join(CWD, 'node_modules', '.remotion');
  return {
    node: process.version,
    remotion,
    ffmpeg: ok('ffmpeg', ['-version']),
    gpu: gpu(),
    python311: python311(),
    diskFreeGB: freeGB(CWD),
    browsers: { render: filled(path.join(browsers, 'chrome-headless-shell')), gpu: filled(path.join(browsers, 'chrome-for-testing')) },
    voice: {
      env, ...engines,
      models: {
        kokoro: filled(path.join(hfHub(), 'models--hexgrad--Kokoro-82M', 'snapshots')),
        aligner: fs.existsSync(path.join(torchHome(), 'hub', 'checkpoints', 'wav2vec2_fairseq_base_ls960_asr_ls960.pth')),
        chatterbox: filled(path.join(hfHub(), 'models--ResembleAI--chatterbox-turbo', 'snapshots')),
      },
    },
    config: readConfig(),
  };
};

const yes = (b) => (b ? 'yes' : 'no');
export const doctor = (args) => {
  const m = machine();
  if (args.includes('--json')) return console.log(JSON.stringify(m, null, 2));
  const v = m.voice;
  const rows = [
    ['Node', m.node],
    ['Remotion', m.remotion ?? 'not installed in this folder'],
    ['ffmpeg', m.ffmpeg ? 'found' : 'missing (needed for loudness-normalised renders and contact sheets)'],
    ['GPU', m.gpu ? m.gpu.name : 'none found (software rendering works, 3D is slower)'],
    ['Python 3.11', m.python311 ? (m.python311.tool === 'uv' ? 'via uv' : m.python311.cmd) : 'missing (needed for the voice director: install uv or Python 3.11)'],
    ['Disk free', m.diskFreeGB === null ? '?' : `${m.diskFreeGB.toFixed(1)} GB`],
    ['Render browser', m.browsers.render ? 'installed' : 'not yet'],
    ['GPU browser', m.browsers.gpu ? 'installed' : 'not yet'],
    ['Voice env', v.env ? `${rel(pythonPath())}: Kokoro ${yes(v.kokoro)}, Chatterbox ${yes(v.chatterbox)}` : 'not set up'],
    ['Voice models', `Kokoro ${yes(v.models.kokoro)}, aligner ${yes(v.models.aligner)}, Chatterbox ${yes(v.models.chatterbox)}`],
    ['Theme', m.config?.theme ?? 'none (default dark theme)'],
    ['Default voice', m.config?.voice?.preset ?? 'not set'],
  ];
  for (const [k, val] of rows) console.log(`  ${k.padEnd(15)} ${val}`);
  if (!m.config) console.log('\nNot set up yet: npx cuekitvoltz init');
};

// ------------------------------------------------------------------ downloads
// Sizes measured on Linux; the voice library sizes depend on the PyTorch build (CUDA or CPU).
const ITEMS = {
  browser: { label: 'Render browser (Chrome Headless Shell)', gb: () => 0.24, why: 'needed for every render' },
  'gpu-browser': { label: 'GPU browser (Chrome for Testing)', gb: () => 0.4, why: 'fast 3D renders on your GPU' },
  voice: { label: 'Voice: Python libraries, Kokoro and the word aligner', gb: (g) => (g?.kind === 'nvidia' ? 5.7 : 2.2), why: 'clean, calm voices; word timings and lip-sync' },
  chatterbox: { label: 'Voice: Chatterbox-Turbo', gb: () => 5.6, why: 'voices that act out [emotion] tags' },
};
const ORDER = ['browser', 'gpu-browser', 'voice', 'chatterbox'];

const run = (cmd, args) => {
  console.log(`$ ${[cmd, ...args].join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} exited with ${r.status}`);
};

const installVoice = (withChatterbox) => {
  const py = python311();
  if (!py) throw new Error('the voice director needs Python 3.11: install uv (https://docs.astral.sh/uv/) or Python 3.11, then run npx cuekitvoltz download voice');
  const target = pythonPath();
  ignore(['.venv-voice/', 'cuekitvoltz/voice-samples/']);
  if (!fs.existsSync(target)) {
    if (py.tool === 'uv') run('uv', ['venv', VENV, '--python', '3.11']);
    else run(py.cmd, [...py.args, '-m', 'venv', VENV]);
  }
  const pip = (a) => (py.tool === 'uv' ? run('uv', ['pip', 'install', '--python', target, ...a]) : run(target, ['-m', 'pip', 'install', ...a]));
  const g = gpu();
  // PyPI's Linux PyTorch carries CUDA (~4 GB); without an NVIDIA GPU take the CPU build. Windows' PyPI
  // build is CPU-only, so an NVIDIA GPU there needs the CUDA index. macOS's PyPI build uses Metal.
  if (process.platform !== 'darwin' && g?.kind !== 'nvidia') pip(['torch==2.6.0', 'torchaudio==2.6.0', '--index-url', 'https://download.pytorch.org/whl/cpu']);
  else if (process.platform === 'win32') pip(['torch==2.6.0', 'torchaudio==2.6.0', '--index-url', 'https://download.pytorch.org/whl/cu124']);
  pip(['-r', path.join(PKG, 'voice', 'requirements.txt')]);
  if (withChatterbox) pip(['-r', path.join(PKG, 'voice', 'requirements-chatterbox.txt')]);
  run(target, [path.join(PKG, 'voice', 'fetch.py'), '--kokoro', '--aligner', ...(withChatterbox ? ['--chatterbox'] : [])]);
};

/** Downloads the named items; returns the ones that failed. */
export const fetchItems = async (items) => {
  const failed = [];
  for (const it of ORDER.filter((i) => items.includes(i))) {
    if (it === 'chatterbox' && items.includes('voice')) continue; // installed together below
    console.log(`\n-- ${ITEMS[it].label}`);
    try {
      if (it === 'browser' || it === 'gpu-browser') {
        const { ensureBrowser } = await fromProject('@remotion/renderer');
        await ensureBrowser({ chromeMode: it === 'browser' ? 'headless-shell' : 'chrome-for-testing' });
      } else installVoice(it === 'chatterbox' || items.includes('chatterbox'));
    } catch (e) {
      console.error(`  ${ITEMS[it].label} failed: ${e.message}`);
      failed.push(it);
    }
  }
  return failed;
};

const sizeTable = (items, g) => {
  let total = 0;
  for (const it of ORDER.filter((i) => items.includes(i))) {
    const gb = ITEMS[it].gb(g);
    total += gb;
    console.log(`  ${ITEMS[it].label.padEnd(54)} ~${gb < 1 ? `${Math.round(gb * 1000)} MB` : `${gb.toFixed(1)} GB`}  ${ITEMS[it].why}`);
  }
  return total;
};

export const download = async (args) => {
  const take = takeFrom(args);
  const auto = Boolean(take('--yes'));
  let items = args.includes('all') ? [...ORDER] : args.filter((a) => ITEMS[a]);
  if (!items.length) fail(`usage: npx cuekitvoltz download <${ORDER.join('|')}|all> [--yes]`);
  if (items.includes('chatterbox') && !fs.existsSync(pythonPath())) items = [...new Set([...items, 'voice'])];
  const g = gpu();
  console.log('This downloads:');
  const total = sizeTable(items, g);
  const free = freeGB(CWD);
  console.log(`  total about ${total.toFixed(1)} GB${free === null ? '' : `, ${free.toFixed(1)} GB free`}`);
  if (!auto) {
    if (!interactive()) fail('add --yes to confirm the download');
    const go = await confirm('Continue?', true);
    closePrompts();
    if (!go) return;
  }
  const failed = await fetchItems(items);
  if (failed.length) process.exitCode = 1;
  else console.log('\nAll downloaded.');
};

// ------------------------------------------------------------------ voices
const voicePresets = (m) => {
  const kokoro = ['heart', 'bella', 'emma', 'michael', 'fenrir', 'puck'];
  const turbo = ['cb-heart', 'cb-michael', 'cb-fenrir', 'cb-builtin'];
  return [...(m.voice.chatterbox ? turbo : []), ...(m.voice.kokoro ? kokoro : [])];
};
const DESC = {
  'cb-heart': 'expressive female, acts out emotion tags (recommended)', 'cb-michael': 'expressive male', 'cb-fenrir': 'expressive male, deeper', 'cb-builtin': "Chatterbox's own voice",
  heart: 'calm American female, fast and deterministic', bella: 'American female', emma: 'British female', michael: 'American male', fenrir: 'American male', puck: 'American male',
};

export const voiceSamples = (args) => {
  const r = spawnSync(pythonPath(), [path.join(PKG, 'voice', 'samples.py'), ...args], { stdio: 'inherit' });
  return r.status === 0;
};

const play = (file) => {
  for (const [cmd, a] of [['ffplay', ['-nodisp', '-autoexit', '-loglevel', 'error']], ['afplay', []], ['aplay', ['-q']]]) {
    if (spawnSync(cmd, [...a, file], { stdio: 'ignore' }).status === 0) return true;
  }
  return false;
};

// ------------------------------------------------------------------ init
const step = (n, title) => console.log(`\n${'─'.repeat(64)}\n${n}/4  ${title}`);

export const init = async (args) => {
  const take = takeFrom(args);
  const flags = {
    preset: take('--theme'), colors: take('--colors'), fonts: take('--fonts'), downloads: take('--downloads'),
    voice: take('--voice'), starter: take('--starter'), noStarter: take('--no-starter'), yes: take('--yes'),
  };
  const ui = interactive() && !flags.yes;
  console.log('cuekitvoltz setup: a colour theme, the downloads you want, a default voice and a starter video.');
  if (!isRemotionProject()) console.log("! This folder doesn't look like a Remotion project (no remotion in package.json). Start one with\n  npx create-video@latest, install cuekitvoltz there, and run init from its root.");
  if (!ui) console.log('(non-interactive: only the steps given as flags run)');
  else console.log('Press Enter to take the suggestion in [brackets]. Run npx cuekitvoltz init again any time.');

  // 1. theme
  step(1, 'Colour theme');
  let spec = null;
  if (typeof flags.preset === 'string') {
    const p = PRESETS[flags.preset] ?? fail(`unknown preset "${flags.preset}"; presets: ${Object.keys(PRESETS).join(', ')}`);
    spec = { name: flags.preset, preset: flags.preset, colors: { ...p.colors }, fonts: p.fonts };
  } else if (typeof flags.colors === 'string') {
    const hex = flags.colors.split(',').map(parseHex);
    if (hex.length < 3 || hex.some((h) => !h)) fail('--colors takes background,text,accent[,accent2] as hex');
    spec = { name: 'my-theme', preset: null, colors: { bg: hex[0], text: hex[1], accent: hex[2], ...(hex[3] ? { accent2: hex[3] } : {}) }, fonts: 'editorial' };
    for (const n of checkPalette(spec.colors).notes) console.log(`  ! ${n}`);
  } else if (ui) spec = await pickTheme();
  if (spec && typeof flags.fonts === 'string') spec.fonts = FONTS[flags.fonts] ? flags.fonts : fail(`unknown font pairing "${flags.fonts}"`);
  if (spec) saveTheme(spec);
  else console.log('  skipped: videos use the default dark theme');

  // 2. downloads
  step(2, 'Downloads');
  let m = machine();
  console.log(`  GPU: ${m.gpu?.name ?? 'none found'} · Python 3.11: ${m.python311 ? 'available' : 'missing'} · free disk: ${m.diskFreeGB?.toFixed(1) ?? '?'} GB`);
  const want = { all: ORDER.filter((i) => i !== 'gpu-browser' || m.gpu), light: ['browser', 'voice', ...(m.gpu ? ['gpu-browser'] : [])], render: ['browser', ...(m.gpu ? ['gpu-browser'] : [])], none: [] };
  let items = [];
  if (typeof flags.downloads === 'string') items = want[flags.downloads] ?? flags.downloads.split(',').filter((i) => ITEMS[i]);
  else if (ui) {
    console.log('\nWe use these, and they need downloading:');
    sizeTable(ORDER.filter((i) => i !== 'gpu-browser' || m.gpu), m.gpu);
    const total = (list) => list.reduce((s, i) => s + ITEMS[i].gb(m.gpu), 0).toFixed(1);
    const options = [
      { label: `Everything: voices that act out emotion (~${total(want.all)} GB)`, key: 'all' },
      { label: `Light voice: Kokoro only (~${total(want.light)} GB)`, key: 'light' },
      { label: `Rendering only, no voice (~${total(want.render)} GB)`, key: 'render' },
      { label: 'Nothing now (npx cuekitvoltz download … later)', key: 'none' },
    ];
    if (!m.python311) console.log('\n  ! Voice needs Python 3.11 (or uv), which isn\'t installed, so the voice options will fail until it is.');
    items = want[options[await choose('What should we download?', options, m.python311 ? 0 : 2)].key];
    if (items.length) {
      const need = Number(total(items));
      if (m.diskFreeGB !== null && m.diskFreeGB < need + 1) console.log(`  ! Only ${m.diskFreeGB.toFixed(1)} GB free for ~${need} GB.`);
      if (!(await confirm(`Download about ${need} GB now?`, true))) items = [];
    }
  }
  if (items.length) {
    const failed = await fetchItems(items);
    if (failed.length) console.log(`  ! not installed: ${failed.join(', ')} (retry: npx cuekitvoltz download ${failed.join(' ')})`);
  } else console.log('  nothing downloaded');

  // 3. default voice
  step(3, 'Default voice');
  m = machine();
  const presets = voicePresets(m);
  let voice = typeof flags.voice === 'string' ? flags.voice : null;
  if (!presets.length) console.log('  skipped: no voice engine installed yet');
  else if (!voice && ui) {
    if (await confirm('Make a 5-second sample of each voice so you can listen first?', true)) {
      const out = path.join('cuekitvoltz', 'voice-samples');
      if (voiceSamples(['--out', out, ...presets])) {
        console.log(`  samples in ${out}/`);
        if (ok('ffplay', ['-version']) && (await confirm('Play them now?', true))) {
          for (const p of presets) {
            const f = path.join(out, `${p}.wav`);
            if (fs.existsSync(f)) {
              console.log(`  ▶ ${p}: ${DESC[p]}`);
              play(f);
            }
          }
        }
      }
    }
    voice = presets[await choose('Which voice should videos use by default?', presets.map((p) => ({ label: `${p.padEnd(11)} ${DESC[p]}` })), 0)];
  }
  if (voice) {
    writeConfig({ voice: { preset: voice } });
    console.log(`  default voice: ${voice}`);
  }

  // 4. starter
  step(4, 'Starter video');
  const entry = findEntry();
  const makeStarter = !entry ? false : flags.starter ? true : flags.noStarter ? false : ui ? await confirm('Create a starter video with your theme and voice?', true) : false;
  closePrompts();
  let starter = null;
  if (!entry) console.log('  skipped: no Remotion entry point here (src/index.ts); run npx cuekitvoltz starter --entry <file> later');
  else if (makeStarter) starter = writeStarter({ python: presets.length && m.voice.models.aligner ? pythonPath() : null });
  else console.log('  skipped (npx cuekitvoltz starter makes one later)');

  if (!readConfig()) writeConfig({});
  console.log(`\nDone. Settings are in ${rel(path.join(CWD, 'cuekitvoltz.config.json'))}.`);
  console.log(`Next: npx remotion studio${starter?.root ? ' and open "starter"' : ''}, or ask Claude Code for a video.`);
};
