import { SigilDef } from '../sigil.types';

export const AGGRESSION_RESERVE_DEF: SigilDef = {
  id: 'agressao-reserve',
  name: 'Aggression Reserve Band',
  description: 'Spare band for custom builds.',
  imageUrl: 'assets/battle/fx/shadow_ground.png',
  level: 60,
  slot: 'slot3',
  setKey: 'agressao',
  mainStat: { type: 'atk_percent', value: 18 },
  subStats: [
    { type: 'hp_percent', value: 6 },
    { type: 'atk_flat', value: 30 },
    { type: 'crit_rate_percent', value: 0.05 },
    { type: 'energy_regen_percent', value: 6 }
  ]
};

