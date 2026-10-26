"""Mouth curves for lip-sync, one value per video frame.

open:    how far the mouth opens (0–1), from the loudness of the voice track
visemes: a mouth shape per frame, from each word's phonemes (misaki G2P) spread over its aligned time

Viseme codes (one character each, so a track is a short string):
    X rest   M lips closed (m b p)   F lip under teeth (f v)   L tongue (l n t d th)
    S teeth/small (s z sh ch k g h r y)   E wide (e i)   A open (a)   O round (o aw oy)   U pucker (u w)
"""
from __future__ import annotations

import numpy as np

VISEME_OF = {}
for chars, code in [
    ('mbp', 'M'), ('fv', 'F'), ('lntdθðɾ', 'L'), ('szʃʒʧʤkgŋhjɹrʔç', 'S'),
    ('uʊwW', 'U'), ('oɔɒOY', 'O'), ('aɑæʌIɐ', 'A'), ('eɛiɪAəɜɚᵊy', 'E'),
]:
    for c in chars:
        VISEME_OF[c] = code
VOWEL_CODES = set('AEOU')
_g2p: dict = {}


def phonemes(word: str) -> str:
    """misaki phonemes of one word ('' when it has none)."""
    if 'g2p' not in _g2p:
        from misaki import en
        _g2p['g2p'] = en.G2P(trf=False, british=False, fallback=None)
    try:
        ps, _ = _g2p['g2p'](word)
    except Exception:
        return ''
    return ps or ''


def word_visemes(ps: str, fallback_text: str) -> list[str]:
    codes = [VISEME_OF[c] for c in ps if c in VISEME_OF]
    if not codes:  # no phonemes: guess from the letters
        codes = [VISEME_OF.get(c, 'S') for c in fallback_text.lower() if c.isalpha()]
    return codes or ['S']


def visemes(n_frames: int, fps: float, words: list[tuple[str, float, float, str]]) -> str:
    """words: (text, start, end, phonemes) in seconds on the track."""
    track = ['X'] * n_frames
    for text, a, b, ps in words:
        codes = word_visemes(ps, text)
        weights = np.array([2.0 if c in VOWEL_CODES else 1.0 for c in codes])
        edges = a + np.concatenate([[0], np.cumsum(weights)]) / weights.sum() * max(b - a, 1e-3)
        for k, code in enumerate(codes):
            f0, f1 = int(np.floor(edges[k] * fps)), int(np.ceil(edges[k + 1] * fps))
            for f in range(max(0, f0), min(n_frames, max(f1, f0 + 1))):
                # a frame spanning two phonemes keeps the vowel (it reads better than a flicker)
                if track[f] == 'X' or code in VOWEL_CODES or code == 'M':
                    track[f] = code
    return ''.join(track)


def mouth_open(y: np.ndarray, sr: int, fps: float, n_frames: int, speech: list[tuple[float, float]]) -> np.ndarray:
    """0–1 per frame from the voice's loudness (smoothed), closed outside `speech` spans."""
    hop = sr / fps
    out = np.zeros(n_frames, dtype=np.float32)
    for f in range(n_frames):
        a = int(f * hop - hop * 0.5)
        b = int(f * hop + hop * 1.5)
        seg = y[max(0, a):max(0, b)]
        rms = float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0
        db = 20 * np.log10(rms + 1e-9)
        out[f] = np.clip((db + 46) / 30, 0, 1)
    # fast attack, slower release, like a jaw
    sm = np.zeros_like(out)
    for f in range(n_frames):
        prev = sm[f - 1] if f else 0.0
        k = 0.65 if out[f] > prev else 0.35
        sm[f] = prev + (out[f] - prev) * k
    mask = np.zeros(n_frames, dtype=bool)
    for a, b in speech:
        mask[max(0, int(a * fps) - 1):min(n_frames, int(np.ceil(b * fps)) + 1)] = True
    sm[~mask] = 0
    return np.round(sm ** 0.8, 3)
