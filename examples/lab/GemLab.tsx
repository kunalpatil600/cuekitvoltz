import React from 'react';
import { Anim, Gem, Scene3D, Stage, lightTent, orbit } from 'cuekitvoltz';

// cuekitvoltz gem check (16:9): the traced round brilliant alone, seen table-on, tilted and side-on,
// with its default jewellery studio. Used to verify facets and optics before they go into an ad.
export const GemLab: React.FC = () => {
  const cam = orbit({ target: [0, 0, 0], az: 0, el: 8, dist: 9, fov: 30 });
  return (
    <Stage background="#EEE">
      <Scene3D camera={cam} studio="product" floor={false} background={{ top: '#F7F8FA', bottom: '#D8DBE1' }} post={{ bloom: { strength: 0.2, radius: 0.4, threshold: 2.6 }, aberration: 0, vignette: 0 }}>
        <Anim position={[-3.1, 0, 0]} rotation={[80, 0, 0]}><Gem size={2.2} lights={lightTent} dome={1.05} /></Anim>
        <Anim position={[0, 0, 0]} rotation={[35, (f) => f * 0.8, 0]}><Gem size={2.2} lights={lightTent} dome={1.05} /></Anim>
        <Anim position={[3.1, 0.2, 0]} rotation={[0, 0, 0]}><Gem size={2.2} lights={lightTent} dome={1.05} /></Anim>
      </Scene3D>
    </Stage>
  );
};
