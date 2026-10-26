# Contributing

Thanks for helping. Bug reports, examples, new transition kinds, iso objects, studios and docs fixes
are all welcome.

## Setup

```bash
git clone https://github.com/<owner>/cuekitvoltz && cd cuekitvoltz
npm install
npm run dev          # Remotion Studio with every example
npm run check        # typecheck + kit rules
```

For the voice director, also run `npm run voice:setup` (Python 3.11). Its parser tests need no
models: `python -m unittest discover -s voice/tests`.

## Layout

| Path | What's there |
|---|---|
| `src/` | the kit (the published package) |
| `examples/` | example compositions; they import the kit as `cuekitvoltz` |
| `voice/` | the Python voice director |
| `bin/cuekitvoltz.mjs` | the CLI |
| `skills/` | the Claude Code skills (also the plugin) |
| `scripts/` | the build, the kit rules check, the GPU probe |
| `docs/` | the documentation |

## Rules for `src/`

`npm run kit:check` enforces them:

1. **Self-contained:** import only from inside `src/` or from the peer packages (`react`,
   `react-dom`, `remotion`, `@remotion/*`, `three`, `@react-three/*`, and `lucide` for types).
2. **Frame-pure:** no `Math.random()` (use Remotion's `random(seed)`), no `Date` and no
   `performance.now()`. Every frame must render the same on every machine and at every concurrency.
3. **No project assets:** never call `staticFile()`; take fonts, audio and images as props.
4. **Motion is data:** animated props take `Motion` functions (`frame => value`), so they can be
   sampled between frames for motion blur.

## Before opening a pull request

- Run `npm run check` and `npm run build`.
- Add or update an example when you add a feature, and check it with stills:
  `npm run stills -- <id> <frames...> --sheet` (add `--qa` for layouts, `--gpu` for heavy 3D).
- Attach a still or a short clip of visual changes to the pull request.
- Update the docs page for the module you touched, and the changelog.

## Content rules for examples

- No real company logos or trademarks, and no maps or country outlines.
- Images only under CC0, public domain or CC BY (credited).
- Synthetic voices only. Don't add voice cloning of real people.
