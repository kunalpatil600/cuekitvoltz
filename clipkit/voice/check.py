"""Hear-back check: transcribe a voice track line by line and compare it with the script.

    npx cuekitvoltz hear path/to/vo.json [--public public]
    (= <venv python> voice/check.py ...; run it from your Remotion project's root)

Greedy-decodes each line's audio with the same wav2vec2 model the aligner uses and prints the
character error rate per line (letters only, so acronyms and homophones the recogniser spells oddly
cost little), so a garbled, skipped or invented phrase (it happens with sampled TTS like Chatterbox)
shows up without anyone listening. Lines above 30% are flagged.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
import soundfile as sf

from align import _load, spoken_letters


def wer(ref: list[str], hyp: list[str]) -> float:
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r != h))
            prev, d[j] = d[j], cur
    return d[len(hyp)] / max(1, len(ref))


def main() -> None:
    import argparse
    import torch
    import torchaudio
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('vo', help='the vo.json the voice director wrote')
    ap.add_argument('--public', default='public', help="your project's public folder (default: ./public)")
    args = ap.parse_args()
    data = json.loads(Path(args.vo).read_text())
    y, sr = sf.read(Path(args.public) / data['audio'], dtype='float32')
    y = y.mean(axis=1) if y.ndim > 1 else y
    st = _load()
    bundle, model = st['bundle'], st['model']
    labels = bundle.get_labels()
    device = next(model.parameters()).device
    worst = 0.0
    for line in data['lines']:
        seg = y[int(line['start'] * sr): int(line['end'] * sr)]
        wav = torchaudio.functional.resample(torch.from_numpy(np.ascontiguousarray(seg)), sr, bundle.sample_rate)
        with torch.inference_mode():
            em, _ = model(wav.unsqueeze(0).to(device))
        ids = em[0].argmax(-1).tolist()
        text, prev = [], None
        for i in ids:
            if i != prev and i != 0:
                text.append(labels[i])
            prev = i
        heard = ''.join(text).replace('|', ' ').lower().split()
        said = ' '.join(spoken_letters(w[4] if len(w) > 4 else w[0]).replace('|', ' ') for w in line['words'])
        e = wer(list(said.replace(' ', '')), list(''.join(heard)))
        worst = max(worst, e)
        flag = '  ⚠ listen to this line' if e > 0.3 else ''
        print(f"{line['start']:6.2f} s  CER {e:4.0%}  heard: {' '.join(heard)[:70]}{flag}")
    print(f'worst line CER {worst:.0%}')


if __name__ == '__main__':
    main()
