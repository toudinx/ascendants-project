import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ProfileStateService } from './profile-state.service';
import { SkinDefinition } from '../models/skin.model';
import { KaelisId } from '../models/kaelis.model';
import { DEFAULT_SKIN_BY_KAELIS, getSkinsForKaelis } from '../../content/equipment/skins';

export interface VelvetSkin extends SkinDefinition {
  unlocked: boolean;
  isNew?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SkinStateService {
  private readonly profile = inject(ProfileStateService);

  readonly skins = signal<VelvetSkin[]>(
    this.buildSkins(this.profile.selectedKaelisId(), this.profile.cosmetics(), [])
  );
  readonly currentSkinId = signal<string>(
    this.profile.getActiveSkinFor(this.profile.selectedKaelisId()) ||
      DEFAULT_SKIN_BY_KAELIS[this.profile.selectedKaelisId()] ||
      ''
  );
  readonly lastObtainedSkins = signal<VelvetSkin[]>([]);

  readonly currentSkin = computed(() => this.getCurrentSkin());

  constructor() {
    effect(
      () => {
        const kaelisId = this.profile.selectedKaelisId();
        const cosmetics = this.profile.cosmetics();
        const nextSkins = this.buildSkins(kaelisId, cosmetics, this.skins());
        this.skins.set(nextSkins);

        const active =
          cosmetics.activeSkinByKaelis[kaelisId] ??
          DEFAULT_SKIN_BY_KAELIS[kaelisId] ??
          nextSkins[0]?.id ??
          '';
        if (active && this.currentSkinId() !== active) {
          this.currentSkinId.set(active);
        }
      },
      { allowSignalWrites: true }
    );
  }

  getCurrentSkin(): VelvetSkin {
    const current = this.currentSkinId();
    return this.skins().find(s => s.id === current) ?? this.skins()[0];
  }

  setCurrentSkin(id: string): void {
    const skin = this.skins().find(s => s.id === id && s.unlocked);
    if (!skin) return;
    const kaelisId = this.profile.selectedKaelisId();
    this.profile.setActiveSkin(kaelisId, id);
    this.currentSkinId.set(id);
    this.markSkinAsSeen(id);
  }

  unlockSkin(id: string): void {
    this.profile.unlockSkin(id);
    this.skins.update(list =>
      list.map(s => (s.id === id ? { ...s, unlocked: true, isNew: true } : s))
    );
  }

  markSkinAsSeen(id: string): void {
    this.skins.update(list =>
      list.map(s => (s.id === id ? { ...s, isNew: false } : s))
    );
  }

  addObtainedSkins(skins: VelvetSkin[]): void {
    const ids = skins.map(s => s.id);
    ids.forEach(id => this.profile.unlockSkin(id));
    this.skins.update(list =>
      list.map(s => (ids.includes(s.id) ? { ...s, unlocked: true, isNew: true } : s))
    );
    this.lastObtainedSkins.set(
      this.skins().filter(s => ids.includes(s.id))
    );
  }

  resetNewFlags(): void {
    this.skins.update(list => list.map(s => ({ ...s, isNew: false })));
    this.lastObtainedSkins.set([]);
  }

  clearLastObtained(): void {
    this.lastObtainedSkins.set([]);
  }

  private buildSkins(
    kaelisId: KaelisId,
    cosmetics: { ownedSkinIds: string[] },
    existing: VelvetSkin[]
  ): VelvetSkin[] {
    const owned = new Set(cosmetics.ownedSkinIds);
    const existingFlags = new Map(existing.map(skin => [skin.id, skin.isNew]));
    return getSkinsForKaelis(kaelisId).map(def => ({
      ...def,
      unlocked: owned.has(def.id) || !!def.isDefault,
      isNew: existingFlags.get(def.id)
    }));
  }
}
