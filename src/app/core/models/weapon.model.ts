export type WeaponFlatStatType = 'atk' | 'hp';
export type WeaponSecondaryStatType = 'critRate' | 'critDamage' | 'energyRegen';

export interface WeaponStat<T extends WeaponFlatStatType | WeaponSecondaryStatType> {
  type: T;
  value: number;
}

export interface WeaponDefinition {
  id: string;
  name: string;
  description: string;
  passive?: string;
  imageUrl?: string;
  flatStat: WeaponStat<WeaponFlatStatType>;
  secondaryStat: WeaponStat<WeaponSecondaryStatType>;
  rarity?: 'R' | 'SR' | 'SSR';
}

export type WeaponId = WeaponDefinition['id'];
