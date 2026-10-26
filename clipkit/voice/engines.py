"""Voice presets and the two TTS engines the voice director drives.

Voices are presets (VOICES below): Kokoro's built-in voices, or Chatterbox-Turbo speaking with its
built-in voice or with a reference clip that Kokoro generated. Every voice is synthetic: no real
person's voice is cloned, and the presets are built so that it can't happen by accident.
"""
from __future__ import annotations

import gc
import os
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
SR = 48000

# name -> engine + settings. `ref` = the Kokoro voice that makes the Chatterbox reference clip.
VOICES: dict[str, dict] = {
    'heart': {'engine': 'kokoro', 'voice': 'af_heart', 'desc': 'Kokoro · American female (grade A)'},
    'bella': {'engine': 'kokoro', 'voice': 'af_bella', 'desc': 'Kokoro · American female (A-)'},
    'michael': {'engine': 'kokoro', 'voice': 'am_michael', 'desc': 'Kokoro · American male (C+)'},
    'fenrir': {'engine': 'kokoro', 'voice': 'am_fenrir', 'desc': 'Kokoro · American male (C+)'},
    'puck': {'engine': 'kokoro', 'voice': 'am_puck', 'desc': 'Kokoro · American male (C+)'},
    'emma': {'engine': 'kokoro', 'voice': 'bf_emma', 'desc': 'Kokoro · British female (B-)'},
    'cb-builtin': {'engine': 'chatterbox', 'ref': None, 'desc': 'Chatterbox-Turbo · its built-in voice'},
    'cb-heart': {'engine': 'chatterbox', 'ref': 'af_heart', 'desc': 'Chatterbox-Turbo · female (from Kokoro af_heart)'},
    'cb-michael': {'engine': 'chatterbox', 'ref': 'am_michael', 'desc': 'Chatterbox-Turbo · male (from Kokoro am_michael)'},
    'cb-fenrir': {'engine': 'chatterbox', 'ref': 'am_fenrir', 'desc': 'Chatterbox-Turbo · male (from Kokoro am_fenrir)'},
}
DEFAULT_VOICE = 'heart'

REF_TEXT = (
    "Welcome back. Today we're looking at something genuinely wild: a small idea in how computers think "
    "that could change the way we build software. And honestly? It's kind of fun."
)


def cache_dir() -> Path:
    """Clip cache and generated reference clips: $CUEKITVOLTZ_CACHE, else ~/.cache/cuekitvoltz/voice."""
    d = Path(os.environ.get('CUEKITVOLTZ_CACHE', Path.home() / '.cache' / 'cuekitvoltz' / 'voice'))
    d.mkdir(parents=True, exist_ok=True)
    return d


def device() -> str:
    """cuda, then Apple's mps, then cpu ($CUEKITVOLTZ_DEVICE overrides)."""
    if os.environ.get('CUEKITVOLTZ_DEVICE'):
        return os.environ['CUEKITVOLTZ_DEVICE']
    import torch
    if torch.cuda.is_available():
        return 'cuda'
    if getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available():
        return 'mps'
    return 'cpu'


def norm_word(w: str) -> str:
    import re
    return re.sub(r'[^a-z0-9]', '', w.lower())


# say() -> (audio, sample_rate, words); words = [(text, start_s, end_s)] or None if the engine has no timing
class Kokoro:
    def __init__(self):
        from kokoro import KPipeline
        self.KPipeline = KPipeline
        self.pipes: dict[str, object] = {}

    def say(self, text: str, voice: str, seed: int = 0, speed: float = 1.0):
        lang = voice[0]  # 'a' = American, 'b' = British
        if lang not in self.pipes:
            self.pipes[lang] = self.KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M', device=device())
        chunks, words, offset = [], [], 0.0
        for result in self.pipes[lang](text, voice=voice, speed=speed):
            audio = np.asarray(result.audio, dtype=np.float32)
            for t in result.tokens or []:
                if t.start_ts is not None and norm_word(t.text):
                    words.append((t.text, offset + t.start_ts, offset + (t.end_ts or t.start_ts)))
            chunks.append(audio)
            offset += len(audio) / 24000
        return np.concatenate(chunks), 24000, words


class Chatterbox:
    def __init__(self):
        from chatterbox.tts_turbo import ChatterboxTurboTTS
        self.model = ChatterboxTurboTTS.from_pretrained(device=device())

    def say(self, text: str, ref: Path | None, seed: int = 0, speed: float = 1.0):  # speed: Kokoro only
        import torch
        torch.manual_seed(seed)  # Turbo samples tokens; a fixed seed per line keeps re-runs identical
        with torch.inference_mode():
            wav = self.model.generate(text, audio_prompt_path=str(ref) if ref else None)
        return wav.squeeze(0).float().cpu().numpy(), self.model.sr, None


def free(engine) -> None:
    import torch
    del engine
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def reference_clip(kokoro_voice: str) -> Path:
    """A ~10 s clip of a Kokoro voice, used as Chatterbox's voice prompt. af_heart ships in refs/;
    others are generated once into the cache."""
    shipped = HERE / 'refs' / f'ref-{kokoro_voice}.wav'
    if shipped.exists():
        return shipped
    out = cache_dir() / f'ref-{kokoro_voice}.wav'
    if not out.exists():
        k = Kokoro()
        audio, sr, _ = k.say(REF_TEXT, kokoro_voice)
        sf.write(out, audio, sr)
        free(k)
    return out


def level(y: np.ndarray, lufs: float = -18.0) -> np.ndarray:
    import pyloudnorm as pyln
    loud = pyln.Meter(SR).integrated_loudness(y) if len(y) > SR * 0.4 else -30.0
    return (y * 10 ** ((lufs - loud) / 20)).astype(np.float32)
