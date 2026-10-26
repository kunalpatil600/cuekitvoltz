# Changelog

## 0.1.0 (unreleased)

The first public version.

- **Motion:** closed-form springs and presets, tweens, keyframes, anticipation, follow-through,
  stagger, squash and stretch. `Move` (velocity-driven motion blur), `MotionBlur` (sub-frame) and
  `Split` (kinetic type).
- **Transitions:** `Scenes` / `Scene` / `Cut` with push, whip, wipe, iris, shape, blob, zoomThrough,
  matchZoom, lightLeak, dip and crossfade. Magic Move (`Shared`) and shape morphing (`Morph`).
- **Visual world:** the isometric kit and tech objects, the character rig with gestures and visemes,
  `Stick` and space scenery, and the film, print and duotone style packs.
- **3D:** `Scene3D` with sub-frame motion blur, bloom, depth of field and tone mapping. Camera rigs,
  procedural studios, PBR materials, `Icon3D`, `Text3D`, `Extrude3D`, device mockups with
  `ScreenOverlay` and `Pin3D`, and the ray-traced `Gem`.
- **Voice:** the Python voice director (emotion markup, Kokoro and Chatterbox-Turbo, forced
  alignment, lip-sync, hear-back check). On the kit side: `voiceTrack`, `voiceScenes` and `Captions`.
- **QA:** `Stage` safe areas and layout inspection.
- **Setup and themes:** `init` (theme, downloads with sizes and consent, default voice, starter
  video), `doctor`, `theme presets|add|list|use|build` (six suggested palettes, custom palettes with
  contrast checks, five OFL font pairings, one folder per theme), `download`, `voice-samples`,
  `config` and `starter`. The `Theme` also carries iso colours, a 3D studio, a backdrop and caption
  colours, which `<Stage theme>` passes to every component.
- **CLI:** `stills`, `render`, `direct`, `hear` and `skills`.
- **Claude Code skills:** `cuekitvoltz-setup`, `motion-director`, `voice-director` and `video-qa`,
  also installable as a plugin.
- **Examples:** five showcases and fifteen boards.
