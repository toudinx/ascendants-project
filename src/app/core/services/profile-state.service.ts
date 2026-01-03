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
import { SigilDefinition, SigilId, SigilSetKey, SigilSlot, SIGIL_SLOTS } from '../models/sigil.model';

@Injectable({ providedIn: 'root' })
export class ProfileStateService {
  private readonly storage = inject(StorageService);
  private readonly catalog = signal<KaelisDefinition[]>([...KAELIS_LIST]);
  private readonly weapons = signal<WeaponDefinition[]>([...WEAPON_LIST]);
  private readonly sigils = signal<SigilDefinition[]>([...SIGIL_LIST]);
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
  readonly sigilInventory = computed(() =>
    this.state()
      .sigils.inventory.map(id => this.getSigilById(id))
      .filter((sigil): sigil is SigilDefinition => !!sigil)
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

  equipSigil(kaelisId: KaelisId, slot: SigilSlot, sigilId: SigilId | null): void {
    const slotIndex = SIGIL_SLOTS.indexOf(slot);
    if (slotIndex < 0) return;
    if (sigilId && !this.state().sigils.inventory.includes(sigilId)) return;
    this.state.update(current => {
      const currentSlots =
        current.equipment.sigilSlotsByKaelis[kaelisId] ??
        Array.from({ length: SIGIL_SLOTS.length }, () => null as SigilId | null);
      const currentSlot = currentSlots[slotIndex] ?? null;
      if (currentSlot === sigilId) return current;
      const nextSlots = [...currentSlots];
      nextSlots[slotIndex] = sigilId ?? null;
      return {
        ...current,
        equipment: {
          ...current.equipment,
          sigilSlotsByKaelis: {
            ...current.equipment.sigilSlotsByKaelis,
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

  getSigilById(id?: SigilId | null): SigilDefinition | undefined {
    if (!id) return undefined;
    return this.sigils().find(sigil => sigil.id === id);
  }

  getEquippedSigilSlots(kaelisId: KaelisId): { slot: SigilSlot; sigil: SigilDefinition | null }[] {
    const slots = this.state().equipment.sigilSlotsByKaelis[kaelisId] ?? [];
    return SIGIL_SLOTS.map((slot, index) => ({
      slot,
      sigil: this.getSigilById(slots[index] ?? null) ?? null
    }));
  }

  getEquippedSigils(kaelisId: KaelisId): SigilDefinition[] {
    return this.getEquippedSigilSlots(kaelisId)
      .map(entry => entry.sigil)
      .filter((sigil): sigil is SigilDefinition => !!sigil);
  }

  getSigilSetCounts(kaelisId: KaelisId): Record<SigilSetKey, number> {
    return this.getEquippedSigils(kaelisId).reduce<Record<SigilSetKey, number>>((acc, sigil) => {
      acc[sigil.setKey] = (acc[sigil.setKey] ?? 0) + 1;
      return acc;
    }, {} as Record<SigilSetKey, number>);
  }

  getById(id: KaelisId): KaelisDefinition | undefined {
    return this.catalog().find(item => item.id === id);
  }
}


