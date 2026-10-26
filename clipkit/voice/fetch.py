"""Downloads the voice models up front, so the first `direct` doesn't stall on a 4 GB download.

    <venv python> voice/fetch.py [--kokoro] [--aligner] [--chatterbox]

Only downloads; nothing is loaded onto the GPU except the aligner, which torchaudio can only fetch
by building it (about 400 MB of RAM, released right after).
"""
from __future__ import annotations

import argparse

from engines import VOICES

KOKORO_REPO = 'hexgrad/Kokoro-82M'
CHATTERBOX_REPO = 'ResembleAI/chatterbox-turbo'


def kokoro() -> None:
    from huggingface_hub import hf_hub_download
    from kokoro.model import KModel
    print('Kokoro-82M (~320 MB)')
    hf_hub_download(KOKORO_REPO, 'config.json')
    hf_hub_download(KOKORO_REPO, KModel.MODEL_NAMES[KOKORO_REPO])
    for v in sorted({p['voice'] for p in VOICES.values() if p['engine'] == 'kokoro'} | {p['ref'] for p in VOICES.values() if p.get('ref')}):
        hf_hub_download(KOKORO_REPO, f'voices/{v}.pt')


def aligner() -> None:
    import torchaudio
    print('wav2vec2 word aligner (~360 MB)')
    model = torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H.get_model()
    del model


def chatterbox() -> None:
    from huggingface_hub import snapshot_download
    print('Chatterbox-Turbo (~4.6 GB)')
    # the same files ChatterboxTurboTTS.from_pretrained() asks for
    snapshot_download(repo_id=CHATTERBOX_REPO, allow_patterns=['*.safetensors', '*.json', '*.txt', '*.pt', '*.model'])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--kokoro', action='store_true')
    ap.add_argument('--aligner', action='store_true')
    ap.add_argument('--chatterbox', action='store_true')
    a = ap.parse_args()
    if not (a.kokoro or a.aligner or a.chatterbox):
        a.kokoro = a.aligner = True
    if a.kokoro:
        kokoro()
    if a.aligner:
        aligner()
    if a.chatterbox:
        chatterbox()
    print('models ready')


if __name__ == '__main__':
    main()
