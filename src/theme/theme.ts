import { createContext, useContext } from 'react';
import { kitFonts } from './fonts';
import type { Backdrop3D } from '../three/Scene3D';
import type { StudioName, StudioSpec } from '../three/studio';
import type { IsoColors } from '../world/iso/objects';

// Design tokens every kit component reads through useTheme(), so a brand swaps in one object: colours
// and fonts, plus the defaults for iso objects, 3D light and background, and captions.
export type Theme = {
  name: string;
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  /** Gradient stops for the one highlighted word or hero object. */
  ramp: string[];
  good: string;
  bad: string;
  font: { sans: string; serif: string; mono: string };
  /** colours of the isometric objects (any key of isoColors) */
  iso?: Partial<IsoColors>;
  /** the light <Scene3D> uses when it has no `studio` prop */
  studio?: StudioName | StudioSpec;
  /** the background <Scene3D> uses when it has no `background` prop */
  backdrop?: string | Backdrop3D;
  /** <Captions> colours when their props aren't set: the spoken word, *emphasis*, the shadow behind */
  captions?: { active?: string; accent?: string; outline?: string };
};

/** Default: near-black stage, soft white type, one spectrum ramp. */
export const ink: Theme = {
  name: 'ink',
  bg: '#07070B',
  surface: '#15151C',
  line: 'rgba(255,255,255,0.14)',
  text: '#F5F5F7',
  muted: '#8E8E99',
  accent: '#7D7AFF',
  ramp: ['#5AC8FA', '#7D7AFF', '#FF6FB5', '#FFB340'],
  good: '#34D399',
  bad: '#FF3B4E',
  font: kitFonts,
};

export type ThemeOverrides = Omit<Partial<Theme>, 'font'> & { font?: Partial<Theme['font']> };

export const makeTheme = (base: Theme, over: ThemeOverrides): Theme => ({ ...base, ...over, font: { ...base.font, ...over.font } });

const ThemeContext = createContext<Theme>(ink);
export const ThemeProvider = ThemeContext.Provider;
export const useTheme = () => useContext(ThemeContext);
