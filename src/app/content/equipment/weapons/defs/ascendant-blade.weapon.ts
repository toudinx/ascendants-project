import { WeaponDef } from '../weapon.types';

export const ASCENDANT_BLADE_DEF: WeaponDef = {
  id: 'ascendant-blade',
  name: 'Ascendant Blade',
  description: 'Balanced Kaelis weapon tuned for Sentinela flurries.',
  rarity: 'SR',
  flat: { type: 'atk', value: 140 },
  secondary: { type: 'critRate', value: 0.2 }
};
