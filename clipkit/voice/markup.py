"""cuekitvoltz voice script markup (.vo.md): emotion, pauses, emphasis and sync anchors.

    ---
    voice: cb-heart        # a preset from engines.py VOICES
    speed: 1.0             # Kokoro speaking rate
    gap: 0.35              # silence between lines, seconds
    lead: 0.4              # silence before the first line
    tail: 0.8              # silence after the last line
    ---
    # hook                                   a section: the video reads its start with at('hook')
    [surprised] What happens when you press @enter *Enter*?
    [narration] Your browser asks a DNS server, (pause 0.3) where does this site live?
    {speed 1.1} [happy] Then the page just... [chuckle] shows up.

Per line:
    [emotion]      at the start: happy, surprised, dramatic, sarcastic, whispering, angry, fear,
                   crying, narration, advertisement. Chatterbox-Turbo performs it; Kokoro, which has no
                   emotion control, gets a matching pace instead.
    [laugh] …      anywhere: laugh, chuckle, sigh, gasp, groan, cough, sniff, clear throat, shush
                   (Chatterbox-Turbo only; dropped for Kokoro).
    (pause 0.4)    a silence of that many seconds inside the line.
    *word*         emphasis: Kokoro stresses it; captions can colour it.
    {120 ms|one twenty milliseconds}   shown as the first part, spoken as the second.
    @name          a sync anchor on the next word: the video reads its time with at('name').
    {speed 1.1}    per-line Kokoro speed. {voice heart} per-line voice. {gap 0.8} silence before it.
    // comment     ignored.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

EMOTIONS = {'happy', 'surprised', 'dramatic', 'sarcastic', 'whispering', 'angry', 'fear', 'crying', 'narration', 'advertisement'}
NONVERBAL = {'laugh', 'chuckle', 'sigh', 'gasp', 'groan', 'cough', 'sniff', 'clear throat', 'shush'}
# Kokoro can't act, so an emotion becomes a pace (and Turbo gets the tag itself)
KOKORO_PACE = {'happy': 1.06, 'surprised': 1.08, 'dramatic': 0.92, 'sarcastic': 0.97, 'whispering': 0.94,
               'angry': 1.05, 'fear': 1.04, 'crying': 0.9, 'narration': 1.0, 'advertisement': 1.08}


@dataclass
class Word:
    text: str                      # as displayed (punctuation kept)
    emphasis: bool = False
    anchors: list[str] = field(default_factory=list)
    say: str | None = None         # how it's spoken, when that differs from `text`

    @property
    def spoken(self) -> str:
        return self.say or self.text


@dataclass
class Chunk:
    """A run of a line between pauses: synthesized in one go."""
    words: list[Word]
    tags: list[tuple[int, str]]    # (index of the word the nonverbal comes before, tag)
    pause_after: float = 0.0


@dataclass
class Line:
    section: str | None
    emotion: str | None
    chunks: list[Chunk]
    speed: float | None = None
    voice: str | None = None
    gap: float | None = None
    source: str = ''

    @property
    def text(self) -> str:
        return ' '.join(w.text for c in self.chunks for w in c.words)


@dataclass
class Script:
    settings: dict
    lines: list[Line]


DIRECTIVE = re.compile(r'\{\s*(speed|voice|gap)\s+([^}\s]+)\s*\}')
PAUSE = re.compile(r'\(\s*pause\s+(\d+(?:\.\d+)?)\s*\)')
TAG = re.compile(r'\[([a-z ]+)\]')


def _num(v: str):
    try:
        return float(v) if '.' in v else int(v)
    except ValueError:
        return v


TOKEN = re.compile(r'(\{[^}|]+\|[^}]+\})|(\[[a-z ]+\])|(\S+)')


def parse_chunk(text: str) -> Chunk:
    words: list[Word] = []
    tags: list[tuple[int, str]] = []
    pending: list[str] = []
    in_emph = False  # *emphasis* may span several words: *black hole*
    for m in TOKEN.finditer(text):
        sayso, tag, tok = m.groups()
        if tag:
            name = tag[1:-1]
            if name in NONVERBAL:
                tags.append((len(words), name))
            elif name in EMOTIONS:
                raise ValueError(f'emotion [{name}] must open the line')
            else:
                raise ValueError(f'unknown tag [{name}]')
            continue
        if sayso:
            shown, spoken = sayso[1:-1].split('|', 1)
            words.append(Word(shown.strip(), in_emph, pending, spoken.strip()))
            pending = []
            continue
        if words and not re.search(r'[\w@*]', tok):  # bare punctuation belongs to the word before it
            words[-1].text += tok
            continue
        anchors = re.findall(r'@([A-Za-z0-9_-]+)', tok)
        tok = re.sub(r'@[A-Za-z0-9_-]+', '', tok)
        if not tok:  # "@name" on its own: anchors the next word
            pending += anchors
            continue
        m2 = re.fullmatch(r'(\W*?)(\*?)(.*?)(\*?)(\W*)', tok)
        lead, opens, core, closes, trail = m2.groups() if m2 else ('', '', tok, '', '')
        emph = in_emph or bool(opens)
        if opens and not closes:
            in_emph = True
        if closes:
            in_emph = False
        words.append(Word(lead + core + trail, emph, pending + anchors))
        pending = []
    if pending:
        raise ValueError(f'anchor @{pending[0]} has no word after it')
    if in_emph:
        raise ValueError('an *emphasis* is never closed')
    return Chunk(words, tags)


def parse_line(raw: str, section: str | None) -> Line:
    text = raw.strip()
    opts: dict = {}
    for m in DIRECTIVE.finditer(text):
        opts[m.group(1)] = _num(m.group(2))
    text = DIRECTIVE.sub('', text).strip()
    emotion = None
    m = re.match(r'\[([a-z ]+)\]\s*', text)
    if m and m.group(1) in EMOTIONS:
        emotion, text = m.group(1), text[m.end():]
    parts = PAUSE.split(text)
    chunks: list[Chunk] = []
    for i in range(0, len(parts), 2):
        seg = parts[i].strip()
        pause = float(parts[i + 1]) if i + 1 < len(parts) else 0.0
        if seg:
            c = parse_chunk(seg)
            c.pause_after = pause
            chunks.append(c)
        elif chunks:
            chunks[-1].pause_after += pause
    if not chunks:
        raise ValueError('empty line')
    return Line(section, emotion, chunks, opts.get('speed'), opts.get('voice'), opts.get('gap'), raw.strip())


def parse(text: str) -> Script:
    settings: dict = {}
    body = text
    if text.lstrip().startswith('---'):
        _, front, body = text.lstrip().split('---', 2)
        for row in front.strip().splitlines():
            row = row.split('#', 1)[0].strip()
            if ':' in row:
                k, v = row.split(':', 1)
                settings[k.strip()] = _num(v.strip())
    lines: list[Line] = []
    section = None
    pending_section = None
    for n, raw in enumerate(body.splitlines(), 1):
        row = raw.strip()
        if not row or row.startswith('//'):
            continue
        if row.startswith('#'):
            section = pending_section = row.lstrip('#').strip()
            continue
        try:
            line = parse_line(row, pending_section)
        except ValueError as e:
            raise ValueError(f'line {n}: {e}: {row}') from None
        lines.append(line)
        pending_section = None
    if not lines:
        raise ValueError('the script has no lines')
    return Script(settings, lines)


def load(path: Path) -> Script:
    return parse(path.read_text())


# ---------------------------------------------------------------- engine text
def kokoro_text(chunk: Chunk) -> str:
    """Kokoro/misaki input: emphasis as a stress bump, nonverbal tags dropped."""
    def stressed(w: Word) -> str:
        m = re.fullmatch(r'(\W*)(.*?)(\W*)', w.spoken)
        return f'{m.group(1)}[{m.group(2)}](+2){m.group(3)}' if w.emphasis and m and m.group(2) else w.spoken
    return ' '.join(stressed(w) for w in chunk.words)


def turbo_text(chunk: Chunk, emotion: str | None, first: bool) -> str:
    """Chatterbox-Turbo input: the emotion tag opens each chunk, nonverbal tags sit where they were written."""
    out: list[str] = [f'[{emotion}]'] if emotion else []
    by_index: dict[int, list[str]] = {}
    for i, tag in chunk.tags:
        by_index.setdefault(i, []).append(f'[{tag}]')
    for i, w in enumerate(chunk.words):
        out += by_index.get(i, [])
        out.append(w.spoken)
    out += by_index.get(len(chunk.words), [])
    return ' '.join(out)
