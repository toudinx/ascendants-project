import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AppHeaderComponent,
  AppPanelComponent,
  AppStatBarComponent,
  AppButtonComponent,
  AppTagComponent,
  AppCardComponent,
  AppModalComponent,
  PremiumTeaseComponent,
  UpgradeCardComponent
} from '../../../shared/components';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { RunStateService } from '../../../core/services/run-state.service';
import { UpgradeOption } from '../../../core/models/upgrades.model';
import { TrackKey, TrackProgress } from '../../../core/models/tracks.model';
import { UiStateService } from '../../../core/services/ui-state.service';
import { RunUpgrade } from '../../../core/models/run.model';
import { UpgradeDuration } from '../../../content/upgrades/upgrade.types';

@Component({
  selector: 'app-run-intermission-page',
  standalone: true,
  imports: [
    CommonModule,
    AppHeaderComponent,
    AppPanelComponent,
    AppStatBarComponent,
    AppButtonComponent,
    AppTagComponent,
    AppCardComponent,
    AppModalComponent,
    PremiumTeaseComponent,
    UpgradeCardComponent
  ],
  template: `
    <app-header
      title="Intermission"
      [subtitle]="'Room ' + run.currentRoom() + '/' + run.totalRooms() + ' cleared'"
      kicker="Run"
    ></app-header>

    <div class="space-y-5">
      <div class="rounded-[16px] border border-white/10 bg-white/5 p-4 text-sm text-[#A4A4B5]">
        <p class="text-xs uppercase tracking-[0.3em] text-[#7F7F95]">Tracks</p>
        <div class="mt-2 flex flex-wrap gap-2">
          @for (track of trackLevels; track track.track) {
            <app-tag [label]="trackChipLabel(track)" tone="accent"></app-tag>
          }
          <app-tag [label]="dominantTrackLabel" tone="success"></app-tag>
        </div>
        <p class="mt-4 text-xs uppercase tracking-[0.3em] text-[#7F7F95]">Active upgrades</p>
        <div class="mt-2 space-y-2">
          @if (!activeRunUpgrades.length) {
            <app-tag label="No upgrades yet" tone="muted"></app-tag>
          } @else {
            @for (upgrade of activeRunUpgrades; track upgrade.id) {
              <div class="rounded-[12px] border border-white/10 bg-white/5 p-3">
                <div class="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#7F7F95]">
                  <span>{{ upgrade.name }}</span>
                  <span>{{ formatDuration(upgrade.duration) }}</span>
                </div>
                <ul class="mt-2 space-y-1 text-sm text-[#A4A4B5]">
                  @for (effect of upgrade.effects; track effect.text) {
                    <li class="flex items-start gap-2">
                      <span class="text-[12px] text-white/80">{{ effect.icon || '*' }}</span>
                      <span>{{ effect.text }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
          }
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div class="space-y-4">
          <app-panel title="Tactical Prep" subtitle="Room overview before the next fight">
            <div class="grid gap-3 md:grid-cols-2">
              <app-stat-bar
                label="HP"
                [current]="player.state().attributes.hp"
                [max]="player.state().attributes.maxHp"
                tone="hp"
                [warnAt]="0.2"
              ></app-stat-bar>
              <app-stat-bar
                label="Posture"
                [current]="player.state().attributes.posture"
                [max]="player.state().attributes.maxPosture"
                tone="posture"
              ></app-stat-bar>
              <app-stat-bar
                label="Energy"
                [current]="player.state().attributes.energy"
                [max]="player.state().attributes.maxEnergy"
                tone="energy"
              ></app-stat-bar>
              <div class="flex flex-wrap gap-2">
                @if (player.state().buffs?.length) {
                  @for (buff of player.state().buffs; track buff.name) {
                    <app-tag [label]="buff.name" [tone]="buff.type === 'buff' ? 'success' : 'danger'"></app-tag>
                  }
                } @else {
                  <app-tag label="No active buffs" tone="muted"></app-tag>
                }
              </div>
            </div>
          </app-panel>

          <div class="grid gap-4 md:grid-cols-2">
            <app-panel title="Potions" subtitle="Recover before the next room">
              <div class="grid grid-cols-2 gap-3">
                <app-card title="Restorative Potion" subtitle="+30% HP" [interactive]="false">
                  <div class="space-y-2 text-sm text-[#A4A4B5]">
                    <p>Recover a chunk of HP instantly.</p>
                    <app-button
                      label="Use Potion"
                      variant="secondary"
                      (click)="usePotion()"
                      [disabled]="!hasPotion"
                    ></app-button>
                    <p class="text-xs text-[#A4A4B5]">
                      Potions: {{ run.potions() }} / {{ run.potionCap }}
                    </p>
                  </div>
                </app-card>
                <app-card title="Empty slot" subtitle="Space for future items" [interactive]="false">
                  <app-button label="Coming soon" variant="ghost" [disabled]="true"></app-button>
                </app-card>
              </div>
            </app-panel>

            <app-panel title="Next Room" subtitle="Quick intel">
              <div class="flex flex-col gap-2 text-sm text-[#A4A4B5]">
                <p>Next: Room {{ nextRoomNumber }} / {{ run.totalRooms() }}</p>
                <p>Type: {{ nextRoomLabel }}</p>
                <p>Dominant track: {{ dominantTrackName }}</p>
                <p>Tracks: A {{ trackLevelsRecord.A }} / B {{ trackLevelsRecord.B }} / C {{ trackLevelsRecord.C }}</p>
                <p>Rerolls available: {{ run.rerollsAvailable() }}</p>
              </div>
            </app-panel>
          </div>

          <app-panel title="Next Fight Stats" subtitle="Final computed stats for the next battle">
            <div class="grid gap-2 text-sm text-[#A4A4B5] md:grid-cols-2">
              @for (stat of nextFightStats; track stat.label) {
                <div class="flex items-center justify-between rounded-[10px] bg-white/5 px-3 py-2">
                  <span class="text-[#7F7F95]">{{ stat.label }}</span>
                  <span class="text-white">{{ stat.value }}</span>
                </div>
              }
            </div>
          </app-panel>

          <div class="flex flex-col gap-2 md:flex-row md:justify-end">
            <app-button label="Abandon Run" variant="ghost" (click)="openAbandonModal()"></app-button>
            <app-button label="Continue" variant="primary" [disabled]="!canContinue" (click)="continueBattle()"></app-button>
          </div>
        </div>

        <div class="space-y-4">
          <app-panel title="Choose your Upgrade" subtitle="Confirm one option before continuing">
            @if (upgradeLocked) {
              <div class="rounded-[12px] border border-white/10 bg-white/5 p-3 text-sm text-[#A4A4B5]">
                @if (confirmedUpgrade) {
                  <p class="text-white">Upgrade confirmed: {{ confirmedUpgrade.upgrade.name }}</p>
                  <ul class="mt-2 space-y-1 text-xs text-[#7F7F95]">
                    @for (effect of confirmedUpgrade.upgrade.effects; track effect.text) {
                      <li class="flex items-start gap-2">
                        <span class="text-[11px] text-white/70">{{ effect.icon || '*' }}</span>
                        <span>{{ effect.text }}</span>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="text-white">Upgrade skipped.</p>
                  <p class="text-xs text-[#7F7F95]">You can continue to the next room.</p>
                }
              </div>
            } @else {
              <div class="grid gap-3">
                @for (upgrade of upgrades; track upgrade.id) {
                  <app-upgrade-card
                    [upgrade]="upgrade.upgrade"
                    [selected]="selectedUpgrade?.id === upgrade.id"
                    [disabled]="!!upgrade.disabledReason"
                    [disabledReason]="upgrade.disabledReason"
                    (click)="select(upgrade)"
                  ></app-upgrade-card>
                }
              </div>
            }

            <div class="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div class="flex items-center gap-2">
                <app-button label="Reroll" variant="secondary" (click)="reroll()" [disabled]="!canReroll"></app-button>
                <app-premium-tease size="compact" title="Premium reroll" subtitle="More chances soon."></app-premium-tease>
              </div>
              <div class="flex flex-wrap gap-2">
                <app-button
                  label="Confirm Upgrade"
                  variant="primary"
                  [disabled]="!canConfirm"
                  (click)="confirmUpgrade()"
                ></app-button>
                <app-button
                  label="Skip Upgrade"
                  variant="ghost"
                  [disabled]="upgradeLocked"
                  (click)="skipUpgrade()"
                ></app-button>
              </div>
            </div>
          </app-panel>
        </div>
      </div>
    </div>

    <app-modal
      [open]="abandonModal"
      title="Abandon run?"
      subtitle="You will keep the rewards collected so far."
      kicker="Confirmation"
      (closed)="abandonModal = false"
    >
      <div class="text-sm text-[#A4A4B5]">
        Are you sure you want to abandon the run?
      </div>
      <div modal-actions class="flex gap-2">
        <app-button label="Cancel" variant="ghost" (click)="abandonModal = false"></app-button>
        <app-button label="Yes, abandon" variant="danger" (click)="abandon()"></app-button>
      </div>
    </app-modal>
  `
})
export class RunIntermissionPageComponent {
  protected readonly player = inject(PlayerStateService);
  protected readonly run = inject(RunStateService);
  protected readonly ui = inject(UiStateService);
  protected abandonModal = false;

