import { WeaponDef } from '../weapon.types';

export const WARDEN_WARD_DEF: WeaponDef = {
  id: 'warden-ward',
  name: "Warden's Ward",
  description: 'Protective core that bolsters HP and crit focus.',
  passive: 'Taking damage grants 4% damage reduction for 2 turns.',
  imageUrl: 'assets/battle/weapons/warden_ward.png',
  rarity: 'R',
  flat: { type: 'hp', value: 1400 },
  secondary: { type: 'critRate', value: 0.2 }
};
