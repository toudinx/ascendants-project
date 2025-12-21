import { SigilDef } from '../sigil.types';

export const AGGRESSION_CREST_IV_DEF: SigilDef = {
  id: 'agressao-slot4',
  name: 'Aggression Crest IV',
  description: 'Amplifies sustained pressure.',
  imageUrl: 'assets/battle/fx/shadow_ground.png',
  level: 90,
  slot: 'slot4',
  setKey: 'agressao',
  mainStat: { type: 'damage_percent', value: 20 },
  subStats: [
    { type: 'hp_percent', value: 6 },
    { type: 'atk_percent', value: 6 },
    { type: 'energy_regen_percent', value: 6 },
    { type: 'crit_damage_percent', value: 0.1 }
  ]
};