  protected selectedUpgrade?: UpgradeOption;
  protected confirmedUpgrade?: UpgradeOption;
  protected skippedUpgrade = false;

  get upgrades(): UpgradeOption[] {
    return this.run.availableUpgrades();
  }

  get trackLevels(): TrackProgress[] {
    return this.run.tracks();
  }

  get dominantTrackLabel(): string {
    const tracks = this.trackLevels;
    if (!tracks.length) return 'Dominant: N/A';
    const dominant = tracks.reduce((best, track) => (track.level > best.level ? track : best));
    return `Dominant: ${dominant.title} Lv ${dominant.level}`;
  }

  get dominantTrackName(): string {
    const tracks = this.trackLevels;
    if (!tracks.length) return 'N/A';
    const dominant = tracks.reduce((best, track) => (track.level > best.level ? track : best));
    return `${dominant.title} Lv ${dominant.level}`;
  }

  get activeRunUpgrades(): RunUpgrade[] {
    return this.run.getRunUpgrades();
  }

  get nextRoomNumber(): number {
    return Math.min(this.run.totalRooms(), this.run.currentRoom() + 1);
  }

  get nextRoomLabel(): string {
    const roomType = this.run.getRoomTypeFor(this.nextRoomNumber);
    if (roomType === 'mini-boss') return 'Mini-boss';
    if (roomType === 'boss') return 'Final Boss';
    return 'Normal';
  }

