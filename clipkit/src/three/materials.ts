import type { MeshPhysicalMaterialParameters } from 'three';

// Physically based material presets (MeshPhysicalMaterial parameters). Spread them on a material:
//   <meshPhysicalMaterial {...materials.glossy('#7D7AFF')} />
// or pass them to kit components (`material` props). Glows (`neon`) are HDR: values above 1 bloom.

export type MaterialParams = MeshPhysicalMaterialParameters;

export const materials = {
  /** matte, soft sheen: the "clay render" look */
  clay: (color = '#E9E5DE'): MaterialParams => ({ color, roughness: 0.9, metalness: 0, sheen: 0.4, sheenRoughness: 0.8, sheenColor: '#ffffff' }),
  /** everyday satin plastic */
  plastic: (color = '#7D7AFF'): MaterialParams => ({ color, roughness: 0.42, metalness: 0, specularIntensity: 0.6 }),
  /** lacquered plastic with a clear coat: toys, product renders */
  glossy: (color = '#7D7AFF'): MaterialParams => ({ color, roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
  /** soft-touch rubber */
  rubber: (color = '#2A2A33'): MaterialParams => ({ color, roughness: 0.85, metalness: 0, specularIntensity: 0.3 }),
  /** glazed ceramic */
  ceramic: (color = '#F2F0EB'): MaterialParams => ({ color, roughness: 0.2, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.1, specularIntensity: 0.8 }),
  /** satin aluminium */
  metal: (color = '#C9CCD3'): MaterialParams => ({ color, roughness: 0.32, metalness: 1 }),
  /** dark anodised aluminium */
  anodized: (color = '#3A3B42'): MaterialParams => ({ color, roughness: 0.4, metalness: 0.9, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  chrome: (color = '#FFFFFF'): MaterialParams => ({ color, roughness: 0.04, metalness: 1 }),
  gold: (color = '#FFC872'): MaterialParams => ({ color, roughness: 0.2, metalness: 1 }),
  /** thin-film rainbow metal */
  iridescent: (color = '#FFFFFF'): MaterialParams => ({
    color, roughness: 0.14, metalness: 1, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 820], clearcoat: 1, clearcoatRoughness: 0.08,
  }),
  /** clear glass (real refraction; costs an extra pass) */
  glass: (color = '#FFFFFF'): MaterialParams => ({ color, roughness: 0.03, metalness: 0, transmission: 1, thickness: 0.6, ior: 1.5, attenuationColor: color, attenuationDistance: 2.5 }),
  /** frosted glass */
  frosted: (color = '#FFFFFF'): MaterialParams => ({ color, roughness: 0.38, metalness: 0, transmission: 1, thickness: 0.8, ior: 1.45 }),
  /** self-lit tube: blooms */
  neon: (color = '#5AC8FA', power = 3.2): MaterialParams => ({ color: '#000000', emissive: color, emissiveIntensity: power, roughness: 0.5, metalness: 0 }),
} as const;

export type MaterialName = keyof typeof materials;
