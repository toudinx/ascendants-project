import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  AppPanelComponent,
  AppStatBarComponent,
  AppButtonComponent,
  AppTagComponent,
  AppCardComponent,
  AppModalComponent
} from '../../shared/components';
import { ProfileStateService } from '../../core/services/profile-state.service';
import { PlayerStateService } from '../../core/services/player-state.service';
import { RunStateService } from '../../core/services/run-state.service';
import { WeaponDefinition, WeaponId } from '../../core/models/weapon.model';
import { RingDefinition, RingId, RingSetKey, RingSlot, RingStat, RING_SLOTS } from '../../core/models/ring.model';
import { SIGIL_SETS } from '../../content/equipment/sigils';

@Component({
  selector: 'app-loadout-page',
  standalone: true,
  imports: [
    CommonModule,
    AppPanelComponent,
    AppStatBarComponent,
    AppButtonComponent,
    AppTagComponent,
    AppCardComponent,
    AppModalComponent
  ],
  template: `
    <div class="space-y-4">
      <app-panel
        title="Kaelis Loadout"
        subtitle="Adjust weapon and sigils outside of combat."
        [tag]="activeKaelis.name"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3">
            <img
              class="h-16 w-16 rounded-[12px] border border-white/10 object-cover"
              [src]="activeKaelis.portrait"
              [alt]="activeKaelis.name"
            />
            <div class="text-sm text-[#A4A4B5]">
              <p class="font-semibold text-white">{{ activeKaelis.title }}</p>
              <p>{{ activeKaelis.description }}</p>
            </div>
          </div>
          <div class="text-xs text-[#7F7F95]">
            <p>HP {{ player.state().attributes.maxHp }}</p>
            <p>ATK {{ player.state().attributes.attack }}</p>
            <p>Energy {{ player.state().attributes.maxEnergy }}</p>
          </div>
        </div>
      </app-panel>

      <app-panel title="Weapon" subtitle="Select one weapon per Kaelis.">
        @if (loadoutLocked) {
          <app-tag label="Finish or abandon the current run to edit loadout." tone="danger"></app-tag>
        }
        @if (activeWeapon; as weapon) {
          <div class="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm text-[#A4A4B5]">
            <div>
              <p class="text-base font-semibold text-white">{{ weapon.name }}</p>
              <p class="text-xs text-[#7F7F95]">{{ weapon.description }}</p>
              <div class="mt-2 flex flex-wrap gap-3 text-xs">
                <span class="rounded-full bg-white/5 px-2 py-1">{{ weaponFlatLabel(weapon) }}</span>
                <span class="rounded-full bg-white/5 px-2 py-1">{{ weaponSecondaryLabel(weapon) }}</span>
              </div>
            </div>
            <app-button
              label="Change Weapon"
              variant="secondary"
              (click)="openWeaponModal()"
              [disabled]="loadoutLocked"
            ></app-button>
          </div>
        } @else {
          <div class="mt-3 text-sm text-[#A4A4B5]">No weapon equipped.</div>
        }
      </app-panel>

      <app-panel title="Sigils" subtitle="Five sigils define your combat identity.">
        @if (loadoutLocked) {
          <app-tag label="Loadout locked during active run." tone="danger"></app-tag>
        }
        <div class="mt-3 grid gap-3 md:grid-cols-2">
          @for (slot of sigilSlots; track slot.slot) {
            <app-card
              [title]="ringSlotLabel(slot.slot)"
              [subtitle]="slot.ring ? slot.ring.name : 'Empty slot'"
              [interactive]="!loadoutLocked"
              (click)="loadoutLocked ? null : openRingModal(slot.slot)"
            >
              <div class="flex flex-col gap-2 text-sm text-[#A4A4B5]">
                @if (slot.ring; as ring) {
                  <p class="text-xs text-[#7F7F95]">{{ ringStatLabel(ring.mainStat) }}</p>
                  <div class="grid grid-cols-2 gap-1 text-[11px] text-[#7F7F95]">
                    @for (stat of ring.subStats; track stat.type) {
                      <span>{{ ringStatLabel(stat) }}</span>
                    }
                  </div>
                } @else {
                  <p class="text-xs text-[#7F7F95]">Tap to equip a sigil.</p>
                }
              </div>
              <div class="mt-3 flex justify-end">
                <app-button
                  [label]="slot.ring ? 'Change' : 'Equip'"
                  variant="secondary"
                  size="sm"
                  (click)="$event.stopPropagation(); openRingModal(slot.slot)"
                  [disabled]="loadoutLocked"
                ></app-button>
              </div>
            </app-card>
          }
        </div>
        <div class="mt-4 flex flex-wrap gap-2 text-xs text-[#7F7F95]">
          @if (!sigilSetStatus.length) {
            <span>No sets active.</span>
          } @else {
            @for (status of sigilSetStatus; track status.key) {
              <app-tag [label]="status.label" [tone]="status.tone"></app-tag>
            }
          }
        </div>
      </app-panel>

      <app-panel title="Loadout Tips" subtitle="Applies to upcoming runs.">
        <p class="text-sm text-[#A4A4B5]">
          Weapons and sigils are snapshot when you confirm the first run room. Adjust everything here before
          starting a new run.
        </p>
      </app-panel>
    </div>

    <app-modal
      [open]="weaponModal"
      title="Select Weapon"
      subtitle="Applies to future runs."
      kicker="Weapons"
      (closed)="closeWeaponModal()"
    >
      <div class="grid gap-3">
        @for (weapon of weapons; track weapon.id) {
          <app-card
            [title]="weapon.name"
            [subtitle]="weapon.description"
            [interactive]="true"
            (click)="equipWeapon(weapon.id)"
            [ngClass]="{
              'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[#0B0B16]': isWeaponEquipped(weapon.id)
            }"
          >
            <div class="flex flex-col gap-1 text-xs text-[#A4A4B5]">
              <span>{{ weaponFlatLabel(weapon) }}</span>
              <span>{{ weaponSecondaryLabel(weapon) }}</span>
              @if (isWeaponEquipped(weapon.id)) {
                <span class="text-[10px] uppercase tracking-[0.2em] text-[var(--primary)]">Equipped</span>
              }
            </div>
          </app-card>
        }
      </div>
      <div modal-actions class="mt-4 flex justify-end">
        <app-button label="Close" variant="ghost" (click)="closeWeaponModal()"></app-button>
      </div>
    </app-modal>

    <app-modal
      [open]="ringModal"
      title="Select Sigil"
      [subtitle]="ringModalSlot ? ringSlotLabel(ringModalSlot) : ''"
      kicker="Sigils"
      (closed)="closeRingModal()"
    >
      <div class="grid gap-3">
        <app-card
          title="Unequip"
          subtitle="Clear this slot."
          [interactive]="true"
          (click)="equipRingToSlot(null)"
        >
          <p class="text-xs text-[#7F7F95]">Remove any sigil assigned to this slot.</p>
        </app-card>
        @for (ring of ringInventory; track ring.id) {
          <app-card
            [title]="ring.name"
            [subtitle]="ring.description"
            [interactive]="true"
            (click)="equipRingToSlot(ring.id)"
            [ngClass]="{
              'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[#0B0B16]':
                ringModalSlot && isRingEquipped(ringModalSlot, ring.id)
            }"
          >
            <div class="text-xs text-[#A4A4B5] space-y-1">
              <span>{{ ringStatLabel(ring.mainStat) }}</span>
              <div class="grid grid-cols-2 gap-1 text-[11px] text-[#7F7F95]">
                @for (stat of ring.subStats; track stat.type) {
                  <span>{{ ringStatLabel(stat) }}</span>
                }
              </div>
              <span class="text-[10px] uppercase tracking-[0.2em] text-white/60">
                {{ ringSlotLabel(ring.slot) }} · {{ ringSetName(ring.setKey) }}
              </span>
            </div>
          </app-card>
        }
      </div>
      <div modal-actions class="mt-4 flex justify-end">
        <app-button label="Close" variant="ghost" (click)="closeRingModal()"></app-button>
      </div>
    </app-modal>
  `
})
export class LoadoutPageComponent {
  protected readonly profile = inject(ProfileStateService);
  protected readonly player = inject(PlayerStateService);
  protected readonly run = inject(RunStateService);

