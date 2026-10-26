"""Forced alignment: when each word starts and ends in a clip, given what the clip says.

Uses torchaudio's wav2vec2 CTC model (WAV2VEC2_ASR_BASE_960H, English letters; about 360 MB, downloaded
once to ~/.cache/torch). Chatterbox gives no timings, so its clips are aligned here; Kokoro reports its
own. Words the model can't spell (symbols, digits without a spoken form) are interpolated between
their neighbours.
"""
from __future__ import annotations

import re

import numpy as np

_state: dict = {}

ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'zero ten twenty thirty forty fifty sixty seventy eighty ninety'.split()


def number_words(n: int) -> str:
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000:
        return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' ' + number_words(n % 100))
    for size, name in ((10 ** 9, 'billion'), (10 ** 6, 'million'), (1000, 'thousand')):
        if n >= size:
            rest = n % size
            return number_words(n // size) + ' ' + name + ('' if rest == 0 else ' ' + number_words(rest))
    return str(n)


def spoken_letters(word: str) -> str:
    """A word as the letters the aligner knows (A–Z, apostrophe, '|' between sub-words)."""
    w = word.lower().replace('%', ' percent').replace('&', ' and ').replace('+', ' plus ')
    w = re.sub(r'(\d+)\.(\d+)', lambda m: f"{number_words(int(m.group(1)))} point {' '.join(ONES[int(d)] for d in m.group(2))}", w)
    w = re.sub(r'\d+', lambda m: ' ' + number_words(int(m.group(0))) + ' ', w.replace(',', ''))
    w = re.sub(r"[^a-z' ]", ' ', w)
    return '|'.join(w.split())


def _load():
    if not _state:
        import torch
        import torchaudio
        bundle = torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
        _state['bundle'] = bundle
        _state['model'] = bundle.get_model().to('cuda' if torch.cuda.is_available() else 'cpu').eval()
        _state['dict'] = {c: i for i, c in enumerate(bundle.get_labels())}
    return _state


def align(y: np.ndarray, sr: int, words: list[str]) -> list[tuple[float, float]]:
    """(start, end) in seconds for each word of `words` in the mono clip `y`."""
    import torch
    import torchaudio
    st = _load()
    bundle, model, dic = st['bundle'], st['model'], st['dict']
    device = next(model.parameters()).device
    wav = torch.from_numpy(np.ascontiguousarray(y, dtype=np.float32))
    if sr != bundle.sample_rate:
        wav = torchaudio.functional.resample(wav, sr, bundle.sample_rate)
    with torch.inference_mode():
        emission, _ = model(wav.unsqueeze(0).to(device))
        emission = torch.log_softmax(emission, dim=-1)
    sec_per_frame = wav.shape[-1] / emission.shape[1] / bundle.sample_rate

    letters = [spoken_letters(w) for w in words]
    targets: list[int] = []
    owner: list[int] = []  # word index of each target letter
    for i, s in enumerate(letters):
        for ch in s.upper():
            if ch in dic and ch != '-':
                if ch == '|':
                    continue
                targets.append(dic[ch])
                owner.append(i)
    out: list[tuple[float, float] | None] = [None] * len(words)
    if targets and len(targets) <= emission.shape[1]:
        tgt = torch.tensor([targets], dtype=torch.int32, device=device)
        aligned, scores = torchaudio.functional.forced_align(emission, tgt, blank=0)
        spans = torchaudio.functional.merge_tokens(aligned[0], scores[0].exp())
        for span, i in zip(spans, owner):
            a, b = span.start * sec_per_frame, span.end * sec_per_frame
            out[i] = (a, b) if out[i] is None else (out[i][0], b)
    return _fill(out, len(y) / sr)


def _fill(times: list[tuple[float, float] | None], total: float) -> list[tuple[float, float]]:
    """Give unaligned words a slice of the gap between their aligned neighbours."""
    n = len(times)
    res: list[tuple[float, float]] = []
    i = 0
    while i < n:
        if times[i] is not None:
            res.append(times[i])  # type: ignore[arg-type]
            i += 1
            continue
        j = i
        while j < n and times[j] is None:
            j += 1
        a = res[-1][1] if res else 0.0
        b = times[j][0] if j < n else total  # type: ignore[index]
        step = (b - a) / (j - i)
        res += [(a + k * step, a + (k + 1) * step) for k in range(j - i)]
        i = j
    return res
