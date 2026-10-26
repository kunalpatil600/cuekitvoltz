# Third-party notices

cuekitvoltz's own code is MIT (see [LICENSE](LICENSE)). It builds on, bundles or downloads the
following, each under its own license.

## Peer dependencies (installed by you, not bundled)

| Project | License | Note |
|---|---|---|
| [Remotion](https://www.remotion.dev) | [Remotion License](https://www.remotion.dev/license) | Source-available, not open source. Free for individuals and companies of up to 3 people; larger companies need a company license. |
| [React](https://react.dev) | MIT | |
| [three.js](https://threejs.org) | MIT | includes the opentype.js build `Text3D` uses to read fonts (MIT) |
| [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) | MIT | |
| [Lucide](https://lucide.dev) | ISC | optional; icon nodes for `Icon3D` and the examples |

## Fonts

- **Geist and Geist Mono** (The Geist Project Authors) and **Instrument Serif** (The Instrument Serif
  Project Authors) are under the SIL Open Font License 1.1.
- `kitFonts` loads them at render time from Google Fonts through `@remotion/google-fonts`.
- The theme font pairings use Inter, Newsreader, JetBrains Mono, Space Grotesk, Fraunces, Space Mono,
  IBM Plex Sans/Serif/Mono, DM Sans, DM Serif Display and DM Mono, all under the SIL Open Font
  License 1.1, loaded the same way.
- The examples also ship two `.ttf` files in `public/fonts/` for `Text3D`, with the license in
  [`public/fonts/OFL.txt`](public/fonts/OFL.txt).

## Voice director (Python, installed by `npx cuekitvoltz download voice`)

| Project | License | Note |
|---|---|---|
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | Apache 2.0 | TTS model and voices; downloaded on first use |
| [Chatterbox-Turbo](https://github.com/resemble-ai/chatterbox) (Resemble AI) | MIT | TTS model; its output carries Resemble's inaudible PerTh watermark |
| [misaki](https://github.com/hexgrad/misaki) | Apache 2.0 | grapheme-to-phoneme, used for Kokoro and for visemes |
| [torchaudio](https://github.com/pytorch/audio) WAV2VEC2_ASR_BASE_960H | BSD-2-Clause (torchaudio); the model weights come from fairseq (MIT) | forced alignment and the hear-back check |
| [spaCy](https://spacy.io) en_core_web_sm | MIT | used by misaki |
| librosa, pyloudnorm, soundfile, NumPy | ISC, MIT, BSD-3-Clause, BSD-3-Clause | audio processing |

## Example assets

- `public/sfx/` and `public/music/` were generated procedurally for this project and are part of it
  (MIT).
- `public/voice/` holds synthetic voice tracks made with Kokoro and Chatterbox-Turbo. No real
  person's voice was used or cloned.
- `voice/refs/ref-af_heart.wav` is a clip of Kokoro's `af_heart` voice. It prompts the `cb-heart`
  Chatterbox voice.
