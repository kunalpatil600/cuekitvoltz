import { loadVariableFont as loadGeist } from '@remotion/google-fonts/Geist';
import { loadVariableFont as loadGeistMono } from '@remotion/google-fonts/GeistMono';
import { loadFont as loadInstrumentSerif } from '@remotion/google-fonts/InstrumentSerif';

// The kit's default type trio (all OFL): variable Geist for structure, Instrument Serif italic for
// the one emotional word in a line, variable Geist Mono for labels and data. Latin subset only,
// which has no arrows (→): use icons instead.
const latin = { subsets: ['latin' as const] };
loadInstrumentSerif('normal', { weights: ['400'], ...latin });

export const kitFonts = {
  sans: `${loadGeist('normal', latin).fontFamily}, sans-serif`,
  serif: `${loadInstrumentSerif('italic', { weights: ['400'], ...latin }).fontFamily}, serif`,
  mono: `${loadGeistMono('normal', latin).fontFamily}, monospace`,
};
