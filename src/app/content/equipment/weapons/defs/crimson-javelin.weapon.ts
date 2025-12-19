import { WeaponDef } from '../weapon.types';

export const CRIMSON_JAVELIN_DEF: WeaponDef = {
  id: 'crimson-javelin',
  name: 'Crimson Javelin',
  description: 'High crit weapon built for burst windows.',
  rarity: 'SSR',
  flat: { type: 'atk', value: 140 },
  secondary: { type: 'critDamage', value: 0.4 }
};
