# Claude Code skills

cuekitvoltz ships four [Claude Code](https://claude.com/claude-code) skills. They teach Claude to
build with the kit the way a motion designer and an editor would, and to check its own work before
calling a video done.

| Skill | Claude uses it to |
|---|---|
| `cuekitvoltz-setup` | set up a new project: ask about a theme (suggested palettes or your own), show the downloads with their sizes and fetch only what you approve, pick a default voice, write a starter video |
| `motion-director` | pick springs and easings, apply animation principles, choose transitions, stage isometric, character and 3D scenes, and time everything to the voice. It includes an API cheat sheet (`api.md`). |
| `voice-director` | write emotion-marked scripts, choose a voice, run the voice director, and build the video TTS-first on the result: sections, anchors, captions, lip-sync |
| `video-qa` | run layout QA on stills, scan the final render frame by frame, spot-check motion and sync, measure loudness, check content rules, and report what it looked at |

## Install

**As a plugin:**

```
/plugin marketplace add <owner>/cuekitvoltz
/plugin install cuekitvoltz@cuekitvoltz
```

Plugin skills are namespaced, so you can also call them directly: `/cuekitvoltz:cuekitvoltz-setup`,
`/cuekitvoltz:motion-director`, `/cuekitvoltz:voice-director` and `/cuekitvoltz:video-qa`.
Third-party marketplaces don't auto-update; run `claude plugin update cuekitvoltz@cuekitvoltz` for new
versions.

**Copied into your project** (to commit them with the code or edit them):

```bash
npx cuekitvoltz skills            # -> .claude/skills/{cuekitvoltz-setup,motion-director,voice-director,video-qa}
npx cuekitvoltz skills --force    # replace existing copies
```

**Working on this repo:** run `claude --plugin-dir .` to load the skills from `skills/` for a session.

## Using them

You don't have to name the skills. Claude picks them up from what you ask:

- "Make a 30 s vertical explainer of what happens when you press Enter, with a host who talks and
  captions." → voice-director writes and performs the script, motion-director builds the scenes on
  it, video-qa checks the stills and the render.
- "The cards feel floaty and cheap." → motion-director re-tunes the springs, adds anticipation,
  stagger and motion blur.
- "Check this video before I upload it." → video-qa.

**First run:** if `cuekitvoltz.config.json` isn't in the project yet, the motion and voice skills
hand over to `cuekitvoltz-setup` first, so your first prompt starts with a few setup questions. Nothing
is downloaded without your yes.

The skills assume a Remotion project with `cuekitvoltz` installed.
