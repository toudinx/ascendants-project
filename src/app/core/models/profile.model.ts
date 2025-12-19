import { KAELIS_LIST } from '../../content/kaelis';
import { WEAPON_LIST } from '../../content/equipment/weapons';
import { SIGIL_LIST } from '../../content/equipment/sigils';
import { KaelisId } from './kaelis.model';
import { WeaponId } from './weapon.model';
import { RingId, RingSlot, RING_SLOTS } from './ring.model';

export type CurrencyType = 'gold' | 'sigils';

export interface ProfileCurrencies {
  gold: number;
  sigils: number;
}

export interface ProfileCosmeticsState {
  ownedSkinIds: string[];
  activeSkinByKaelis: Record<KaelisId, string>;
}

export interface ProfileSettings {
  battleSpeed: 'normal' | 'fast';
  autoScrollLog: boolean;
  followTurns: boolean;
  showDamageFloaters: boolean;
}

export interface ProfilePersistedState {
  selectedKaelisId: KaelisId;
  currencies: ProfileCurrencies;
  cosmetics: ProfileCosmeticsState;
  equipment: ProfileEquipmentState;
  rings: ProfileRingsState;
  potionCount: number;
  settings: ProfileSettings;
}

export interface ProfileEquipmentState {
  weaponByKaelis: Record<KaelisId, WeaponId>;
  ringSlotsByKaelis: Record<KaelisId, Record<RingSlot, RingId | null>>;
}

export interface ProfileRingsState {
  inventory: RingId[];
}

export function createDefaultProfileState(): ProfilePersistedState {
  const primaryKaelis = KAELIS_LIST[0]?.id ?? 'velvet';
  const defaultWeapon = WEAPON_LIST[0]?.id ?? 'ascendant-blade';
  const ringInventory = SIGIL_LIST.map(ring => ring.id);
  const activeSkinByKaelis = KAELIS_LIST.reduce<Record<KaelisId, string>>((map, kaelis) => {
    map[kaelis.id] = 'default';
    return map;
  }, {} as Record<KaelisId, string>);

  const weaponByKaelis = KAELIS_LIST.reduce<Record<KaelisId, WeaponId>>((map, kaelis) => {
    map[kaelis.id] = defaultWeapon;
    return map;
  }, {} as Record<KaelisId, WeaponId>);

  const ringSlotsByKaelis = KAELIS_LIST.reduce<Record<KaelisId, Record<RingSlot, RingId | null>>>(
    (map, kaelis) => {
      const slots = RING_SLOTS.reduce<Record<RingSlot, RingId | null>>((slotMap, slot) => {
        slotMap[slot] = null;
        return slotMap;
      }, {} as Record<RingSlot, RingId | null>);
      if (kaelis.id === primaryKaelis) {
        SIGIL_LIST.forEach(ring => {
          if (slots[ring.slot] === null) {
            slots[ring.slot] = ring.id;
          }
        });
      }
      map[kaelis.id] = slots;
      return map;
    },
    {} as Record<KaelisId, Record<RingSlot, RingId | null>>
  );

  return {
    selectedKaelisId: primaryKaelis,
    currencies: {
      gold: 0,
      sigils: 0
    },
    cosmetics: {
      ownedSkinIds: ['default'],
      activeSkinByKaelis
    },
    equipment: {
      weaponByKaelis,
      ringSlotsByKaelis
    },
    rings: {
      inventory: ringInventory
    },
    potionCount: 2,
    settings: {
      battleSpeed: 'normal',
      autoScrollLog: true,
      followTurns: true,
      showDamageFloaters: true
    }
  };
}
