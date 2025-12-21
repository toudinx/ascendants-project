import { WeaponDef } from '../weapon.types';

export const ETHERIC_SCEPTER_DEF: WeaponDef = {
  id: 'etheric-scepter',
  name: 'Etheric Scepter',
  description: 'Resonant focus that emphasizes HP sustain.',
  passive: 'At battle start, gain a small shield equal to 6% max HP.',
  imageUrl: 'assets/battle/weapons/etheric_scepter.png',
  rarity: 'SR',
  flat: { type: 'hp', value: 1400 },
  secondary: { type: 'energyRegen', value: 20 }
};
