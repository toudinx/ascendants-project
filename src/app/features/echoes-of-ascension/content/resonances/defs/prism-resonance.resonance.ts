import { ResonanceDefinition } from '../../../models/resonance.model';

export const PRISM_RESONANCE: ResonanceDefinition = {
  id: 'prism-resonance',
  name: 'Prism Resonance',
  description: 'When 3+ echoes align, start battle with a shield.',
  requiredEchoes: 3,
  effects: [
    { key: 'startShield', label: 'Start Shield', baseValue: 6, unit: 'shield' }
  ],
  upgradeOptions: [
    {
      id: 'prism-ward-1',
      name: 'Prism Ward I',
      description: 'Increase start shield by 2.',
      hpCostPercent: 0.08,
      statKey: 'startShield',
      delta: 2
    },
    {
      id: 'prism-ward-2',
      name: 'Prism Ward II',
      description: 'Increase start shield by 3.',
      hpCostPercent: 0.12,
      statKey: 'startShield',
      delta: 3
    },
    {
      id: 'prism-ward-3',
      name: 'Prism Ward III',
      description: 'Increase start shield by 4.',
      hpCostPercent: 0.18,
      statKey: 'startShield',
      delta: 4
    }
  ]
};
