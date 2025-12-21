import { Injectable, inject } from '@angular/core';
import { ProfileStateService } from './profile-state.service';
import { KaelisDefinition, KaelisId } from '../models/kaelis.model';
import { WeaponDefinition, WeaponId } from '../models/weapon.model';
import { RingDefinition, RingId, RingSlot, RING_SLOTS } from '../models/ring.model';
import { SkinDefinition } from '../models/skin.model';
import { DEFAULT_SKIN_BY_KAELIS, getSkinDefinition, getSkinsForKaelis } from '../../content/equipment/skins';

@Injectable({ providedIn: 'root' })
export class LoadoutService {
  private readonly profile = inject(ProfileStateService);

  kaelisList(): KaelisDefinition[] {
    return this.profile.kaelisList();
  }

  weaponList(): WeaponDefinition[] {
    return this.profile.weaponList();
  }

  sigilInventory(): RingDefinition[] {
    return this.profile.ringInventory();
  }

  getSigilsForKaelis(kaelisId: KaelisId): Array<RingId | null> {
    return this.profile.getEquippedRingSlots(kaelisId).map(entry => entry.ring?.id ?? null);
  }

  getEquippedWeapon(kaelisId: KaelisId): WeaponDefinition {
    return this.profile.getEquippedWeapon(kaelisId);
  }

  equipWeapon(kaelisId: KaelisId, weaponId: WeaponId): void {
    this.profile.setEquippedWeapon(kaelisId, weaponId);
  }

  getSigilSlots(kaelisId: KaelisId): { slot: RingSlot; ring: RingDefinition | null }[] {
    const sigils = this.getSigilsForKaelis(kaelisId);
    return sigils.map((id, index) => ({
      slot: RING_SLOTS[index],
      ring: id ? this.profile.getRingById(id) ?? null : null
    }));
  }

  equipSigilSlot(kaelisId: KaelisId, slot: RingSlot, ringId: RingId | null): void {
    this.profile.equipRing(kaelisId, slot, ringId);
  }

  setSigilSlot(kaelisId: KaelisId, slotIndex: number, ringId: RingId | null): void {
    const slot = RING_SLOTS[slotIndex];
    if (!slot) return;
    this.profile.equipRing(kaelisId, slot, ringId);
  }

  getSkinsForKaelis(kaelisId: KaelisId): SkinDefinition[] {
    return getSkinsForKaelis(kaelisId);
  }

  getEquippedSkin(kaelisId: KaelisId): SkinDefinition | null {
    const activeId = this.profile.getActiveSkinFor(kaelisId);
    const active = getSkinDefinition(activeId);
    if (active && active.kaelisId === kaelisId) {
      return active;
    }
    return this.getSkinsForKaelis(kaelisId)[0] ?? null;
  }

  equipSkin(kaelisId: KaelisId, skinId: string): void {
    if (!getSkinDefinition(skinId)) return;
    this.profile.setActiveSkin(kaelisId, skinId);
  }

  isSkinOwned(id: string): boolean {
    return this.profile.isSkinOwned(id);
  }

  getDefaultSkinId(kaelisId: KaelisId): string {
    return DEFAULT_SKIN_BY_KAELIS[kaelisId] ?? this.getSkinsForKaelis(kaelisId)[0]?.id ?? 'default';
  }
}
