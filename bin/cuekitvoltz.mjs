#!/usr/bin/env node
// cuekitvoltz command line. Run it from the root of a Remotion project (or of this repo).
//
//   npx cuekitvoltz init                      first-run setup: theme, downloads, default voice, starter video
//   npx cuekitvoltz doctor [--json]           what's installed and what's missing
//   npx cuekitvoltz theme presets|add|list|use|build
//   npx cuekitvoltz download <browser|gpu-browser|voice|chatterbox|all> [--yes]
//   npx cuekitvoltz voice-samples [presets...] [--out dir]
//   npx cuekitvoltz config [voice <preset>]
//   npx cuekitvoltz starter
//   npx cuekitvoltz stills <id> <frame...> [--qa] [--sheet] [--gpu] [--out dir] [--props json]
//   npx cuekitvoltz render <id...> [--gpu] [--scale n] [--concurrency n] [--out dir] [--props json] [--cover frame] [--no-loudnorm] [--video-cache MB]
//   npx cuekitvoltz direct <script.vo.md> [--voice name] [--fps n] [--fresh] [--public dir]
//   npx cuekitvoltz hear <vo.json> [--public dir]
//   npx cuekitvoltz skills [--dir .claude/skills] [--force]
//
// Every command that bundles takes --entry <file> (default: Config.setEntryPoint in remotion.config,
// else src/index.ts) and --public <dir> (default: public).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CWD, PKG, entryPoint, fail, fromProject, readConfig, rel, takeFrom, writeConfig } from './lib/project.mjs';
import { themeCommand } from './lib/themes.mjs';
import { doctor, download, init, machine, pythonPath, voiceSamples } from './lib/setup.mjs';
import { writeStarter } from './lib/starter.mjs';

const [command, ...args] = process.argv.slice(2);
const take = takeFrom(args);

/** Inside the cuekitvoltz repo, the examples import the kit by name: point that name at the source. */
const webpackOverride = (config) => {
  let name;
  try { name = JSON.parse(fs.readFileSync(path.join(CWD, 'package.json'), 'utf8')).name; } catch { /* no package.json */ }
  if (name !== 'cuekitvoltz') return config;
  return { ...config, resolve: { ...config.resolve, alias: { ...config.resolve?.alias, cuekitvoltz$: path.join(CWD, 'src/index.ts') } } };
};

/** Takes --entry and --public off the arguments; call it before reading positional arguments. */
const projectFlags = () => {
  const entry = entryPoint(take('--entry'));
  const pub = take('--public');
  return { entry, publicDir: path.resolve(CWD, typeof pub === 'string' ? pub : 'public') };
};

const bundleProject = async ({ entry, publicDir }) => {
  const { bundle } = await fromProject('@remotion/bundler');
  console.log(`bundling ${rel(entry)}…`);
  return bundle({ entryPoint: entry, publicDir: fs.existsSync(publicDir) ? publicDir : undefined, webpackOverride });
};

/** Software WebGL (swangle) in the headless shell by default; --gpu: Chrome for Testing on the GPU (Vulkan on Linux, ANGLE elsewhere). */
const browserMode = (gpu) => ({ chromiumOptions: { gl: gpu ? (process.platform === 'linux' ? 'vulkan' : 'angle') : 'swangle' }, chromeMode: gpu ? 'chrome-for-testing' : 'headless-shell' });

const hasFfmpeg = () => spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const ffmpeg = (a) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-y', ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr.slice(-2000));
  return r.stderr;
};

