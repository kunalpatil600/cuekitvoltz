// cuekitvoltz rules for src/ (see CONTRIBUTING.md):
//   - imports stay inside src/ or come from the allowed (peer) packages
//   - no wall-clock or unseeded randomness (every frame must render the same on every machine)
//   - no staticFile(): the kit can't depend on a project's public/ folder
//
//   node scripts/kit-check.mjs        (exit code 1 on violations)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const KIT = path.join(ROOT, 'src');
const ALLOWED = [/^react(\/|$)/, /^react-dom(\/|$)/, /^remotion$/, /^@remotion\//, /^three(\/|$)/, /^@react-three\//, /^lucide$/];
const BANNED = [
  [/\bMath\.random\s*\(/, 'Math.random() is not deterministic: use random(seed) from remotion'],
  [/\bDate\.now\s*\(|\bnew Date\s*\(/, 'wall-clock time breaks frame-exact renders'],
  [/\bperformance\.now\s*\(/, 'wall-clock time breaks frame-exact renders'],
  [/\bstaticFile\s*\(/, 'the kit cannot read a project\'s public/ folder: take assets as props'],
];
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
};
walk(KIT);

const problems = [];
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  for (const m of src.matchAll(IMPORT)) {
    const spec = m[1] ?? m[2] ?? m[3];
    const at = m.index + m[0].lastIndexOf(spec); // a match can start lines earlier (export … from)
    if (spec.startsWith('.')) {
      const target = path.resolve(path.dirname(file), spec);
      if (!target.startsWith(KIT + path.sep) && target !== KIT) problems.push(`${rel}:${lineOf(at)} imports ${spec}, outside src/`);
    } else if (!ALLOWED.some((re) => re.test(spec))) {
      problems.push(`${rel}:${lineOf(at)} imports ${spec}, not an allowed package`);
    }
  }
  // strip comments so docs can mention the banned calls
  const code = src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/\/\/.*$/gm, (c) => ' '.repeat(c.length));
  for (const [re, why] of BANNED) {
    for (const m of code.matchAll(new RegExp(re, 'g'))) problems.push(`${rel}:${lineOf(m.index)} ${why}`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`kit-check: ${problems.length} problem${problems.length === 1 ? '' : 's'} in src/`);
  process.exit(1);
}
console.log(`kit-check: ${files.length} files in src/, all clean`);
