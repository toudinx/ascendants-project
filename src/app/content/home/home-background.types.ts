export type HomeParticlePreset = 'nebula' | 'stars' | 'void';

export interface HomeBackgroundDef {
  id: string;
  name: string;
  imageUrl: string;
  gradientOverlay?: string;
  particlePreset?: HomeParticlePreset;
  parallaxStrength?: number;
  tags?: string[];
}
