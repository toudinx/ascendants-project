import { WeaponDefinition } from '../../../core/models/weapon.model';
import { WeaponDef } from './weapon.types';
import { ASCENDANT_BLADE_DEF } from './defs/ascendant-blade.weapon';
import { ETHERIC_SCEPTER_DEF } from './defs/etheric-scepter.weapon';
import { CRIMSON_JAVELIN_DEF } from './defs/crimson-javelin.weapon';
import { WARDEN_WARD_DEF } from './defs/warden-ward.weapon';

const RAW_WEAPONS: WeaponDef[] = [
  ASCENDANT_BLADE_DEF,
  ETHERIC_SCEPTER_DEF,
  CRIMSON_JAVELIN_DEF,
  WARDEN_WARD_DEF
];

function mapWeapon(def: WeaponDef): WeaponDefinition {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    rarity: def.rarity,
    flatStat: { type: def.flat.type, value: def.flat.value },
    secondaryStat: { type: def.secondary.type, value: def.secondary.value }
  };
}

export const WEAPON_CATALOG: Record<string, WeaponDefinition> = RAW_WEAPONS.reduce<
  Record<string, WeaponDefinition>
>((acc, def) => {
  acc[def.id] = mapWeapon(def);
  return acc;
}, {});

export const WEAPON_LIST: WeaponDefinition[] = Object.values(WEAPON_CATALOG);

export function getWeaponDefinition(id: string): WeaponDefinition | undefined {
  return WEAPON_CATALOG[id];
}
