// The starter video: a short vertical composition on the project's theme (and voice, if it's set up),
// written next to the entry point and registered in the Root as "starter".
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { KIT_DIR, PKG, entryPoint, readConfig, rel } from './project.mjs';

const SCRIPT = `---
gap: 0.35
---
# hook
[happy] This is your first video with {cuekitvoltz|cue kit volts}.
# world
[narration] Your @colors colours, your voice, and motion that feels *real*.
`;

const imp = (p) => (p.startsWith('.') ? p : `./${p}`).replace(/\\/g, '/');

const source = ({ voice, themeImport }) => {
  const kit = ['Cut', 'Database', 'IsoLink', 'IsoScene', 'Laptop', 'Move', 'Scene', 'Scenes', 'Server', 'Split', 'Stage', 'isoRoute', 'isoView', 'spring', 'springs', 'stagger', 'tween', 'whip'];
  if (voice) kit.push('Captions', 'voiceScenes', 'voiceTrack');
  else kit.push('scenesLength');
  if (!themeImport) kit.push('ink');
  const kitLine = `import {\n  ${kit.sort((a, b) => a.localeCompare(b)).join(', ')},\n} from 'cuekitvoltz';`;
  const timing = voice
    ? `export const VO = voiceTrack(vo, 30);
export const STARTER_FRAMES = VO.frames;
const CUT = 16;
const { scenes: [A, B], starts } = voiceScenes(VO, ['hook', 'world'], [CUT]);
/** frame (inside the second scene) the narrator says "colours" */
const COLOURS = VO.at('colors') - starts[1];`
    : `const A = 110, B = 140, CUT = 16;
export const STARTER_FRAMES = scenesLength([A, B], [CUT]);
const COLOURS = 50;`;
  return `import React from 'react';
import { AbsoluteFill${voice ? ', Audio, staticFile' : ''}, useVideoConfig } from 'remotion';
${kitLine}
${themeImport ? `import { theme } from '${themeImport}';\n` : ''}${voice ? "import vo from './vo.json';\n" : ''}${themeImport ? '' : '\nconst theme = ink;\n'}
// Your starter video (9:16): two scenes and a whip cut on your theme${voice ? ', timed by the voice in script.vo.md.\n// Edit the script and run `npx cuekitvoltz direct <this folder>/script.vo.md`: the cuts and beats follow it.' : '.'}
${timing}

const rise = (fps: number, from: number, each = 1.2) => (i: number, n: number) => {
  const at = from + stagger(i, n, { each });
  return { y: spring({ at, fps, from: 70, to: 0, ...springs.snappy }), opacity: tween({ at, dur: 6 }) };
};

const Hook: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <div style={{ position: 'absolute', left: 90, top: 250, font: \`500 30px \${theme.font.mono}\`, letterSpacing: '0.16em', color: theme.muted }}>MADE WITH CUEKITVOLTZ</div>
      <div style={{ position: 'absolute', left: 90, top: 320, fontSize: 116, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', color: theme.text }}>
        <Split text="Your first" unit={rise(fps, 6)} />
        <div style={{ fontFamily: theme.font.serif, fontStyle: 'italic', fontWeight: 400, fontSize: '1.12em', color: theme.accent }}>
          <Split text="video." unit={rise(fps, 18, 1.6)} />
        </div>
      </div>
      {/* arrives already moving, overshoots a little, blurs while it's fast */}
      <Move x={spring({ at: 28, fps, from: 1200, to: 90, duration: 0.6, bounce: 0.2 })} y={() => 720} stretch={0.0008}>
        <div style={{ width: 860, height: 400, borderRadius: 48, background: theme.surface, border: \`2px solid \${theme.line}\`, padding: 56, boxSizing: 'border-box', display: 'flex', alignItems: 'flex-end', gap: 28, overflow: 'hidden' }}>
          {[0.45, 0.7, 1].map((h, i) => (
            <Move key={i} layout="inline" y={spring({ at: 40 + i * 4, fps, from: 180, to: 0, ...springs.bouncy })}>
              <div style={{ width: 210, height: 280 * h, borderRadius: 24, background: theme.ramp[i % theme.ramp.length] ?? theme.accent, opacity: 0.4 + 0.3 * i }} />
            </Move>
          ))}
        </div>
      </Move>
    </AbsoluteFill>
  );
};

const World: React.FC = () => {
  const { fps } = useVideoConfig();
  const view = isoView({ origin: [480, 1000], unit: 120 });
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <div style={{ position: 'absolute', left: 90, top: 300, fontSize: 96, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.045em', color: theme.text }}>
        <Split text="Your colours." unit={rise(fps, 4)} />
        <div style={{ color: theme.muted }}><Split text="Your voice." unit={rise(fps, 14)} /></div>
      </div>
      <IsoScene view={view}>
        <IsoLink path={isoRoute([1.6, 2.6], [0.4, 0.4])} draw={tween({ at: 10, dur: 14 })} packets={[{ at: tween({ at: COLOURS - 20, dur: 20 }) }]} />
        <Laptop x={1.2} y={2.4} rise={tween({ at: 2, dur: 10 })} open={spring({ at: 4, fps, ...springs.smooth })} />
        <Server x={-0.2} y={-0.4} rise={spring({ at: 6, fps, ...springs.bouncy })} />
        <Database x={2.4} y={-0.2} rise={spring({ at: 12, fps, ...springs.bouncy })} />
      </IsoScene>
    </AbsoluteFill>
  );
};

export const Starter: React.FC = () => (
  <Stage theme={theme}>
    <Scenes>
      <Scene duration={A}><Hook /></Scene>
      <Cut duration={CUT} kind={whip({ dir: 'left' })} />
      <Scene duration={B}><World /></Scene>
    </Scenes>${voice ? `
    <Captions track={VO} y={1340} />
    <Audio src={staticFile(VO.data.audio)} />` : ''}
  </Stage>
);
`;
};

