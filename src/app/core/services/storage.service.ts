import { Injectable } from '@angular/core';
import { KAELIS_LIST } from '../../content/kaelis';
import { WEAPON_LIST } from '../../content/equipment/weapons';
import { SIGIL_LIST } from '../../content/equipment/sigils';
import { ProfilePersistedState, ProfileSettings, createDefaultProfileState } from '../models/profile.model';
import { KaelisId } from '../models/kaelis.model';
import { WeaponId } from '../models/weapon.model';
import { RingId, RingSlot, RING_SLOTS } from '../models/ring.model';

interface StoredEnvelope {
  version: number;
  profile: ProfilePersistedState;
}

const STORAGE_KEY = 'ascendants-profile';
const STORAGE_VERSION = 2;
const SAVE_DEBOUNCE_MS = 250;

@Injectable({ providedIn: 'root' })
export class StorageService {
  private pending?: StoredEnvelope;
  private saveHandle?: ReturnType<typeof setTimeout>;

  load(): ProfilePersistedState {
    if (!this.hasStorage()) {
      return createDefaultProfileState();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createDefaultProfileState();
      }
      const parsed = JSON.parse(raw) as StoredEnvelope;
      return this.migrate(parsed);
    } catch {
      return createDefaultProfileState();
    }
  }

  save(profile: ProfilePersistedState): void {
    if (!this.hasStorage()) return;
    this.pending = { version: STORAGE_VERSION, profile: { ...profile } };
    if (this.saveHandle) {
      clearTimeout(this.saveHandle);
    }
    this.saveHandle = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  }

  private flush(): void {
    if (!this.pending || !this.hasStorage()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pending));
    } catch {
      // swallow errors to avoid crashing on quota issues
    } finally {
      this.pending = undefined;
      this.saveHandle = undefined;
    }
  }

  private migrate(envelope: Partial<StoredEnvelope> | null | undefined): ProfilePersistedState {
    if (!envelope || typeof envelope !== 'object') {
      return createDefaultProfileState();
    }
    const version = typeof envelope.version === 'number' ? envelope.version : 0;
    const profile = envelope.profile;
    if (!profile) {
      return createDefaultProfileState();
    }
    if (version === STORAGE_VERSION) {
      return this.normalize(profile);
    }
    // Future migrations could be handled here; for now default to normalized latest.
    return this.normalize(profile);
  }

  private normalize(raw: ProfilePersistedState | Partial<ProfilePersistedState>): ProfilePersistedState {
    const defaults = createDefaultProfileState();
    if (!raw || typeof raw !== 'object') {
      return defaults;
    }

    const selectedKaelis = this.validateKaelisId((raw as ProfilePersistedState).selectedKaelisId) ?? defaults.selectedKaelisId;

    const rawCurrencies = raw.currencies as Partial<ProfilePersistedState['currencies']> | undefined;
    const currencies = {
      gold: this.clampNumber(rawCurrencies?.gold, 0, Number.MAX_SAFE_INTEGER, defaults.currencies.gold),
      sigils: this.clampNumber(rawCurrencies?.sigils, 0, Number.MAX_SAFE_INTEGER, defaults.currencies.sigils)
    };

    const rawCosmetics = raw.cosmetics;
    const ownedSkinIds = Array.isArray(rawCosmetics?.ownedSkinIds)
      ? Array.from(new Set(rawCosmetics.ownedSkinIds.concat('default')))
      : [...defaults.cosmetics.ownedSkinIds];

    const activeSkinByKaelis = { ...defaults.cosmetics.activeSkinByKaelis };
    if (rawCosmetics?.activeSkinByKaelis && typeof rawCosmetics.activeSkinByKaelis === 'object') {
      Object.entries(rawCosmetics.activeSkinByKaelis).forEach(([key, value]) => {
        if (this.isKaelisId(key) && typeof value === 'string' && value.trim().length > 0) {
          activeSkinByKaelis[key as KaelisId] = value;
        }
      });
    }

    const rawEquipment = raw.equipment;
    const weaponByKaelis = { ...defaults.equipment.weaponByKaelis };
    if (rawEquipment?.weaponByKaelis && typeof rawEquipment.weaponByKaelis === 'object') {
      Object.entries(rawEquipment.weaponByKaelis).forEach(([key, value]) => {
        if (this.isKaelisId(key) && this.isWeaponId(value)) {
          weaponByKaelis[key as KaelisId] = value as WeaponId;
        }
      });
    }

    const ringSlotsByKaelis = { ...defaults.equipment.ringSlotsByKaelis };
    if (rawEquipment?.ringSlotsByKaelis && typeof rawEquipment.ringSlotsByKaelis === 'object') {
      Object.entries(rawEquipment.ringSlotsByKaelis).forEach(([key, slots]) => {
        if (!this.isKaelisId(key) || typeof slots !== 'object') return;
        ringSlotsByKaelis[key as KaelisId] = this.normalizeRingSlots(slots as Record<string, unknown>);
      });
    }

    const potionCount = this.clampNumber(raw.potionCount, 0, 2, defaults.potionCount);

    const settings: ProfileSettings = {
      battleSpeed: raw.settings?.battleSpeed === 'fast' ? 'fast' : 'normal',
      autoScrollLog: typeof raw.settings?.autoScrollLog === 'boolean' ? raw.settings.autoScrollLog : defaults.settings.autoScrollLog,
      followTurns: typeof raw.settings?.followTurns === 'boolean' ? raw.settings.followTurns : defaults.settings.followTurns,
      showDamageFloaters:
        typeof raw.settings?.showDamageFloaters === 'boolean'
          ? raw.settings.showDamageFloaters
          : defaults.settings.showDamageFloaters
    };

    const ringInventory = Array.isArray(raw.rings?.inventory)
      ? raw.rings.inventory.filter(id => this.isRingId(id))
      : [...defaults.rings.inventory];

    return {
      selectedKaelisId: selectedKaelis,
      currencies,
      cosmetics: {
        ownedSkinIds,
        activeSkinByKaelis
      },
      equipment: {
        weaponByKaelis,
        ringSlotsByKaelis
      },
      rings: {
        inventory: ringInventory.length ? ringInventory : [...defaults.rings.inventory]
      },
      potionCount,
      settings
    };
  }

  private clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.floor(value)));
  }

  private validateKaelisId(id: unknown): KaelisId | null {
    if (typeof id !== 'string') return null;
    return KAELIS_LIST.some(k => k.id === id) ? (id as KaelisId) : null;
  }

  private isKaelisId(value: unknown): value is KaelisId {
    return typeof value === 'string' && KAELIS_LIST.some(k => k.id === value);
  }

  private isWeaponId(value: unknown): value is WeaponId {
    return typeof value === 'string' && WEAPON_LIST.some(w => w.id === value);
  }

  private isRingId(value: unknown): value is RingId {
    return typeof value === 'string' && SIGIL_LIST.some(r => r.id === value);
  }

  private normalizeRingSlots(input: Record<string, unknown>): Record<RingSlot, RingId | null> {
    const slots = RING_SLOTS.reduce<Record<RingSlot, RingId | null>>((map, slot) => {
      map[slot] = null;
      return map;
    }, {} as Record<RingSlot, RingId | null>);
    Object.entries(input).forEach(([slotKey, value]) => {
      if (RING_SLOTS.includes(slotKey as RingSlot) && (this.isRingId(value) || value === null)) {
        slots[slotKey as RingSlot] = (value as RingId) ?? null;
      }
    });
    return slots;
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }
}
