import React from 'react';
import { Composition, Still } from 'remotion';
import { ShowcaseEnter, ENTER_DURATION } from './showcase-enter/ShowcaseEnter';
import { ShowcaseProduct, PRODUCT_DURATION } from './showcase-product/ShowcaseProduct';
import { ShowcaseKit, KIT_DURATION } from './showcase-kit/ShowcaseKit';
import { BlackHoleFall, BH_DURATION } from './bh-fall/BlackHoleFall';
import { RingAd, RING_DURATION, RING_FPS } from './ring-ad/RingAd';
import { Baseline, BASELINE_DURATION } from './lab/Baseline';
import { BaselineAfter } from './lab/BaselineAfter';
import { KitLab, KIT_LAB_DURATION } from './lab/KitLab';
import { MotionPresets, MOTION_PRESETS_DURATION } from './lab/MotionPresets';
import { TransitionsBoard, TRANSITIONS_BOARD_DURATION } from './lab/TransitionsBoard';
import { TransitionsReel, REEL_DURATION } from './lab/TransitionsReel';
import { WorldIso, WORLD_ISO_DURATION } from './lab/WorldIso';
import { WorldCharacters, WORLD_CHARACTERS_DURATION } from './lab/WorldCharacters';
import { LookSolo, WorldLooks, WORLD_LOOKS_DURATION } from './lab/WorldLooks';
import { WorldReel, WORLD_REEL_DURATION } from './lab/WorldReel';
import { ThreeMaterials, THREE_MATERIALS_DURATION } from './lab/ThreeMaterials';
import { ThreeType, THREE_TYPE_DURATION } from './lab/ThreeType';
import { ThreeReel, THREE_REEL_DURATION } from './lab/ThreeReel';
import { GemLab } from './lab/GemLab';
import { QaFixture } from './lab/QaFixture';
import { GlProbe } from './lab/GlProbe';

const vertical = { fps: 30, width: 1080, height: 1920 } as const;
const landscape = { fps: 30, width: 1920, height: 1080 } as const;

export const RemotionRoot: React.FC = () => (
  <>
    {/* Showcases: TTS-first videos built on the voice director (script.vo.md -> vo.json) */}
    <Composition id="showcase-enter" component={ShowcaseEnter} durationInFrames={ENTER_DURATION} {...vertical} defaultProps={{ music: true }} />
    <Composition id="showcase-product" component={ShowcaseProduct} durationInFrames={PRODUCT_DURATION} {...vertical} defaultProps={{ music: true }} />
    <Composition id="showcase-kit" component={ShowcaseKit} durationInFrames={KIT_DURATION} {...landscape} defaultProps={{ music: true }} />
    <Composition id="bh-fall" component={BlackHoleFall} durationInFrames={BH_DURATION} {...vertical} defaultProps={{ music: true }} />
    <Composition id="ring-ad" component={RingAd} durationInFrames={RING_DURATION} fps={RING_FPS} width={1080} height={1920} defaultProps={{ music: true }} />

    {/* Boards and reels, one per module */}
    <Composition id="kit-lab" component={KitLab} durationInFrames={KIT_LAB_DURATION} {...landscape} />
    <Composition id="lab-baseline" component={Baseline} durationInFrames={BASELINE_DURATION} {...vertical} />
    <Composition id="lab-after" component={BaselineAfter} durationInFrames={BASELINE_DURATION} {...vertical} />
    <Composition id="kit-motion" component={MotionPresets} durationInFrames={MOTION_PRESETS_DURATION} {...landscape} />
    <Composition id="kit-transitions" component={TransitionsBoard} durationInFrames={TRANSITIONS_BOARD_DURATION} {...landscape} />
    <Composition id="kit-reel-transitions" component={TransitionsReel} durationInFrames={REEL_DURATION} {...vertical} />
    <Composition id="kit-iso" component={WorldIso} durationInFrames={WORLD_ISO_DURATION} {...landscape} />
    <Composition id="kit-characters" component={WorldCharacters} durationInFrames={WORLD_CHARACTERS_DURATION} {...landscape} />
    <Composition id="kit-looks" component={WorldLooks} durationInFrames={WORLD_LOOKS_DURATION} {...landscape} />
    <Composition id="kit-look-print" component={LookSolo} durationInFrames={WORLD_LOOKS_DURATION} {...landscape} defaultProps={{ pack: 'print' as const }} />
    <Composition id="kit-reel-world" component={WorldReel} durationInFrames={WORLD_REEL_DURATION} {...vertical} />
    <Composition id="kit-3d-materials" component={ThreeMaterials} durationInFrames={THREE_MATERIALS_DURATION} {...landscape} />
    <Composition id="kit-3d-type" component={ThreeType} durationInFrames={THREE_TYPE_DURATION} {...landscape} defaultProps={{ blur: 12 }} />
    <Composition id="kit-reel-3d" component={ThreeReel} durationInFrames={THREE_REEL_DURATION} {...vertical} />
    <Composition id="kit-gem" component={GemLab} durationInFrames={120} {...landscape} />

    {/* Tooling checks */}
    <Still id="qa-fixture" component={QaFixture} {...vertical} />
    <Still id="gl-probe" component={GlProbe} width={1200} height={200} />
  </>
);
