import { KAELIS_LIST } from '../../content/kaelis';
import { WEAPON_LIST } from '../../content/equipment/weapons';
import { SIGIL_LIST } from '../../content/equipment/sigils';
import { DEFAULT_SKIN_BY_KAELIS, SKIN_LIST } from '../../content/equipment/skins';
import { KaelisId } from './kaelis.model';
import { WeaponId } from './weapon.model';
import { SigilId, SIGIL_SLOTS } from './sigil.model';

export type CurrencyType = 'gold' | 'sigils';
export type UiScale = 0.85 | 1 | 1.15 | 1.3;

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
  vfxDensity: 'low' | 'med' | 'high';
  screenShake: boolean;
  reducedFlash: boolean;
  uiScale: UiScale;
}

export interface ProfilePersistedState {
  selectedKaelisId: KaelisId;
  currencies: ProfileCurrencies;
  cosmetics: ProfileCosmeticsState;
  equipment: ProfileEquipmentState;
  sigils: ProfileSigilsState;
  potionCount: number;
  settings: ProfileSettings;
}

export interface ProfileEquipmentState {
  weaponByKaelis: Record<KaelisId, WeaponId>;
  sigilSlotsByKaelis: Record<KaelisId, (SigilId | null)[]>;
}

export interface ProfileSigilsState {
  inventory: SigilId[];
}

export function createDefaultProfileState(): ProfilePersistedState {
  const primaryKaelis = KAELIS_LIST[0]?.id ?? 'velvet';
  const defaultWeapon = WEAPON_LIST[0]?.id ?? 'ascendant-blade';
  const sigilInventory = SIGIL_LIST.map(sigil => sigil.id);
  const activeSkinByKaelis = KAELIS_LIST.reduce<Record<KaelisId, string>>((map, kaelis) => {
    map[kaelis.id] = DEFAULT_SKIN_BY_KAELIS[kaelis.id] ?? 'default';
    return map;
  }, {} as Record<KaelisId, string>);
  const ownedSkinIds = Array.from(
    new Set([
      ...Object.values(activeSkinByKaelis),
      ...SKIN_LIST.filter(skin => skin.isDefault).map(skin => skin.id)
    ])
  );

  const weaponByKaelis = KAELIS_LIST.reduce<Record<KaelisId, WeaponId>>((map, kaelis) => {
    map[kaelis.id] = defaultWeapon;
    return map;
  }, {} as Record<KaelisId, WeaponId>);

  const sigilSlotsByKaelis = KAELIS_LIST.reduce<Record<KaelisId, (SigilId | null)[]>>(
    (map, kaelis) => {
      const slots = Array.from({ length: SIGIL_SLOTS.length }, () => null as SigilId | null);
      if (kaelis.id === primaryKaelis) {
        SIGIL_LIST.forEach(sigil => {
          const slotIndex = SIGIL_SLOTS.indexOf(sigil.slot);
          if (slotIndex >= 0 && slots[slotIndex] === null) {
            slots[slotIndex] = sigil.id;
          }
        });
      }
      map[kaelis.id] = slots;
      return map;
    },
    {} as Record<KaelisId, (SigilId | null)[]>
  );

  return {
    selectedKaelisId: primaryKaelis,
    currencies: {
      gold: 0,
      sigils: 0
    },
    cosmetics: {
      ownedSkinIds,
      activeSkinByKaelis
    },
    equipment: {
      weaponByKaelis,
      sigilSlotsByKaelis
    },
    sigils: {
      inventory: sigilInventory
    },
    potionCount: 2,
    settings: {
      battleSpeed: 'normal',
      autoScrollLog: true,
      followTurns: true,
      showDamageFloaters: true,
      vfxDensity: 'med',
      screenShake: true,
      reducedFlash: false,
      uiScale: 1
    }
  };
}


