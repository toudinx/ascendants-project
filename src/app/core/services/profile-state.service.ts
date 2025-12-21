import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { KaelisDefinition, KaelisId, RunKaelisSnapshot } from '../models/kaelis.model';
import { KAELIS_LIST } from '../../content/kaelis';
import { WEAPON_LIST } from '../../content/equipment/weapons';
import { SIGIL_LIST } from '../../content/equipment/sigils';
import { DEFAULT_SKIN_BY_KAELIS } from '../../content/equipment/skins';
import {
  CurrencyType,
  ProfilePersistedState,
  ProfileSettings,
  createDefaultProfileState
} from '../models/profile.model';
import { StorageService } from './storage.service';
import { WeaponDefinition, WeaponId } from '../models/weapon.model';
import { RingDefinition, RingId, RingSetKey, RingSlot, RING_SLOTS } from '../models/ring.model';

@Injectable({ providedIn: 'root' })
export class ProfileStateService {
  private readonly storage = inject(StorageService);
  private readonly catalog = signal<KaelisDefinition[]>([...KAELIS_LIST]);
  private readonly weapons = signal<WeaponDefinition[]>([...WEAPON_LIST]);
  private readonly rings = signal<RingDefinition[]>([...SIGIL_LIST]);
  private readonly state = signal<ProfilePersistedState>(this.storage.load());

  readonly kaelisList = computed(() => this.catalog());
  readonly selectedKaelisId = computed(() => this.state().selectedKaelisId);
  readonly activeKaelis = computed<KaelisDefinition>(() => {
    const id = this.selectedKaelisId();
    return this.catalog().find(item => item.id === id) ?? this.catalog()[0];
  });
  readonly currencies = computed(() => this.state().currencies);
  readonly cosmetics = computed(() => this.state().cosmetics);
  readonly potionCount = computed(() => this.state().potionCount);
  readonly settings = computed(() => this.state().settings);
  readonly weaponList = computed(() => this.weapons());
  readonly ringInventory = computed(() =>
    this.state()
      .rings.inventory.map(id => this.getRingById(id))
      .filter((ring): ring is RingDefinition => !!ring)
  );
  readonly activeWeapon = computed<WeaponDefinition>(() => {
    const weaponId = this.state().equipment.weaponByKaelis[this.selectedKaelisId()] ?? this.weapons()[0]?.id;
    return this.getWeaponById(weaponId) ?? this.weapons()[0];
  });

  constructor() {
    effect(() => {
      this.storage.save(this.state());
    });
  }

  setSelectedKaelis(id: KaelisId): void {
    if (this.selectedKaelisId() === id) return;
    if (!this.catalog().some(item => item.id === id)) return;
    this.state.update(current => ({ ...current, selectedKaelisId: id }));
  }

  selectKaelis(id: KaelisId): void {
    this.setSelectedKaelis(id);
  }

  setEquippedWeapon(kaelisId: KaelisId, weaponId: WeaponId): void {
    if (!this.getWeaponById(weaponId)) return;
    this.state.update(current => {
      const currentWeapon = current.equipment.weaponByKaelis[kaelisId];
      if (currentWeapon === weaponId) {
        return current;
      }
      return {
        ...current,
        equipment: {
          ...current.equipment,
          weaponByKaelis: {
            ...current.equipment.weaponByKaelis,
            [kaelisId]: weaponId
          }
        }
      };
    });
  }

  addCurrency(type: CurrencyType, amount: number): void {
    if (!amount) return;
    this.state.update(current => {
      const currentValue = current.currencies[type];
      const nextValue = Math.max(0, Math.floor(currentValue + amount));
      if (nextValue === currentValue) return current;
      return {
        ...current,
        currencies: {
          ...current.currencies,
          [type]: nextValue
        }
      };
    });
  }

  setPotionCount(count: number): void {
    const clamped = Math.min(2, Math.max(0, Math.floor(count)));
    this.state.update(current =>
      current.potionCount === clamped ? current : { ...current, potionCount: clamped }
    );
  }

  adjustPotions(delta: number): void {
    if (!delta) return;
    this.setPotionCount(this.state().potionCount + delta);
  }

