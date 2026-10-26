---
name: voice-director
description: >
  Write, perform and sync voice-overs for Remotion videos with the cuekitvoltz voice director
  (npx cuekitvoltz direct). Covers emotion-marked scripts (.vo.md), choosing a Kokoro or Chatterbox-Turbo voice,
  rendering a timed voice track with word timings, and building the video TTS-first on the voice
  (sections, anchors, captions, character lip-sync). Use it whenever a video needs narration, the user
  asks for a voice-over, emotion, captions, subtitles or lip-sync, or a script's timing has to drive the
  visuals. Also use it when a voice line sounds flat, rushed or mispronounced, or a visual lands
  early or late against the narration.
---

# Voice director

The voice-over is the clock. You write the script with performance notes, the director renders it,
and the video reads every beat from the result, so nothing is hand-timed and nothing drifts.

## Before you start

- **Set up?** If `cuekitvoltz.config.json` isn't in the project root, run the **cuekitvoltz-setup**
  skill first. If it exists but `npx cuekitvoltz doctor` shows no voice engine, offer
  `npx cuekitvoltz download voice` (light, ~2–6 GB) or `download voice chatterbox` (with emotion,
  ~11 GB). Say the size and wait for a yes.
- **Default voice:** the config's `voice.preset` is used for any script without a `voice:` line. Only
  set `voice:` in a script when this video needs a different one.

## Hard rules

- **Synthetic voices only.** Use the presets in `voice/engines.py` `VOICES`: Kokoro voices, or
  Chatterbox-Turbo prompted with a clip that Kokoro generated. **Never clone a real person's
  voice**: the director has no reference-recording option, on purpose.
- **Watermark:** Chatterbox output carries Resemble's inaudible PerTh watermark. Mention it if the
  user asks about disclosure.
- **Setup:** `npx cuekitvoltz download voice [chatterbox]` once (Python 3.11 venv in `.venv-voice`,
  models fetched up front: Kokoro ~320 MB, the aligner ~360 MB, Chatterbox-Turbo ~4.6 GB).
- **Memory:** Chatterbox needs ~2.5 GB of free RAM (a GPU helps a lot). On small machines, run the
  director after renders finish, not alongside them.

## Workflow

1. **Write `script.vo.md` in the video's folder**, e.g. `src/<id>/script.vo.md` (format below). Keep lines short, at most ~14 words: one
   idea and one emotion per line.
2. **Render the voice:**
   ```bash
   npx cuekitvoltz direct src/<id>/script.vo.md
   ```
   It prints each line's start and end and the anchors. Outputs:
   - `public/voice/<id>.wav`
   - `src/<id>/vo.json` (next to the script)

   Clips are cached by text and settings, so only edited lines re-synthesize. `--fresh` ignores the
   cache. `npx cuekitvoltz hear src/<id>/vo.json` transcribes each line back and flags garbled ones
   (CER > 30%), which happens now and then with sampled TTS like Chatterbox.
3. **Listen** to the wav, and fix what sounds wrong (see Fixes). Re-run; it's cheap.
4. **Build the video on it:**
   ```ts
   import vo from './vo.json';
   const VO = voiceTrack(vo, 30);
   // <Composition durationInFrames={VO.frames} …/>
   // scene boundaries: VO.at('dns'), beats: VO.at('router') or VO.word('Enter')
   <Audio src={staticFile(VO.data.audio)} />
   <Captions track={VO} y={1330} color accent active />
   <Character talk={VO.mouth} viseme={VO.viseme} … />
   ```
   `voiceScenes(VO, ['hook', 'dns', …], cuts)` returns the `<Scenes>` lengths (each cut centred on
   its section) and each scene's `starts`. Inside `<Scenes>`, frames are scene-relative: use
   `VO.at(x) - starts[i]`, and `(f) => VO.mouth(f + starts[i])` for lip-sync.
5. Hand it to **video-qa**: check sync at the anchors, loudness, and that captions stay in the safe area.

## Script format (`.vo.md`)

```
---
voice: cb-heart      # preset; Kokoro 'heart' is the calm, deterministic option
speed: 1.0           # Kokoro rate
gap: 0.32            # silence between lines (s)
lead: 0.35           # silence before the first line
tail: 1.0            # after the last line
---
# hook                                        ← section: VO.at('hook')
[surprised] You press Enter. (pause 0.25) What actually happens?
# dns
[narration] First, your laptop asks a @dns DNS server where the site lives.
[dramatic] About {120 ms|a hundred and twenty milliseconds}. [chuckle] Faster than a *blink*.
```

| Markup | Meaning |
|---|---|
| `[emotion]` opening a line | happy, surprised, dramatic, sarcastic, whispering, angry, fear, crying, narration, advertisement. Turbo performs it; Kokoro gets a matching pace. |
| `[laugh]` etc. anywhere | laugh, chuckle, sigh, gasp, groan, cough, sniff, clear throat, shush. Turbo only; dropped for Kokoro. |
| `(pause 0.4)` | a silence inside the line, for comic timing or a beat before the reveal |
| `*word*` | emphasis: Kokoro stresses it; captions colour it with the accent |
| `@name` | anchor on the next word: `VO.at('name')`. Put anchors on the nouns that have a visual. |
| `{shown\|spoken}` | captions show the first part, the voice says the second: numbers, units, acronyms |
| `{speed 1.1}` `{voice heart}` `{gap 0.8}` | per-line overrides |
| `# section` | names the next line's start. Section and anchor names must differ (`# lookup` with `@dns`); the director refuses a clash. |
| `// …` | comment |

## Choosing a voice

- **`cb-heart`** (Chatterbox-Turbo, female, from Kokoro `af_heart`): expressive and follows the
  emotion tags. Use it for showcases, hooks and humour. It's seeded from the line text, so re-runs
  are identical.
- **`heart`** (Kokoro): clean, calm, fast and fully deterministic. The default when the script sets
  no voice. It has no emotion control, only pace.
- Male options are `cb-michael` / `cb-fenrir`, or Kokoro `michael` (weaker).

## Fixes

| Problem | Fix |
|---|---|
| A word is mispronounced | respell it: `{GPU\|G P U}`, `{nginx\|engine x}` |
| A number is read oddly, or sync around it is off | `{1,240\|twelve forty}`. The aligner only knows letters. |
| A line feels rushed | split it, add `(pause 0.2)`, or lower `{speed}` (Kokoro) |
| The emotion is too strong or weak (Turbo) | change the tag (`narration` is neutral) or move it to a shorter line |
| A visual lands late or early | move the `@anchor` to the word the visual belongs to; never offset frames by hand |
| Captions run too long | keep lines short. `Captions maxWords` (default 4) controls phrase length. |
| Lip-sync looks mushy | check `VO.viseme` is passed. The mouth closes on m/b/p and rounds on o/u automatically. |

## How it works (for debugging)

1. `markup.py` parses lines into chunks between pauses.
2. Each chunk is synthesized (Kokoro or Chatterbox-Turbo), trimmed and levelled to −18 LUFS.
3. `align.py` force-aligns every word with wav2vec2 CTC (torchaudio) for both engines.
4. `lipsync.py` builds per-frame `open` from loudness and `visemes` from misaki phonemes spread over
   each word.
5. `direct.py` lays the lines end to end and writes the wav and `vo.json`.

The composition plays the wav itself. To duck the music under the voice, give the music
`<Audio volume={VO.duck(0.12, 0.04)}>`. `npx cuekitvoltz render` then loudness-normalises the whole
mix to −14 LUFS.
