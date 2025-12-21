import { HomeBackgroundDef } from '../home-background.types';

export const VOID_VEIL_BACKGROUND: HomeBackgroundDef = {
  id: 'void-veil',
  name: 'Void Veil',
  imageUrl: 'assets/battle/arena/arena_ruin_base.png',
  gradientOverlay:
    'radial-gradient(120% 80% at 20% 20%, rgba(88, 96, 180, 0.35), transparent 60%), radial-gradient(90% 70% at 80% 30%, rgba(214, 92, 162, 0.25), transparent 65%), linear-gradient(180deg, rgba(5, 5, 17, 0.2), rgba(5, 5, 17, 0.85))',
  particlePreset: 'stars',
  parallaxStrength: 22,
  tags: ['default', 'space', 'stars']
};
