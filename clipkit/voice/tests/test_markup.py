"""Markup parser tests. Pure standard library, so they run without the TTS models:

    python -m unittest discover -s voice/tests
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import markup  # noqa: E402

SCRIPT = """---
voice: cb-heart
gap: 0.5
---
# hook
[surprised] What happens when you press @enter *Enter*?
[narration] It takes {120 ms|one twenty milliseconds}, (pause 0.3) then the *black hole* wins.
{speed 1.1} [happy] Then the page just... [chuckle] shows up.
"""


class MarkupTest(unittest.TestCase):
    def setUp(self):
        self.script = markup.parse(SCRIPT)

    def test_settings(self):
        self.assertEqual(self.script.settings, {'voice': 'cb-heart', 'gap': 0.5})

    def test_sections_and_emotions(self):
        self.assertEqual([l.section for l in self.script.lines], ['hook', None, None])
        self.assertEqual([l.emotion for l in self.script.lines], ['surprised', 'narration', 'happy'])

    def test_anchor_and_emphasis_land_on_the_next_word(self):
        enter = self.script.lines[0].chunks[0].words[-1]
        self.assertEqual((enter.text, enter.emphasis, enter.anchors), ('Enter?', True, ['enter']))

    def test_multi_word_emphasis(self):
        words = self.script.lines[1].chunks[1].words
        self.assertEqual([w.text for w in words if w.emphasis], ['black', 'hole'])

    def test_pause_splits_the_line(self):
        chunks = self.script.lines[1].chunks
        self.assertEqual([c.pause_after for c in chunks], [0.3, 0.0])

    def test_shown_and_spoken(self):
        w = self.script.lines[1].chunks[0].words[-1]
        self.assertEqual((w.text, w.say), ('120 ms,', 'one twenty milliseconds'))
        self.assertIn('one twenty milliseconds', markup.kokoro_text(self.script.lines[1].chunks[0]))

    def test_per_line_speed(self):
        self.assertEqual(self.script.lines[2].speed, 1.1)

    def test_engine_text(self):
        line = self.script.lines[2]
        self.assertEqual(markup.turbo_text(line.chunks[0], line.emotion, True), '[happy] Then the page just... [chuckle] shows up.')
        self.assertEqual(markup.kokoro_text(line.chunks[0]), 'Then the page just... shows up.')
        self.assertEqual(markup.kokoro_text(self.script.lines[0].chunks[0]), 'What happens when you press [Enter](+2)?')

    def test_empty_script_is_an_error(self):
        with self.assertRaises(ValueError):
            markup.parse('---\nvoice: heart\n---\n// nothing to say\n')


if __name__ == '__main__':
    unittest.main()
