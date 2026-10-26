import path from 'node:path';
import { Config } from '@remotion/cli/config';

// The examples import the kit by its package name, as your project would; inside this repo that name
// points at the source in src/.
Config.setEntryPoint('examples/index.ts');
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: { ...config.resolve, alias: { ...(config.resolve?.alias as object), cuekitvoltz$: path.resolve(process.cwd(), 'src/index.ts') } },
}));

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setCrf(17);
Config.setPixelFormat('yuv420p');
// WebGL in Remotion's default headless shell runs in software (swangle) on machines without a GPU
// path; for heavy 3D use the GPU instead: npm run render -- <id> --gpu (see docs/rendering.md).
Config.setChromiumOpenGlRenderer('swangle');
