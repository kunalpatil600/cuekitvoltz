// Which WebGL backend works on this machine, and how fast does a 3D frame render with it?
//
//   node scripts/gl-probe.mjs [backends...] [--frame <CompositionId>:<frame>] [--cft]
//
// For each backend (default: swangle angle-egl egl vulkan angle) it opens a browser, logs the
// WebGL renderer string (from the gl-probe still) and times one 3D frame (default: the
// kit-reel-3d product shot). --cft uses Chrome for Testing instead of the default headless shell
// (the headless shell has no GPU path on Linux). Images land in renders/_stills/gl-probe/.
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';

const ROOT = path.resolve(import.meta.dirname, '..');
// a backend that crashes its browser rejects later on close: report it and move on
process.on('unhandledRejection', (e) => console.log(`  (browser crashed: ${String(e?.message).split('\n')[0].slice(0, 100)})`));
const args = process.argv.slice(2);
const cft = args.includes('--cft');
if (cft) args.splice(args.indexOf('--cft'), 1);
const chromeMode = cft ? 'chrome-for-testing' : 'headless-shell';
const fi = args.indexOf('--frame');
const [testId, testFrame] = (fi === -1 ? 'kit-reel-3d:120' : args.splice(fi, 2)[1]).split(':');
const backends = args.length ? args : ['swangle', 'angle-egl', 'egl', 'vulkan', 'angle'];
const outDir = path.join(ROOT, 'renders/_stills/gl-probe');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({
  entryPoint: path.join(ROOT, 'examples/index.ts'), publicDir: path.join(ROOT, 'public'),
  webpackOverride: (c) => ({ ...c, resolve: { ...c.resolve, alias: { ...c.resolve?.alias, cuekitvoltz$: path.join(ROOT, 'src/index.ts') } } }),
});
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms} ms`)), ms))]);
for (const gl of backends) {
  const chromiumOptions = { gl, enableMultiProcessOnLinux: process.env.MULTI === '1' };
  let browser;
  try {
    browser = await withTimeout(openBrowser('chrome', { chromiumOptions, chromeMode }), cft ? 600000 : 30000); // first --cft run downloads Chrome
    let renderer = '?';
    const probe = await selectComposition({ serveUrl, id: 'gl-probe', puppeteerInstance: browser, chromiumOptions, chromeMode });
    await withTimeout(renderStill({
      serveUrl, composition: probe, output: path.join(outDir, `${gl}-probe.jpg`), imageFormat: 'jpeg', puppeteerInstance: browser, chromiumOptions, chromeMode,
      onBrowserLog: (l) => { if (l.text.startsWith('GL:')) renderer = l.text.slice(3); },
    }), 60000);
    const comp = await selectComposition({ serveUrl, id: testId, puppeteerInstance: browser, chromiumOptions, chromeMode });
    const times = [];
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      await withTimeout(renderStill({ serveUrl, composition: comp, frame: Number(testFrame) + i, output: path.join(outDir, `${gl}-${i}.jpg`), imageFormat: 'jpeg', puppeteerInstance: browser, chromiumOptions, chromeMode }), 120000);
      times.push(((performance.now() - t) / 1000).toFixed(2));
    }
    console.log(`${gl.padEnd(10)} ${renderer}\n${''.padEnd(10)} 3D frame: ${times.join(' / ')} s`);
  } catch (e) {
    console.log(`${gl.padEnd(10)} FAILED: ${String(e.message).split('\n')[0].slice(0, 160)}`);
  } finally {
    await browser?.close({ silent: true }).catch(() => {});
  }
}
// bundles land in the OS temp folder (RAM on many Linux machines): don't leave them behind
fs.rmSync(serveUrl, { recursive: true, force: true });