  protected weaponModal = false;
  protected ringModal = false;
  protected ringModalSlot: RingSlot | null = null;

  get loadoutLocked(): boolean {
    return this.run.isLoadoutLocked();
  }

  get activeKaelis() {
    return this.profile.activeKaelis();
  }

  get activeWeapon(): WeaponDefinition | null {
    const kaelis = this.activeKaelis;
    return this.profile.getEquippedWeapon(kaelis.id);
  }

  get weapons(): WeaponDefinition[] {
    return this.profile.weaponList();
  }

  get sigilSlots(): { slot: RingSlot; ring: RingDefinition | null }[] {
    return this.profile.getEquippedRingSlots(this.activeKaelis.id);
  }

  get ringInventory(): RingDefinition[] {
    return this.profile.ringInventory();
  }

  get sigilSetStatus(): { key: string; label: string; tone: 'muted' | 'success' | 'accent' }[] {
    const counts = this.profile.getRingSetCounts(this.activeKaelis.id);
    return Object.entries(SIGIL_SETS).map(([key, def]) => {
      const typedKey = key as RingSetKey;
      const count = counts[typedKey] ?? 0;
      let tone: 'muted' | 'success' | 'accent' = 'muted';
      let suffix = '';
      if (count >= 5) {
        tone = 'accent';
        suffix = ' (5pc active)';
      } else if (count >= 3) {
        tone = 'success';
        suffix = ' (3pc active)';
      }
      return { key, label: `${def.name}: ${count}/5${suffix}`, tone };
    });
  }

