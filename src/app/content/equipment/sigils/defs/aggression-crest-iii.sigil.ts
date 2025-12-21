import { SigilDef } from '../sigil.types';

export const AGGRESSION_CREST_III_DEF: SigilDef = {
  id: 'agressao-slot3',
  name: 'Aggression Crest III',
  description: 'Sharpened for decisive strikes.',
  imageUrl: 'assets/battle/fx/shadow_ground.png',
  level: 90,
  slot: 'slot3',
  setKey: 'agressao',
  mainStat: { type: 'crit_rate_percent', value: 0.2 },
  subStats: [
    { type: 'atk_flat', value: 30 },
    { type: 'atk_percent', value: 6 },
    { type: 'damage_percent', value: 6 },
    { type: 'crit_damage_percent', value: 0.1 }
  ]
};

