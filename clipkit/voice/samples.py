"""Voice samples: one short line per preset, so you can pick a default voice by ear.

    <venv python> voice/samples.py heart cb-heart ... [--out cuekitvoltz/voice-samples]
    (npx cuekitvoltz voice-samples)

Writes <out>/<preset>.wav. Presets whose engine isn't installed are skipped with a note.
"""
from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path

import numpy as np
import soundfile as sf

from engines import SR, VOICES, Chatterbox, Kokoro, free, level, reference_clip

LINE = "Hi! This is how I'd sound in your videos. Pretty good, right?"
TURBO_LINE = "[happy] Hi! This is how I'd sound in your videos. [chuckle] Pretty good, right?"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('presets', nargs='*', help='presets to sample (default: every installed one)')
    ap.add_argument('--out', default='cuekitvoltz/voice-samples')
    args = ap.parse_args()
    has_turbo = importlib.util.find_spec('chatterbox') is not None
    presets = args.presets or [p for p, s in VOICES.items() if s['engine'] == 'kokoro' or has_turbo]
    unknown = [p for p in presets if p not in VOICES]
    if unknown:
        raise SystemExit(f'unknown preset(s): {", ".join(unknown)}; presets: {", ".join(VOICES)}')
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    import librosa
    for engine_name in ('kokoro', 'chatterbox'):
        batch = [p for p in presets if VOICES[p]['engine'] == engine_name]
        if not batch:
            continue
        if engine_name == 'chatterbox' and not has_turbo:
            print(f'  skipped {", ".join(batch)}: Chatterbox isn\'t installed (npx cuekitvoltz download chatterbox)')
            continue
        engine = Kokoro() if engine_name == 'kokoro' else Chatterbox()
        for p in batch:
            spec = VOICES[p]
            if engine_name == 'kokoro':
                y, sr, _ = engine.say(LINE, spec['voice'])
            else:
                y, sr, _ = engine.say(TURBO_LINE, reference_clip(spec['ref']) if spec['ref'] else None, seed=7)
            y = librosa.resample(y, orig_sr=sr, target_sr=SR) if sr != SR else y
            f = out / f'{p}.wav'
            sf.write(f, level(y.astype(np.float32)), SR, subtype='PCM_16')
            print(f'  {p:11} {spec["desc"]:52} -> {f}')
        free(engine)


if __name__ == '__main__':
    main()