  openWeaponModal(): void {
    if (this.loadoutLocked) return;
    this.weaponModal = true;
  }

  closeWeaponModal(): void {
    this.weaponModal = false;
  }

  equipWeapon(id: WeaponId): void {
    if (this.loadoutLocked) return;
    const kaelis = this.activeKaelis;
    const weapon = this.profile.getWeaponById(id);
    if (!weapon) {
      this.weaponModal = false;
      return;
    }
    this.profile.setEquippedWeapon(kaelis.id, id);
    this.refreshPlayerEquipment();
    this.weaponModal = false;
  }

  isWeaponEquipped(id: WeaponId): boolean {
    return this.activeWeapon?.id === id;
  }

  openRingModal(slot: RingSlot): void {
    if (this.loadoutLocked) return;
    this.ringModalSlot = slot;
    this.ringModal = true;
  }

  closeRingModal(): void {
    this.ringModal = false;
    this.ringModalSlot = null;
  }

  equipRingToSlot(ringId: RingId | null): void {
    if (this.loadoutLocked) return;
    const kaelis = this.activeKaelis;
    const slot = this.ringModalSlot;
    if (!slot) {
      this.closeRingModal();
      return;
    }
    this.profile.equipRing(kaelis.id, slot, ringId);
    this.refreshPlayerEquipment();
    this.closeRingModal();
  }

  isRingEquipped(slot: RingSlot, ringId: RingId): boolean {
    return this.sigilSlots.some(entry => entry.slot === slot && entry.ring?.id === ringId);
  }

  weaponFlatLabel(weapon: WeaponDefinition): string {
    return weapon.flatStat.type === 'atk'
      ? `ATK +${weapon.flatStat.value}`
      : `HP +${weapon.flatStat.value}`;
  }

  weaponSecondaryLabel(weapon: WeaponDefinition): string {
    if (weapon.secondaryStat.type === 'energyRegen') {
      return `Energy Regen +${weapon.secondaryStat.value}%`;
    }
    const percent = Math.round(weapon.secondaryStat.value * 100);
    return weapon.secondaryStat.type === 'critRate'
      ? `Crit Rate +${percent}%`
      : `Crit DMG +${percent}%`;
  }

  ringSlotLabel(slot: RingSlot): string {
    const index = RING_SLOTS.indexOf(slot);
    return index >= 0 ? `Slot ${index + 1}` : slot;
  }

  ringStatLabel(stat: RingStat): string {
    switch (stat.type) {
      case 'hp_flat':
        return `HP +${stat.value}`;
      case 'atk_flat':
        return `ATK +${stat.value}`;
      case 'hp_percent':
        return `HP +${stat.value}%`;
      case 'atk_percent':
        return `ATK +${stat.value}%`;
      case 'crit_rate_percent':
        return `Crit Rate +${Math.round(stat.value * 100)}%`;
      case 'crit_damage_percent':
        return `Crit DMG +${Math.round(stat.value * 100)}%`;
      case 'damage_percent':
        return `DMG +${stat.value}%`;
      case 'energy_regen_percent':
        return `Energy Regen +${stat.value}%`;
      case 'damage_reduction_percent':
        return `DR +${stat.value}%`;
      case 'heal_percent':
        return `Heal +${stat.value}%`;
      default:
        return '';
    }
  }

  ringSetName(key: string): string {
    return SIGIL_SETS[key]?.name ?? 'Set';
  }

  private refreshPlayerEquipment(): void {
    const snapshot = this.profile.getActiveSnapshot();
    const weapon = this.profile.getEquippedWeapon(snapshot.id);
    const rings = this.profile.getEquippedRings(snapshot.id);
    this.player.applyEquipment(snapshot, weapon, rings);
  }
}
