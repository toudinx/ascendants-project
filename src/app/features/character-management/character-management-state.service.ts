import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ProfileStateService } from '../../core/services/profile-state.service';
import { LoadoutService } from '../../core/services/loadout.service';
import { KaelisId } from '../../core/models/kaelis.model';
import { SigilId, SIGIL_SLOTS } from '../../core/models/sigil.model';

export type CharacterManagementTab = 'details' | 'weapon' | 'sigils';

@Injectable({ providedIn: 'root' })
export class CharacterManagementStateService {
  private readonly profile = inject(ProfileStateService);
  private readonly loadout = inject(LoadoutService);

  readonly selectedKaelisId = signal<KaelisId>(this.profile.selectedKaelisId());
  readonly activeTab = signal<CharacterManagementTab>('details');
  readonly selectedSigilSlotIndex = signal<number>(0);

  readonly currentKaelis$ = computed(() => {
    const id = this.selectedKaelisId();
    return this.profile.kaelisList().find(item => item.id === id) ?? this.profile.kaelisList()[0];
  });

  readonly equippedWeapon$ = computed(() => this.loadout.getEquippedWeapon(this.selectedKaelisId()));
  readonly equippedSigils$ = computed(() => this.loadout.getSigilsForKaelis(this.selectedKaelisId()));
  readonly equippedSkin$ = computed(() => this.loadout.getEquippedSkin(this.selectedKaelisId()));

  constructor() {
    effect(
      () => {
        const profileId = this.profile.selectedKaelisId();
        if (profileId !== this.selectedKaelisId()) {
          this.selectedKaelisId.set(profileId);
        }
      },
      { allowSignalWrites: true }
    );
    effect(
      () => {
        this.selectedKaelisId();
        this.selectedSigilSlotIndex.set(0);
      },
      { allowSignalWrites: true }
    );
  }

  selectKaelis(id: KaelisId): void {
    if (this.selectedKaelisId() === id) return;
    this.selectedKaelisId.set(id);
    this.profile.setSelectedKaelis(id);
  }

  selectPreviousKaelis(): void {
    this.selectRelativeKaelis(-1);
  }

  selectNextKaelis(): void {
    this.selectRelativeKaelis(1);
  }

  setActiveTab(tab: CharacterManagementTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
  }

  selectSigilSlot(index: number): void {
    if (index < 0 || index >= SIGIL_SLOTS.length) return;
    this.selectedSigilSlotIndex.set(index);
  }

  equipSigilToSelectedSlot(sigilId: SigilId | null): void {
    const slotIndex = this.selectedSigilSlotIndex();
    this.loadout.setSigilSlot(this.selectedKaelisId(), slotIndex, sigilId);
  }

  private selectRelativeKaelis(step: number): void {
    const roster = this.loadout.kaelisList();
    if (!roster.length) return;
    const currentId = this.selectedKaelisId();
    const currentIndex = roster.findIndex(item => item.id === currentId);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + step + roster.length) % roster.length;
    this.selectKaelis(roster[nextIndex].id);
  }
}


