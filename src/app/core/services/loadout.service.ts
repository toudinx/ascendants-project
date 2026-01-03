import { Injectable, inject } from '@angular/core';
import { ProfileStateService } from './profile-state.service';
import { KaelisDefinition, KaelisId } from '../models/kaelis.model';
import { WeaponDefinition, WeaponId } from '../models/weapon.model';
import { SigilDefinition, SigilId, SigilSlot, SIGIL_SLOTS } from '../models/sigil.model';
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

  sigilInventory(): SigilDefinition[] {
    return this.profile.sigilInventory();
  }

  getSigilsForKaelis(kaelisId: KaelisId): (SigilId | null)[] {
    return this.profile.getEquippedSigilSlots(kaelisId).map(entry => entry.sigil?.id ?? null);
  }

  getEquippedWeapon(kaelisId: KaelisId): WeaponDefinition {
    return this.profile.getEquippedWeapon(kaelisId);
  }

  equipWeapon(kaelisId: KaelisId, weaponId: WeaponId): void {
    this.profile.setEquippedWeapon(kaelisId, weaponId);
  }

  getSigilSlots(kaelisId: KaelisId): { slot: SigilSlot; sigil: SigilDefinition | null }[] {
    const sigils = this.getSigilsForKaelis(kaelisId);
    return sigils.map((id, index) => ({
      slot: SIGIL_SLOTS[index],
      sigil: id ? this.profile.getSigilById(id) ?? null : null
    }));
  }

  equipSigilSlot(kaelisId: KaelisId, slot: SigilSlot, sigilId: SigilId | null): void {
    this.profile.equipSigil(kaelisId, slot, sigilId);
  }

  setSigilSlot(kaelisId: KaelisId, slotIndex: number, sigilId: SigilId | null): void {
    const slot = SIGIL_SLOTS[slotIndex];
    if (!slot) return;
    this.profile.equipSigil(kaelisId, slot, sigilId);
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


