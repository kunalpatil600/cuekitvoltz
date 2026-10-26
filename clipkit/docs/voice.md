# Voice

The voice-over is the clock. You write a script with performance notes, the voice director performs
it with local open-source TTS and measures where every word landed, and the video reads every beat
from that measurement. Nothing is hand-timed, so nothing drifts when you rewrite a line.

The director is Python (in [`voice/`](../voice/)); the sync is the kit's `voiceTrack()`.

## Setup

`npx cuekitvoltz init` asks about this during setup ([themes.md](themes.md) covers the rest of
setup). To install it directly:

```bash
npx cuekitvoltz download voice              # Kokoro + word aligner: calm, clean voices
npx cuekitvoltz download voice chatterbox   # + Chatterbox-Turbo: voices that act out [emotion] tags
```

Both show the sizes and ask before downloading (`--yes` skips the question).

| Part | Size | Where |
|---|---|---|
| Python libraries | ~5 GB with an NVIDIA GPU (CUDA PyTorch), ~1.5 GB without; ~1 GB more for Chatterbox's | `.venv-voice/` in your project |
| Kokoro-82M and its voices | ~320 MB | `~/.cache/huggingface` |
| wav2vec2 word aligner | ~360 MB | `~/.cache/torch` |
| Chatterbox-Turbo | ~4.6 GB | `~/.cache/huggingface` |

The model sizes and the CUDA total were measured on Linux; the CPU-only library size is an estimate.

- **Python 3.11.** 3.12 and newer are too new for some of the TTS libraries. The CLI uses uv when it's
  installed (uv fetches 3.11 itself), else a `python3.11` on the PATH.
- **PyTorch build:** without an NVIDIA GPU, the CLI installs PyTorch's CPU build, which is much smaller.
- **Hardware:** a CUDA GPU is fastest; the CPU works too, only slower. Chatterbox needs ~2.5 GB of
  free RAM.
- **Settings:** `CUEKITVOLTZ_DEVICE` (`cuda`, `mps` or `cpu`; the TTS engines only, the aligner uses
  CUDA if available, else the CPU), `CUEKITVOLTZ_CACHE` (the clip cache,
  default `~/.cache/cuekitvoltz/voice`), `CUEKITVOLTZ_PYTHON` (use another interpreter), and
  `HF_HUB_OFFLINE=1` once the models are downloaded.

## Write the script

Put `script.vo.md` in the video's folder:

```
---
voice: cb-heart      # preset; Kokoro 'heart' is the calm, deterministic option
speed: 1.0           # Kokoro rate
gap: 0.32            # silence between lines (s)
lead: 0.35           # silence before the first line
tail: 1.0            # after the last line
fps: 30
---
# hook
[surprised] You press Enter. (pause 0.25) What actually happens?
# lookup
[narration] First, your laptop asks a @dns DNS server where the site lives.
[dramatic] About {120 ms|a hundred and twenty milliseconds}. [chuckle] Faster than a *blink*.
```

| Markup | Meaning |
|---|---|
| `[emotion]` opening a line | happy, surprised, dramatic, sarcastic, whispering, angry, fear, crying, narration, advertisement. Chatterbox-Turbo performs it; Kokoro gets a matching pace. |
| `[laugh]` etc. anywhere | laugh, chuckle, sigh, gasp, groan, cough, sniff, clear throat, shush. Chatterbox-Turbo only. |
| `(pause 0.4)` | a silence inside the line |
| `*word*`, `*several words*` | emphasis: Kokoro stresses it; captions colour it |
| `@name` | an anchor on the next word, read with `VO.at('name')`. Put anchors on the nouns that have a visual. |
| `{shown\|spoken}` | captions show the first part, the voice says the second: numbers, units, acronyms |
| `{speed 1.1}` `{voice heart}` `{gap 0.8}` | per-line overrides |
| `# section` | names the next line's start, read with `VO.at('section')` |
| `// …` at the start of a line | a comment line (a trailing `//` is read aloud) |

Section and anchor names share one namespace: the director refuses a clash, because `at()` reads
both.

Keep lines short, at most ~14 words: one idea and one emotion per line.

## Perform it

```bash
npx cuekitvoltz direct src/intro/script.vo.md      # -> public/voice/intro.wav + src/intro/vo.json
npx cuekitvoltz hear src/intro/vo.json             # CER per line; > 30% means listen to that line
```

