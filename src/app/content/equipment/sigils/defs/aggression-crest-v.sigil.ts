import { SigilDef } from '../sigil.types';

export const AGGRESSION_CREST_V_DEF: SigilDef = {
  id: 'agressao-slot5',
  name: 'Aggression Crest V',
  description: 'Final emblem of the assault doctrine.',
  imageUrl: 'assets/battle/fx/shadow_ground.png',
  level: 95,
  slot: 'slot5',
  setKey: 'agressao',
  mainStat: { type: 'crit_damage_percent', value: 0.4 },
  subStats: [
    { type: 'crit_rate_percent', value: 0.05 },
    { type: 'atk_flat', value: 30 },
    { type: 'hp_percent', value: 6 },
    { type: 'damage_percent', value: 6 }
  ]
};

