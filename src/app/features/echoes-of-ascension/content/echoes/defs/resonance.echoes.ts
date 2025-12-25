import { EchoDefinition } from '../../../models/echo.model';

export const RESONANCE_ECHOES: EchoDefinition[] = [
  {
    id: 'harmonic-loop',
    name: 'Harmonic Loop',
    description: 'Every third action grants 1 echo fragment.',
    pathId: 'Resonance',
    rarity: 'common',
    tags: ['fragments']
  },
  {
    id: 'pulse-weave',
    name: 'Pulse Weave',
    description: 'Gain 1 energy when you trigger an echo effect.',
    pathId: 'Resonance',
    rarity: 'common',
    tags: ['energy']
  },
  {
    id: 'phase-tuning',
    name: 'Phase Tuning',
    description: 'After gaining energy, gain 1 echo fragment.',
    pathId: 'Resonance',
    rarity: 'common',
    tags: ['energy', 'fragments']
  }
];