// ------------------------------------------------------------------ stills
// Renders a few frames from one bundle and one browser, for checking layout before a full render.
// --qa renders with { qa: true }: compositions wrapped in the kit's <Stage> draw the safe area and
// numbered boxes over layout problems; the issues are printed and saved to <out>/qa.json, and the exit
// code is 1 if any were found. --sheet adds a contact sheet (needs ffmpeg).
const stills = async () => {
  const out = take('--out');
  const sheet = Boolean(take('--sheet'));
  const qa = Boolean(take('--qa'));
  const gpu = Boolean(take('--gpu'));
  const extraProps = take('--props');
  const project = projectFlags();
  const [id, ...frames] = args;
  if (!id || !frames.length) fail('usage: cuekitvoltz stills <id> <frame> [frames...] [--qa] [--sheet] [--gpu] [--out dir]');
  const serveUrl = await bundleProject(project);
  const outDir = path.resolve(CWD, typeof out === 'string' ? out : `renders/_stills/${id}`);
  fs.mkdirSync(outDir, { recursive: true });

  const { renderStill, selectComposition, openBrowser } = await fromProject('@remotion/renderer');
  const { chromiumOptions, chromeMode } = browserMode(gpu);
  const browser = await openBrowser('chrome', { chromiumOptions, chromeMode });
  const inputProps = { ...(typeof extraProps === 'string' ? JSON.parse(extraProps) : {}), ...(qa ? { qa: true } : {}) };
  const composition = await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: browser, chromiumOptions, chromeMode });
  const files = [];
  const report = {};
  for (const f of frames) {
    const file = path.join(outDir, `${f}.jpg`);
    const onBrowserLog = (l) => {
      if (l.type === 'error') console.log(`  browser error: ${l.text.slice(0, 300)}`);
      if (!l.text.startsWith('QA:')) return;
      (report[f] ??= []).push(...JSON.parse(l.text.slice(3)).issues);
    };
    const t0 = performance.now();
    await renderStill({ serveUrl, composition, frame: Number(f), output: file, imageFormat: 'jpeg', jpegQuality: 90, inputProps, puppeteerInstance: browser, chromiumOptions, chromeMode, timeoutInMilliseconds: 120000, onBrowserLog });
    files.push(file);
    console.log(`${rel(file)}  ${((performance.now() - t0) / 1000).toFixed(2)} s`);
    if (qa) for (const [n, it] of (report[f] ?? []).entries()) console.log(`  ${n + 1} ${it.kind.padEnd(8)} ${it.detail.padEnd(36)} "${it.text}"`);
  }
  await browser.close({ silent: true });
  fs.rmSync(serveUrl, { recursive: true, force: true });

  if (sheet && !hasFfmpeg()) console.log('--sheet needs ffmpeg on the PATH; skipped');
  else if (sheet) {
    // cells keep the composition's aspect: 432×768 for shorts, 768×432 for 16:9
    const k = 768 / Math.max(composition.width, composition.height);
    const even = (v) => Math.round(v / 2) * 2;
    const cw = even(composition.width * k), ch = even(composition.height * k);
    const cols = Math.min(5, files.length), rows = Math.ceil(files.length / cols);
    const blanks = rows * cols - files.length;
    const scaled = files.map((_, i) => `[${i}:v]scale=${cw}:${ch}[s${i}]`).join(';');
    const pads = Array.from({ length: blanks }, (_, i) => `color=black:${cw}x${ch}:d=1[b${i}]`).join(';');
    const cells = [...files.map((_, i) => `[s${i}]`), ...Array.from({ length: blanks }, (_, i) => `[b${i}]`)];
    const layout = cells.map((_, i) => `${(i % cols) * cw}_${Math.floor(i / cols) * ch}`).join('|');
    const graph = [scaled, pads, `${cells.join('')}xstack=inputs=${cells.length}:layout=${layout}`].filter(Boolean).join(';');
    ffmpeg(['-loglevel', 'error', ...files.flatMap((f) => ['-i', f]), '-filter_complex', graph, '-frames:v', '1', path.join(outDir, 'sheet.jpg')]);
    console.log(rel(path.join(outDir, 'sheet.jpg')));
  }

  if (qa) {
    const total = Object.values(report).reduce((n, list) => n + list.length, 0);
    fs.writeFileSync(path.join(outDir, 'qa.json'), JSON.stringify(report, null, 1) + '\n');
    console.log(`qa: ${total} issue${total === 1 ? '' : 's'} in ${frames.length} frame${frames.length === 1 ? '' : 's'} -> ${rel(path.join(outDir, 'qa.json'))}`);
    if (total) process.exitCode = 1;
  }
};

