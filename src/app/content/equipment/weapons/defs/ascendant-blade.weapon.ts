import { WeaponDef } from '../weapon.types';

export const ASCENDANT_BLADE_DEF: WeaponDef = {
  id: 'ascendant-blade',
  name: 'Ascendant Blade',
  description: 'Balanced Kaelis weapon tuned for Sentinel flurries.',
  passive: 'After casting a skill, gain 12% crit damage for 2 turns.',
  imageUrl: 'assets/battle/weapons/ascendant_blade.png',
  rarity: 'SR',
  flat: { type: 'atk', value: 140 },
  secondary: { type: 'critRate', value: 0.2 }
};