  setSetting<K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]): void {
    this.state.update(current => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value
      }
    }));
  }

  unlockSkin(id: string): void {
    this.state.update(current => {
      if (current.cosmetics.ownedSkinIds.includes(id)) {
        return current;
      }
      return {
        ...current,
        cosmetics: {
          ...current.cosmetics,
          ownedSkinIds: [...current.cosmetics.ownedSkinIds, id]
        }
      };
    });
  }

  setActiveSkin(kaelisId: KaelisId, skinId: string): void {
    this.state.update(current => {
      const existing = current.cosmetics.activeSkinByKaelis[kaelisId];
      if (existing === skinId) return current;
      return {
        ...current,
        cosmetics: {
          ...current.cosmetics,
          activeSkinByKaelis: {
            ...current.cosmetics.activeSkinByKaelis,
            [kaelisId]: skinId
          }
        }
      };
    });
  }

  isSkinOwned(id: string): boolean {
    return this.state().cosmetics.ownedSkinIds.includes(id);
  }

  getActiveSkinFor(kaelisId: KaelisId): string {
    return this.state().cosmetics.activeSkinByKaelis[kaelisId] ?? DEFAULT_SKIN_BY_KAELIS[kaelisId] ?? 'default';
  }

  equipRing(kaelisId: KaelisId, slot: RingSlot, ringId: RingId | null): void {
    const slotIndex = RING_SLOTS.indexOf(slot);
    if (slotIndex < 0) return;
    if (ringId && !this.state().rings.inventory.includes(ringId)) return;
    this.state.update(current => {
      const currentSlots =
        current.equipment.ringSlotsByKaelis[kaelisId] ??
        Array.from({ length: RING_SLOTS.length }, () => null as RingId | null);
      const currentSlot = currentSlots[slotIndex] ?? null;
      if (currentSlot === ringId) return current;
      const nextSlots = [...currentSlots];
      nextSlots[slotIndex] = ringId ?? null;
      return {
        ...current,
        equipment: {
          ...current.equipment,
          ringSlotsByKaelis: {
            ...current.equipment.ringSlotsByKaelis,
            [kaelisId]: nextSlots
          }
        }
      };
    });
  }

  reset(): void {
    this.state.set(createDefaultProfileState());
  }

  getActiveSnapshot(): RunKaelisSnapshot {
    const current = this.activeKaelis();
    return {
      ...current,
      baseStats: { ...current.baseStats },
      kit: { ...current.kit }
    };
  }

  getWeaponById(id?: WeaponId | null): WeaponDefinition | undefined {
    if (!id) return undefined;
    return this.weapons().find(weapon => weapon.id === id);
  }

  getEquippedWeapon(kaelisId: KaelisId): WeaponDefinition {
    const weaponId = this.state().equipment.weaponByKaelis[kaelisId];
    return this.getWeaponById(weaponId) ?? this.weapons()[0];
  }

  getRingById(id?: RingId | null): RingDefinition | undefined {
    if (!id) return undefined;
    return this.rings().find(ring => ring.id === id);
  }

  getEquippedRingSlots(kaelisId: KaelisId): { slot: RingSlot; ring: RingDefinition | null }[] {
    const slots = this.state().equipment.ringSlotsByKaelis[kaelisId] ?? [];
    return RING_SLOTS.map((slot, index) => ({
      slot,
      ring: this.getRingById(slots[index] ?? null) ?? null
    }));
  }

  getEquippedRings(kaelisId: KaelisId): RingDefinition[] {
    return this.getEquippedRingSlots(kaelisId)
      .map(entry => entry.ring)
      .filter((ring): ring is RingDefinition => !!ring);
  }

  getRingSetCounts(kaelisId: KaelisId): Record<RingSetKey, number> {
    return this.getEquippedRings(kaelisId).reduce<Record<RingSetKey, number>>((acc, ring) => {
      acc[ring.setKey] = (acc[ring.setKey] ?? 0) + 1;
      return acc;
    }, {} as Record<RingSetKey, number>);
  }

  getById(id: KaelisId): KaelisDefinition | undefined {
    return this.catalog().find(item => item.id === id);
  }
}
