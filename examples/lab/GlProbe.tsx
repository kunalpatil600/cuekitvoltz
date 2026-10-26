import React, { useEffect, useState } from 'react';

// Reports which WebGL implementation the render browser got (see scripts/gl-probe.mjs).
const glRenderer = () => {
  const c = document.createElement('canvas');
  const g = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
  if (!g) return 'no webgl';
  const ext = g.getExtension('WEBGL_debug_renderer_info');
  return String(ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER));
};

export const GlProbe: React.FC = () => {
  const [renderer] = useState(glRenderer);
  useEffect(() => console.log(`GL:${renderer}`), [renderer]);
  return <div style={{ background: '#000', color: '#fff', font: '40px monospace', padding: 40, width: '100%', height: '100%' }}>{renderer}</div>;
};
