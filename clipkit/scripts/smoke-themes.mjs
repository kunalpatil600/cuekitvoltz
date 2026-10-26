// Generates every suggested palette with every font pairing (plus a low-contrast custom palette) into a
// scratch folder and typechecks the generated theme.ts files, so the generator can't ship a theme that
// doesn't compile.
//
//   npm run test:themes
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FONTS, PRESETS } from '../bin/lib/themes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = path.join(ROOT, '.tmp-themes'); // inside the repo, so node_modules resolves
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir);

const cli = (args) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'bin/cuekitvoltz.mjs'), ...args], { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`theme ${args.join(' ')} failed:\n${r.stderr}`);
};
let n = 0;
try {
  for (const preset of Object.keys(PRESETS)) {
    for (const fonts of Object.keys(FONTS)) {
      cli(['theme', 'add', `${preset}-${fonts}`, '--preset', preset, '--fonts', fonts, '--no-use']);
      n++;
    }
  }
  cli(['theme', 'add', 'low-contrast', '--colors', '#0B1D2A,#4A6178,#1E5AA8', '--fix']);
  n++;
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', lib: ['DOM', 'ES2022'], strict: true, skipLibCheck: true, noEmit: true, paths: { cuekitvoltz: ['../src/index.ts'] } },
    include: ['cuekitvoltz'],
  }));
  const tsc = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], { cwd: dir, stdio: 'inherit' });
  if (tsc.status !== 0) throw new Error('generated themes failed to typecheck');
  console.log(`themes: ${n} generated and typechecked`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
