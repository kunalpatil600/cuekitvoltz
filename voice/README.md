# Voice director

The Python half of cuekitvoltz. It takes a voice script with emotion marks, performs it with local
open-source TTS, and measures where every word landed. The video then syncs to that measurement: no
hand-timing. The full guide is [docs/voice.md](../docs/voice.md).

| File | What it does |
|---|---|
| `direct.py` | performs a `.vo.md` script → `public/voice/<id>.wav` + `vo.json` |
| `markup.py` | parses the script markup: `[emotion]`, `(pause 0.3)`, `*emphasis*`, `@anchor`, `{shown\|spoken}`, `# section` |
| `engines.py` | voice presets and the two engines (Kokoro, Chatterbox-Turbo); device and cache settings |
| `align.py` | forced alignment of every word (wav2vec2 CTC from torchaudio) |
| `lipsync.py` | per-frame mouth openness and visemes from loudness and phonemes |
| `check.py` | hear-back: transcribes each line and flags garbled ones |
| `fetch.py` | downloads the models up front (Kokoro, the aligner, Chatterbox-Turbo) |
| `samples.py` | a short sample of each voice preset, for picking a default |
| `requirements.txt`, `requirements-chatterbox.txt` | the core libraries (Kokoro, alignment) and the Chatterbox extra |
| `refs/` | the Kokoro-made reference clip that gives Chatterbox its `cb-heart` voice |

```bash
npx cuekitvoltz download voice chatterbox        # Python 3.11 venv in .venv-voice + models (shows sizes, asks first)
npx cuekitvoltz direct src/intro/script.vo.md     # -> public/voice/intro.wav + src/intro/vo.json
npx cuekitvoltz hear src/intro/vo.json            # CER per line; > 30% means listen to it
```

**Environment variables:**
- `CUEKITVOLTZ_PYTHON`: use this Python instead of `.venv-voice`.
- `CUEKITVOLTZ_DEVICE`: `cuda`, `mps` or `cpu`. The default picks the first one available.
- `CUEKITVOLTZ_CACHE`: where clips are cached. The default is `~/.cache/cuekitvoltz/voice`.
- `HF_HUB_OFFLINE=1`: skip the Hugging Face network check once the models are downloaded.

**Synthetic voices only.** Every preset is a Kokoro voice or Chatterbox-Turbo prompted by a clip
Kokoro made. There is deliberately no option to pass your own reference recording; please don't add
one to clone a real person's voice.