  get hasPotion(): boolean {
    return this.run.potions() > 0;
  }

  get trackLevelsRecord(): Record<TrackKey, number> {
    return this.run.trackLevels();
  }

  get canContinue(): boolean {
    return this.upgradeLocked;
  }

  get canConfirm(): boolean {
    return !!this.selectedUpgrade && !this.selectedUpgrade.disabledReason && !this.upgradeLocked;
  }

  get canReroll(): boolean {
    return this.run.rerollsAvailable() > 0 && !this.upgradeLocked;
  }

  get upgradeLocked(): boolean {
    return !!this.confirmedUpgrade || this.skippedUpgrade;
  }

  get nextFightStats(): { label: string; value: string }[] {
    const attrs = this.player.state().attributes;
    const stats = [
      { label: 'HP Max', value: `${attrs.maxHp}` },
      { label: 'ATK', value: `${attrs.attack}` },
      { label: 'Max Posture', value: `${attrs.maxPosture}` },
      { label: 'Max Energy', value: `${attrs.maxEnergy}` },
      { label: 'Crit Rate', value: `${Math.round(attrs.critChance * 100)}%` },
      { label: 'Crit DMG', value: `${Math.round(attrs.critDamage * 100)}%` },
      { label: 'Damage %', value: `${Math.round(attrs.damageBonusPercent ?? 0)}%` },
      { label: 'DR %', value: `${Math.round(attrs.damageReductionPercent ?? 0)}%` },
      { label: 'Energy Regen', value: `${Math.round(attrs.energyRegenPercent ?? 100)}%` },
      { label: 'Posture DMG', value: `${Math.round(attrs.postureDamageBonusPercent ?? 0)}%` }
    ];
    const bonuses = this.run.getPendingBattleBonuses();
    if (bonuses.energy) {
      stats.push({ label: 'Start Energy', value: `+${bonuses.energy}` });
    }
    if (bonuses.postureShield) {
      stats.push({ label: 'Start Posture', value: `+${bonuses.postureShield}` });
    }
    return stats;
  }

  trackChipLabel(track: TrackProgress): string {
    return `Track ${track.track} Lv ${track.level}`;
  }

  formatDuration(duration: UpgradeDuration): string {
    if (duration.type === 'run') return 'Run';
    if (duration.type === 'nextBattle') return 'Next battle';
    const turnLabel = duration.turns === 1 ? 'turn' : 'turns';
    return duration.ownerTurns ? `${duration.turns} ${turnLabel} (yours)` : `${duration.turns} ${turnLabel}`;
  }

  select(upgrade: UpgradeOption): void {
    if (this.upgradeLocked) return;
    if (upgrade.disabledReason) {
      this.ui.pushLog(upgrade.disabledReason);
      return;
    }
    this.selectedUpgrade = upgrade;
  }

  confirmUpgrade(): void {
    const upgrade = this.selectedUpgrade;
    if (!upgrade || this.upgradeLocked) return;
    this.run.applyUpgrade(upgrade);
    this.confirmedUpgrade = upgrade;
    this.selectedUpgrade = undefined;
  }

  skipUpgrade(): void {
    if (this.upgradeLocked) return;
    this.skippedUpgrade = true;
    this.selectedUpgrade = undefined;
  }

  reroll(): void {
    if (!this.canReroll) return;
    this.selectedUpgrade = undefined;
    this.run.rerollUpgrades();
  }

  usePotion(): void {
    this.run.consumePotion();
  }

  continueBattle(): void {
    if (!this.canContinue) return;
    this.run.finishPrepAndStartNextBattle();
  }

  openAbandonModal(): void {
    this.abandonModal = true;
  }

  abandon(): void {
    this.abandonModal = false;
    this.run.fleeRun();
  }

}
