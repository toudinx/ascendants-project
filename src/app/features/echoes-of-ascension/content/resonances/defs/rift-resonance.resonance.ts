import { ResonanceDefinition } from '../../../models/resonance.model';

export const RIFT_RESONANCE: ResonanceDefinition = {
  id: 'rift-resonance',
  name: 'Rift Resonance',
  description: 'Echo pairs grant bonus fragments at draft.',
  requiredEchoes: 5,
  effects: [
    { key: 'draftFragments', label: 'Draft Fragments', baseValue: 1, unit: 'frag' }
  ],
  upgradeOptions: [
    {
      id: 'rift-echo-1',
      name: 'Rift Echo I',
      description: 'Gain +1 fragment on draft.',
      hpCostPercent: 0.08,
      statKey: 'draftFragments',
      delta: 1
    },
    {
      id: 'rift-echo-2',
      name: 'Rift Echo II',
      description: 'Gain +2 fragments on draft.',
      hpCostPercent: 0.12,
      statKey: 'draftFragments',
      delta: 2
    },
    {
      id: 'rift-echo-3',
      name: 'Rift Echo III',
      description: 'Gain +3 fragments on draft.',
      hpCostPercent: 0.18,
      statKey: 'draftFragments',
      delta: 3
    }
  ]
};
