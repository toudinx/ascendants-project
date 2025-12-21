import { WeaponFlatStatType, WeaponSecondaryStatType } from '../../../core/models/weapon.model';

export interface WeaponStatTemplate<T extends WeaponFlatStatType | WeaponSecondaryStatType> {
  type: T;
  value: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  description: string;
  passive: string;
  imageUrl: string;
  rarity?: 'R' | 'SR' | 'SSR';
  flat: WeaponStatTemplate<WeaponFlatStatType>;
  secondary: WeaponStatTemplate<WeaponSecondaryStatType>;
  tags?: string[];
}