- The id is the script's folder name for `script.vo.md`, otherwise the file name (`intro.vo.md`
  gives `intro`). `--id`, `--public` and `--out` override the defaults.
- Each line is cached by its text, voice and settings, so editing one line re-synthesizes only that
  line. `--fresh` ignores the cache.
- Chatterbox lines are seeded from their text, so re-runs are identical.
- **Voice:** the script's `voice:` line, else the project's default from setup
  (`npx cuekitvoltz config voice <preset>`), else `heart`.

## Voices

| Preset | Engine | Notes |
|---|---|---|
| `cb-heart` | Chatterbox-Turbo, female (prompted by Kokoro `af_heart`) | expressive; follows the emotion tags. Best for hooks, humour and showcases. |
| `cb-michael`, `cb-fenrir`, `cb-builtin` | Chatterbox-Turbo, male / its built-in voice | |
| `heart`, `bella`, `emma` | Kokoro, female | clean, calm, fast, fully deterministic; no emotion control, only pace |
| `michael`, `fenrir`, `puck` | Kokoro, male | |

To hear them before choosing, `npx cuekitvoltz voice-samples cb-heart heart michael` writes a
5-second sample of each to `cuekitvoltz/voice-samples/`.

**Synthetic voices only.** Every Chatterbox voice is prompted by a clip that Kokoro generated; the
`cb-heart` reference ships in `voice/refs/`, and the others are generated on first use. There is
deliberately no option to pass your own recording: please don't use this to clone a real person's
voice. Chatterbox output also carries Resemble AI's inaudible PerTh watermark.

## Build the video on it

```tsx
import vo from './vo.json';
import { Audio, staticFile } from 'remotion';
import { Captions, Character, voiceScenes, voiceTrack } from 'cuekitvoltz';

const VO = voiceTrack(vo, 30);                       // durationInFrames = VO.frames
const { scenes, starts } = voiceScenes(VO, ['hook', 'lookup'], [18]);   // cuts centred on sections

VO.at('lookup')      // frame the "lookup" section starts
VO.at('dns')         // frame the narrator says "DNS"
VO.word('Enter')     // frame of the first spoken "Enter"

<Character talk={VO.mouth} viseme={VO.viseme} … />        // lip-sync
<Captions track={VO} y={1330} accent="#c8792c" />          // phrases pop in word by word
<Audio src={staticFile(VO.data.audio)} />
<Audio src={staticFile('music/bed.mp3')} volume={VO.duck(0.12, 0.04)} />   // music dips under the voice
```

- `at()` throws on a typo, so a renamed anchor can't silently drift.
- Inside `<Scenes>`, frames are scene-relative: use `VO.at(x) - starts[i]`, and
  `(f) => VO.mouth(f + starts[i])` for lip-sync.
- `<Captions>` modes: `pop` (words spring in as they're spoken) or `karaoke` (the phrase shows, the
  spoken word lights up). `maxWords` sets the phrase length; `hidden` hides them over a title card.

## Fixes

| Problem | Fix |
|---|---|
| A word is mispronounced | respell it: `{GPU\|G P U}`, `{nginx\|engine x}` |
| A number is read oddly, or sync around it is off | `{1,240\|twelve forty}`: the aligner only knows letters |
| A line feels rushed | split it, add `(pause 0.2)`, or lower `{speed}` (Kokoro) |
| The emotion is too strong or weak (Chatterbox) | change the tag (`narration` is neutral) or move it to a shorter line |
| A visual lands late or early | move the `@anchor` to the word the visual belongs to; never offset frames by hand |
| A line comes out garbled | `hear` flags it; re-run with an edited line (sampled TTS occasionally slips) |

## How it works

1. `markup.py` parses the lines into chunks between pauses.
2. Each chunk is synthesized (Kokoro or Chatterbox-Turbo), trimmed and levelled to −18 LUFS.
3. `align.py` force-aligns every word with wav2vec2 CTC (torchaudio), for both engines.
4. `lipsync.py` builds the per-frame mouth openness from loudness (fast attack, slower release, closed
   between words) and nine visemes from misaki phonemes spread over each word.
5. `direct.py` lays the lines end to end and writes the wav and `vo.json`.
