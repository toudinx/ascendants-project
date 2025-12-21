import { WeaponDef } from '../weapon.types';

export const CRIMSON_JAVELIN_DEF: WeaponDef = {
  id: 'crimson-javelin',
  name: 'Crimson Javelin',
  description: 'High crit weapon built for burst windows.',
  passive: 'Crit hits increase damage dealt by 8% for 3 turns.',
  imageUrl: 'assets/battle/weapons/crimson_javelin.png',
  rarity: 'SSR',
  flat: { type: 'atk', value: 140 },
  secondary: { type: 'critDamage', value: 0.4 }
};