// ------------------------------------------------------------------ render
// Renders H.264 MP4s, loudness-normalised to -14 LUFS / -1 dBTP with faststart (needs ffmpeg).
// --gpu forces concurrency 1: with two tabs sharing the GPU compositor, Chrome for Testing drops tiles
// of 3D-transformed DOM (ScreenOverlay) and can duplicate horizontal strips.
const render = async () => {
  const outFlag = take('--out');
  const coverFrame = take('--cover');
  const gpu = Boolean(take('--gpu'));
  const concurrency = gpu ? 1 : Number(take('--concurrency') ?? 2);
  const scale = Number(take('--scale') ?? 1);
  const noLoudnorm = Boolean(take('--no-loudnorm'));
  const extraProps = take('--props');
  const videoCacheMb = take('--video-cache');
  const offthreadVideoCacheSizeInBytes = videoCacheMb ? Number(videoCacheMb) * 1024 * 1024 : null;
  const loudnorm = !noLoudnorm && hasFfmpeg();
  if (!noLoudnorm && !loudnorm) console.log('ffmpeg not found: writing the render without loudness normalisation');
  const project = projectFlags();
  const ids = args;
  if (!ids.length) fail('usage: cuekitvoltz render <id> [more ids...] [--gpu] [--scale n] [--out dir]');
  const serveUrl = await bundleProject(project);

  const { renderMedia, renderStill, selectComposition, openBrowser } = await fromProject('@remotion/renderer');
  const { chromiumOptions, chromeMode } = browserMode(gpu);
  const browser = await openBrowser('chrome', { chromiumOptions, chromeMode });
  const inputProps = typeof extraProps === 'string' ? JSON.parse(extraProps) : {};
  for (const id of ids) {
    const outDir = path.resolve(CWD, typeof outFlag === 'string' ? outFlag : `renders/${id}`);
    fs.mkdirSync(outDir, { recursive: true });
    const composition = await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: browser, chromiumOptions, chromeMode });
    const final = path.join(outDir, `${id}${scale !== 1 ? `@${scale}x` : ''}.mp4`);
    const raw = loudnorm ? final.replace(/\.mp4$/, '.raw.mp4') : final;
    let last = -1;
    const t0 = performance.now();
    await renderMedia({
      serveUrl, composition, inputProps: { ...composition.defaultProps, ...inputProps }, codec: 'h264', crf: 17, pixelFormat: 'yuv420p',
      audioCodec: 'aac', audioBitrate: '192k', imageFormat: 'jpeg', jpegQuality: 95, concurrency, scale, offthreadVideoCacheSizeInBytes,
      outputLocation: raw, puppeteerInstance: browser, overwrite: true, chromiumOptions, chromeMode, timeoutInMilliseconds: 120000,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 10) * 10;
        if (pct !== last) { last = pct; process.stdout.write(`\r${id}: ${pct}%   `); }
      },
    });
    process.stdout.write('\n');
    if (loudnorm) {
      // two-pass EBU R128; the video stream is copied untouched
      const target = 'I=-14:TP=-1:LRA=11';
      const log = ffmpeg(['-i', raw, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-']);
      const m = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
      const second = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
      ffmpeg(['-i', raw, '-c:v', 'copy', '-af', `${second},alimiter=limit=0.85:level=false`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final]);
      fs.rmSync(raw);
    }
    console.log(`  -> ${rel(final)}  (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
    if (coverFrame !== undefined) {
      const cover = path.join(outDir, `${id}.cover.png`);
      await renderStill({ serveUrl, composition, frame: Number(coverFrame), output: cover, imageFormat: 'png', inputProps, puppeteerInstance: browser, chromiumOptions, chromeMode, offthreadVideoCacheSizeInBytes });
      console.log(`  -> ${rel(cover)}`);
    }
  }
  await browser.close({ silent: true });
  fs.rmSync(serveUrl, { recursive: true, force: true });
};

// ------------------------------------------------------------------ voice director (Python)
const python = () => {
  const py = pythonPath();
  if (!fs.existsSync(py)) fail(`no voice environment (${rel(py)}). Set it up: npx cuekitvoltz download voice`);
  return py;
};
const runPython = (script) => {
  const r = spawnSync(python(), [path.join(PKG, 'voice', script), ...args], { stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
};

const config = () => {
  const [key, value] = args;
  if (key === 'voice' && value) {
    writeConfig({ voice: { preset: value } });
    return console.log(`  default voice: ${value}`);
  }
  if (key) fail('usage: npx cuekitvoltz config [voice <preset>]');
  console.log(JSON.stringify(readConfig() ?? {}, null, 2));
};

const starter = () => {
  const m = machine();
  const voiced = !args.includes('--no-voice') && m.voice.env && (m.voice.kokoro || m.voice.chatterbox);
  writeStarter({ python: voiced ? pythonPath() : null, entry: take('--entry') });
};

// ------------------------------------------------------------------ Claude skills
const skills = () => {
  const dir = take('--dir');
  const force = Boolean(take('--force'));
  const src = path.join(PKG, 'skills');
  const dest = path.resolve(CWD, typeof dir === 'string' ? dir : '.claude/skills');
  for (const name of fs.readdirSync(src)) {
    const to = path.join(dest, name);
    if (fs.existsSync(to) && !force) {
      console.log(`  ${rel(to)} exists, kept (--force replaces it)`);
      continue;
    }
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(path.join(src, name), to, { recursive: true });
    console.log(`  ${rel(to)}`);
  }
  console.log('Claude Code loads them the next time it starts in this project.');
};

const HELP = `cuekitvoltz <command>

  Setup
  init                     first-run setup: theme, downloads (asks first), default voice, starter video
  doctor                   what's installed and what's missing  [--json]
  theme presets|add|list|use|build   colour themes in cuekitvoltz/themes/<name>/
  download <items...>      browser, gpu-browser, voice, chatterbox or all  [--yes]
  voice-samples            a short sample of each installed voice  [presets...] [--out dir]
  config [voice <preset>]  show the settings, or set the default voice
  starter                  write a starter video on your theme and register it  [--no-voice]
  skills                   copy the Claude Code skills into .claude/skills  [--dir path] [--force]

  Make
  stills <id> <frame...>   render frames for a layout check  [--qa] [--sheet] [--gpu] [--out dir] [--props json]
  render <id...>           render MP4s at -14 LUFS            [--gpu] [--scale n] [--concurrency n] [--out dir] [--cover frame]
  direct <script.vo.md>    perform a voice script -> public/voice/<id>.wav + vo.json  [--voice name] [--fps n] [--fresh]
  hear <vo.json>           transcribe the voice track back and flag garbled lines

  Bundling commands also take --entry <file> and --public <dir>.`;

const commands = {
  init: () => init(args), doctor: () => doctor(args), theme: () => themeCommand(args), download: () => download(args),
  'voice-setup': () => download(['voice', 'chatterbox', ...args]), // older name for the same thing
  'voice-samples': () => { process.exitCode = voiceSamples([...args]) ? 0 : 1; }, config, starter,
  stills, render, direct: () => runPython('direct.py'), hear: () => runPython('check.py'), skills,
};
if (!command || command === 'help' || command === '--help' || command === '-h') console.log(HELP);
else if (!commands[command]) fail(`unknown command "${command}"\n\n${HELP}`);
else await commands[command]();
