"""cuekitvoltz voice director: a marked-up script in, a timed voice track and its sync data out.

    npx cuekitvoltz direct path/to/script.vo.md [--voice NAME] [--fps 30] [--fresh] [--public public]
    (= <venv python> voice/direct.py ...; run it from your Remotion project's root)

Writes
    public/voice/<id>.wav        the voice-over, lines laid end to end (TTS-first: the video follows it)
    <script folder>/vo.json      sections, anchors, every word's time, and per-frame mouth curves

<id> is the script's folder name for script.vo.md, else the file name (intro.vo.md -> intro). The
video imports vo.json and syncs to it with the kit's voiceTrack(): at('section' | 'anchor'), captions,
and lip-sync for <Character>. Markup: see markup.py. Each line is synthesized once and cached (see
engines.cache_dir) by its text, voice and settings, so editing one line re-renders only that line.
Chatterbox lines are seeded from their text, so re-runs are identical.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import zlib
from pathlib import Path

import numpy as np
import soundfile as sf

import markup
from align import align
from lipsync import mouth_open, phonemes, visemes
from engines import DEFAULT_VOICE, SR, VOICES, Chatterbox, Kokoro, cache_dir, free, level, reference_clip

CACHE = cache_dir() / 'clips'


def project_voice() -> str | None:
    """The default voice picked during setup (cuekitvoltz.config.json in the current folder)."""
    try:
        return json.loads(Path('cuekitvoltz.config.json').read_text()).get('voice', {}).get('preset')
    except (OSError, ValueError, AttributeError):
        return None


def shown(p: Path) -> str:
    try:
        return str(p.relative_to(Path.cwd()))
    except ValueError:
        return str(p)


def job_key(*parts) -> str:
    return hashlib.sha1(json.dumps(parts).encode()).hexdigest()[:16]


def synthesize(jobs: list[dict], fresh: bool) -> None:
    """Fill job['raw'] = (audio, sr), loading each engine once and reusing cached clips."""
    CACHE.mkdir(parents=True, exist_ok=True)
    todo = []
    for j in jobs:
        f = CACHE / f"{j['key']}.wav"
        if f.exists() and not fresh:
            y, sr = sf.read(f, dtype='float32')
            j['raw'] = (y, sr)
        else:
            todo.append(j)
    for preset in sorted({j['preset'] for j in todo}):
        batch = [j for j in todo if j['preset'] == preset]
        spec = VOICES[preset]
        print(f'  synthesizing {len(batch)} clip(s) with {preset} ({spec["desc"]})')
        if spec['engine'] == 'kokoro':
            engine = Kokoro()
            for j in batch:
                y, sr, _ = engine.say(j['text'], spec['voice'], speed=j['speed'])
                j['raw'] = (y, sr)
        else:
            ref = reference_clip(spec['ref']) if spec['ref'] else None
            engine = Chatterbox()
            for j in batch:
                y, sr, _ = engine.say(j['text'], ref, seed=j['seed'])
                j['raw'] = (y, sr)
        free(engine)
        for j in batch:
            sf.write(CACHE / f"{j['key']}.wav", j['raw'][0], j['raw'][1], subtype='FLOAT')


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('script')
    ap.add_argument('--id', help='video id (default: the folder of script.vo.md, else the file name)')
    ap.add_argument('--public', default='public', help="your project's public folder (default: ./public)")
    ap.add_argument('--out', help='where to write vo.json (default: next to the script)')
    ap.add_argument('--voice', choices=sorted(VOICES), help="override the script's voice (default: the script's, else the project's from setup)")
    ap.add_argument('--fps', type=float)
    ap.add_argument('--fresh', action='store_true', help='ignore the clip cache')
    args = ap.parse_args()

    path = Path(args.script).resolve()
    vid = args.id or (path.parent.name if path.name == 'script.vo.md' else path.name.split('.')[0])
    public = Path(args.public).resolve()
    try:
        script = markup.load(path)
    except ValueError as e:
        sys.exit(f'{path.name}: {e}')
    st = script.settings
    voice = args.voice or st.get('voice') or project_voice() or DEFAULT_VOICE
    fps = args.fps or float(st.get('fps', 30))
    gap, lead, tail = float(st.get('gap', 0.35)), float(st.get('lead', 0.4)), float(st.get('tail', 0.8))
    base_speed = float(st.get('speed', 1.0))
    if voice not in VOICES:
        sys.exit(f'unknown voice {voice}; presets: {", ".join(sorted(VOICES))}')
    print(f'{vid}: {len(script.lines)} lines · voice {voice}')

    # one synthesis job per chunk (the runs between pauses)
    jobs = []
    for li, line in enumerate(script.lines):
        preset = line.voice or voice
        engine = VOICES[preset]['engine']
        for ci, ch in enumerate(line.chunks):
            if engine == 'kokoro':
                text = markup.kokoro_text(ch)
                speed = (line.speed or base_speed) * markup.KOKORO_PACE.get(line.emotion or '', 1.0)
            else:
                text, speed = markup.turbo_text(ch, line.emotion, ci == 0), 1.0
            seed = zlib.crc32(text.encode()) % (2 ** 31)
            jobs.append({'line': li, 'chunk': ci, 'preset': preset, 'text': text, 'speed': round(speed, 3), 'seed': seed,
                         'key': job_key(preset, text, round(speed, 3), seed)})
    synthesize(jobs, args.fresh)

    # trim, level, resample; then align each clip to its words
    import librosa
    for j in jobs:
        y, sr = j['raw']
        y = y if y.ndim == 1 else y.mean(axis=1)
        _, (a, b) = librosa.effects.trim(y, top_db=40)
        y = y[a:b]
        y = librosa.resample(y, orig_sr=sr, target_sr=SR) if sr != SR else y
        j['y'] = level(y.astype(np.float32))
    print('  aligning words')
    for j in jobs:
        ch = script.lines[j['line']].chunks[j['chunk']]
        j['times'] = align(j['y'], SR, [w.spoken for w in ch.words])

    # lay the lines end to end
    t = lead
    placed, out_lines, sections, anchors, speech, timed_words = [], [], {}, {}, [], []
    for li, line in enumerate(script.lines):
        if li:
            t += line.gap if line.gap is not None else gap
        start = t
        words_out = []
        for ci, ch in enumerate(line.chunks):
            j = next(x for x in jobs if x['line'] == li and x['chunk'] == ci)
            placed.append((t, j['y']))
            for w, (a, b) in zip(ch.words, j['times']):
                s, e = round(t + a, 3), round(t + b, 3)
                words_out.append([w.text, s, e, 1 if w.emphasis else 0] + ([w.say] if w.say else []))
                for name in w.anchors:
                    anchors[name] = s
                speech.append((s, e))
                timed_words.append((w.spoken, s, e, phonemes(w.spoken)))
            t += len(j['y']) / SR + ch.pause_after
        end = t - line.chunks[-1].pause_after
        if line.section:
            sections[line.section] = round(start, 3)
        out_lines.append({'section': line.section, 'emotion': line.emotion, 'start': round(start, 3), 'end': round(end, 3), 'text': line.text, 'words': words_out})
    duration = t + tail
    clash = sorted(set(anchors) & set(sections))
    if clash:
        sys.exit(f'{path.name}: {", ".join(clash)} names both a section and an anchor; rename one (the video reads both with at())')

    track = np.zeros(int(duration * SR) + 1, dtype=np.float32)
    for s0, y in placed:
        i = int(s0 * SR)
        track[i:i + len(y)] += y[:len(track) - i]
    n_frames = int(np.ceil(duration * fps))
    data = {
        'version': 1, 'id': vid, 'voice': voice, 'fps': fps, 'duration': round(duration, 3), 'audio': f'voice/{vid}.wav',
        'sections': sections, 'anchors': anchors, 'lines': out_lines,
        'mouth': {'open': mouth_open(track, SR, fps, n_frames, speech).tolist(), 'visemes': visemes(n_frames, fps, timed_words)},
    }
    wav = public / 'voice' / f'{vid}.wav'
    wav.parent.mkdir(parents=True, exist_ok=True)
    sf.write(wav, np.stack([track, track], axis=1), SR, subtype='PCM_16')
    js = Path(args.out).resolve() if args.out else path.parent / 'vo.json'
    js.write_text(json.dumps(data, separators=(',', ':')) + '\n')

    for l in out_lines:
        print(f"  {l['start']:6.2f}–{l['end']:6.2f} s  {('[' + l['emotion'] + ']') if l['emotion'] else '':14} {l['text'][:64]}")
    print(f'  {duration:.2f} s · {n_frames} frames at {fps:g} fps · anchors: {", ".join(anchors) or "none"}')
    print(f'  -> {shown(wav)}\n  -> {shown(js)}')


if __name__ == '__main__':
    main()