/** Adds the starter to the Root next to the entry point; returns false if it couldn't find where. */
const register = (entry, starterFile) => {
  const src = fs.readFileSync(entry, 'utf8');
  const name = src.match(/registerRoot\(\s*(\w+)\s*\)/)?.[1];
  const from = name && src.match(new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`))?.[1];
  const base = from ? path.resolve(path.dirname(entry), from) : null;
  const root = base && ['', '.tsx', '.ts', '.jsx', '.js'].map((e) => base + e).find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!root) return false;
  let code = fs.readFileSync(root, 'utf8');
  if (/id=["']starter["']/.test(code)) return root;
  const close = code.lastIndexOf('</>');
  const imports = [...code.matchAll(/^import\s[^;]*?from\s*['"][^'"]+['"];?/gm)];
  if (close === -1 || !imports.length) return false;
  const indent = (code.slice(code.lastIndexOf('\n', close) + 1, close).match(/^\s*/)?.[0] ?? '    ') + '  ';
  const line = `${indent}<Composition id="starter" component={Starter} durationInFrames={STARTER_FRAMES} fps={30} width={1080} height={1920} />\n`;
  code = code.slice(0, code.lastIndexOf('\n', close) + 1) + line + code.slice(code.lastIndexOf('\n', close) + 1);
  const last = imports[imports.length - 1];
  const at = last.index + last[0].length;
  let add = `\nimport { Starter, STARTER_FRAMES } from '${imp(path.relative(path.dirname(root), starterFile).replace(/\.tsx$/, ''))}';`;
  if (!/\bComposition\b/.test(code.slice(0, at))) add += "\nimport { Composition } from 'remotion';";
  code = code.slice(0, at) + add + code.slice(at);
  fs.writeFileSync(root, code);
  return root;
};

/**
 * Writes the starter. `voice`: a Python to run the voice director with (null = no voice).
 * Returns { dir, voiced, root }.
 */
export const writeStarter = ({ python, entry: entryFlag } = {}) => {
  const entry = entryPoint(entryFlag);
  const dir = path.join(path.dirname(entry), 'starter');
  fs.mkdirSync(dir, { recursive: true });
  const cfg = readConfig();
  const themeImport = cfg?.theme && fs.existsSync(path.join(KIT_DIR, 'theme.ts')) ? imp(path.relative(dir, path.join(KIT_DIR, 'theme'))) : null;
  let voiced = false;
  if (python) {
    fs.writeFileSync(path.join(dir, 'script.vo.md'), SCRIPT);
    console.log('  performing the starter voice-over…');
    const r = spawnSync(python, [path.join(PKG, 'voice', 'direct.py'), path.join(dir, 'script.vo.md')], { stdio: 'inherit' });
    voiced = r.status === 0 && fs.existsSync(path.join(dir, 'vo.json'));
    if (!voiced) console.log('  the voice-over failed, so the starter is silent for now (fix the voice setup, then: npx cuekitvoltz starter)');
  }
  const file = path.join(dir, 'Starter.tsx');
  fs.writeFileSync(file, source({ voice: voiced, themeImport }));
  const root = register(entry, file);
  console.log(`  starter video -> ${rel(file)}${root ? `, registered as "starter" in ${rel(root)}` : ''}`);
  if (!root) {
    console.log(`  Add it to your Root yourself:\n    import { Starter, STARTER_FRAMES } from './starter/Starter';\n    <Composition id="starter" component={Starter} durationInFrames={STARTER_FRAMES} fps={30} width={1080} height={1920} />`);
  }
  return { dir, voiced, root };
};
