import { SigilDef } from '../sigil.types';

export const AGGRESSION_CREST_II_DEF: SigilDef = {
  id: 'agressao-slot2',
  name: 'Agressão Crest II',
  description: 'Stabilizes energy throughput.',
  level: 75,
  slot: 'slot2',
  setKey: 'agressao',
  mainStat: { type: 'hp_percent', value: 22 },
  subStats: [
    { type: 'energy_regen_percent', value: 6 },
    { type: 'atk_percent', value: 6 },
    { type: 'crit_damage_percent', value: 0.1 },
    { type: 'hp_flat', value: 300 }
  ]
};
