# Rendering and GPU

```bash
npx cuekitvoltz render <id>                 # software WebGL, concurrency 2
npx cuekitvoltz render <id> --gpu           # Chrome for Testing + Vulkan, concurrency 1
npx cuekitvoltz render <id> --gpu --scale 2 # twice the size (1080×1920 -> 2160×3840) into <id>@2x.mp4
```

Renders land in `renders/<id>/` as H.264 (CRF 17, yuv420p) with AAC audio, loudness-normalised to
−14 LUFS / −1 dBTP with faststart. `--cover <frame>` adds a PNG still for thumbnails, `--props '{json}'`
passes input props, and `--no-loudnorm` skips normalisation. Plain `npx remotion render` works too:
you just don't get the loudness pass.

## Software or GPU

Remotion's default headless browser has no GPU path on Linux, so WebGL runs in software there
(`swangle`). It renders the same pixels as a GPU, only slower. For 2D and light 3D, that's the
fastest option, because Chrome for Testing adds about 0.3 s per frame of overhead.

Heavy 3D (`Scene3D` with several blur samples, depth of field and bloom) is where the GPU pays off.
Chrome for Testing reaches the GPU through Vulkan:

```bash
npx remotion render <id> out.mp4 --gl=vulkan --chrome-mode=chrome-for-testing --concurrency=1
npx cuekitvoltz stills <id> <frames...> --gpu
```

On a laptop RTX 2050, a kit 3D frame with 6–12 blur samples took ~0.25 s on the GPU against ~9 s in
software. The first `--gpu` run downloads Chrome for Testing (~190 MB).

`node scripts/gl-probe.mjs` (in this repo) reports which WebGL backends work on your machine and how
long a 3D frame takes with each.

## Keep concurrency at 1 on the GPU

With two tabs sharing the GPU compositor, Chrome for Testing dropped tiles of the
perspective-warped screen overlays (blank or partial laptop screens) and once duplicated horizontal
strips. One tab is clean, and it was also faster. `--gpu` forces concurrency 1.

## Memory

- Each tab holds a full browser page; on an 8 GB machine, more than 2 tabs can run out of memory.
- `MotionBlur` with many samples plus full-frame grain is the heaviest combination: render it at
  `--concurrency 1`.
- Bundles are written to the OS temp folder and deleted afterwards. A crashed run can leave a
  `remotion-*` folder behind; on Linux, `/tmp` is often RAM, so clear them.
- Footage-heavy videos: pass `--video-cache 512` (MB). Remotion sizes the `OffthreadVideo` frame
  cache from free RAM, and a too-small cache throws "No frame found at position" mid-render.
