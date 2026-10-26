// Builds the publishable package: dist/index.js (one ES module, every dependency left external) and
// dist/types/ (declarations from tsc).
//
//   npm run build
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = path.resolve(import.meta.dirname, '..');
const dist = path.join(ROOT, 'dist');
fs.rmSync(dist, { recursive: true, force: true });

await build({
  entryPoints: [path.join(ROOT, 'src/index.ts')],
  outfile: path.join(dist, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  packages: 'external',
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'warning',
});

const tsc = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.build.json'], { cwd: ROOT, stdio: 'inherit' });
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;
console.log(`dist/index.js ${kb(path.join(dist, 'index.js'))}, dist/types/`);
