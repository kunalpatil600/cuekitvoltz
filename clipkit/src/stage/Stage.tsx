import React, { useMemo, useRef } from 'react';
import { AbsoluteFill, getInputProps, useVideoConfig } from 'remotion';
import { Inspect } from '../qa/Inspect';
import { ink, ThemeProvider } from '../theme/theme';
import type { Theme } from '../theme/theme';
import { Guides } from './Guides';
import { safeAreaFor } from './safe-area';
import type { SafePreset } from './safe-area';

/**
 * Root of every kit video: provides the theme and paints the background. Rendered with input props
 * { guides: true } it overlays the safe area; with { qa: true } it also runs layout QA (qa/Inspect).
 */
export const Stage: React.FC<{
  theme?: Theme; safe?: SafePreset; background?: string | false; guides?: boolean; children: React.ReactNode;
}> = ({ theme = ink, safe = 'auto', background, guides, children }) => {
  const { width, height } = useVideoConfig();
  const area = useMemo(() => safeAreaFor(width, height, safe), [width, height, safe]);
  const input = getInputProps() as { qa?: boolean; guides?: boolean };
  const root = useRef<HTMLDivElement>(null);
  return (
    <ThemeProvider value={theme}>
      <AbsoluteFill ref={root} style={{ background: background === false ? undefined : background ?? theme.bg, fontFamily: theme.font.sans, color: theme.text }}>
        {children}
        {(guides || input.guides || input.qa) && <Guides safe={area} />}
        {input.qa && <Inspect root={root} safe={area} />}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
