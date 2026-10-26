# Themes and setup

## Setup

```bash
npx cuekitvoltz init
```

Run it once from your project's root. It asks four questions, each with a suggestion you can take by
pressing Enter:

1. **Colour theme:** a suggested palette, your own colours, or skip.
2. **Downloads:** it lists what it needs with real sizes, then downloads only what you choose:

   | Item | Size | What it's for |
   |---|---|---|
   | Render browser (Chrome Headless Shell) | ~240 MB | every render |
   | GPU browser (Chrome for Testing) | ~400 MB | fast 3D renders; offered only if a GPU is found |
   | Voice: Python libraries, Kokoro, word aligner | ~5.7 GB with an NVIDIA GPU, ~2.2 GB without | calm, clean voices, word timings, lip-sync |
   | Voice: Chatterbox-Turbo | ~5.6 GB | voices that act out `[emotion]` tags |

   Before that, it checks for a GPU, Python 3.11 (or uv) and free disk space.
3. **Default voice:** pick a preset, after listening to short samples if you like.
4. **Starter video:** a 9:16 short on your theme (and voice), registered in your Root as `starter`.

Your answers are saved in `cuekitvoltz.config.json`. Run `init` again any time, or use the commands
below. Without a terminal (CI, or Claude Code), pass the answers as flags:

```bash
npx cuekitvoltz init --theme sand --downloads light --voice heart --starter
```

- `--downloads` takes `all`, `light`, `render`, `none`, or a comma list of `browser`, `gpu-browser`,
  `voice` and `chatterbox`.
- `--colors "#bg,#text,#accent"` gives your own palette instead of `--theme`.

`npx cuekitvoltz doctor` shows what's installed and what's missing at any point.

## Suggested palettes

| Preset | Background | Text | Accent | Feel | Fonts |
|---|---|---|---|---|---|
| `sand` | `#3A2C1F` | `#F4D9A0` | `#C8792C` | warm brown, sand and copper | editorial |
| `ember` | `#06110C` | `#F2EEE8` | `#A31C1B` | green-black and deep red | editorial |
| `studio` | `#F4F5F7` | `#16181D` | `#3B5BDB` | white high-key, ink and blue | clean |
| `midnight` | `#07070B` | `#F5F5F7` | `#7D7AFF` + `#FF6FB5` | near-black, violet-pink spectrum | editorial |
| `neon` | `#0A0A14` | `#EDEBFF` | `#00E5A8` + `#FF3EA5` | ink blue, mint and magenta | grotesk |
| `paper` | `#F3EDE2` | `#1E1A16` | `#D9480F` | warm paper, ink and vermilion | classic |

## Your own palette

Give a background, a text colour and an accent, plus an optional second accent (all hex):

```bash
npx cuekitvoltz theme add brand --colors "#101418,#F2EEE8,#E8590C" --fonts clean
npx cuekitvoltz theme add brand        # or answer the questions
```

The CLI checks contrast before saving:
- **Text** below 4.5:1 on the background is hard to read on a phone. It suggests the nearest colour
  that passes; `--fix` uses it.
- **Accent** below 3:1 still works for shapes. Captions and highlighted words automatically get a
  version of it that reaches 3:1.

## What a theme contains

From your 3–5 colours, the theme derives the whole look:

| Part | Used by |
|---|---|
| `bg`, `surface`, `line`, `text`, `muted`, `accent`, `ramp`, `good`, `bad` | `<Stage>` and your own components (`theme.accent` …) |
| fonts: a sans, a serif italic and a mono, from one of five OFL pairings | `<Stage>`, `Captions`, your text |
| `iso`: colours for servers, laptops, databases, clouds, platforms … | every isometric object, unless you pass a colour prop |
| `studio`: softbox light baked from the palette (high-key white for light themes) | `<Scene3D>` when it has no `studio` prop |
| `backdrop`: a gradient with a glow in the accent | `<Scene3D>` when it has no `background` prop |
| `captions`: readable spoken-word and emphasis colours, the shadow behind | `<Captions>` when its colour props aren't set |

**Font pairings** (all on Google Fonts, loaded at render time through `@remotion/google-fonts`):

| Pairing | Sans | Serif italic | Mono |
|---|---|---|---|
| `editorial` | Geist | Instrument Serif | Geist Mono |
| `clean` | Inter | Newsreader | JetBrains Mono |
| `grotesk` | Space Grotesk | Fraunces | Space Mono |
| `plex` | IBM Plex Sans | IBM Plex Serif | IBM Plex Mono |
| `classic` | DM Sans | DM Serif Display | DM Mono |

## Where themes live

Each theme gets its own folder in your project:

```
cuekitvoltz.config.json        the active theme and default voice
cuekitvoltz/
  theme.ts                     re-exports the active theme
  themes/
    sand/
      theme.json               what you chose: colours, fonts, preset
      theme.ts                 the generated Theme
      preview.svg              a swatch card
    brand/
      …
```

Commit the folder: the themes are part of your project.

| Command | What it does |
|---|---|
| `npx cuekitvoltz theme presets` | lists the suggested palettes and font pairings |
| `npx cuekitvoltz theme add [name]` | adds a theme (`--preset`, `--colors`, `--fonts`, `--fix`, `--no-use`, `--force`) |
| `npx cuekitvoltz theme list` | lists your themes; `*` marks the active one |
| `npx cuekitvoltz theme use <name>` | makes another theme active |
| `npx cuekitvoltz theme build [name]` | regenerates `theme.ts` and `preview.svg` after you edit `theme.json` |

## Using it in a video

```tsx
import { Stage, Scene3D, Captions } from 'cuekitvoltz';
import { theme } from '../cuekitvoltz/theme';   // the path from your file to the project root

export const MyVideo: React.FC = () => (
  <Stage theme={theme}>
    {/* everything below follows the theme; props you set still win */}
    <Scene3D camera={cam}>…</Scene3D>
    <Captions track={VO} y={1340} />
  </Stage>
);
```

To use one theme regardless of which is active, import it from its folder:
`import { theme } from '../cuekitvoltz/themes/brand/theme'`.

The kit's `Theme` type and `makeTheme(base, overrides)` work without the CLI too, if you'd rather
write a theme by hand.
