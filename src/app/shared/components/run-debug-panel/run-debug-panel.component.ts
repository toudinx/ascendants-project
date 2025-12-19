import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent, AppCardComponent } from '../index';
import { RunStateService } from '../../../core/services/run-state.service';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { EnemyStateService } from '../../../core/services/enemy-state.service';
import { getPlayerPowerMultiplier, roomToStage } from '../../../core/config/balance.config';

declare const ngDevMode: boolean;

const SHOW_DEBUG_PANEL = typeof ngDevMode === 'undefined' || !!ngDevMode;

@Component({
  selector: 'app-run-debug-panel',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppCardComponent],
  template: `
    @if (SHOW) {
<div class="fixed bottom-4 right-4 z-40 w-[320px] space-y-2 rounded-[14px] border border-white/10 bg-black/70 p-3 text-xs text-white shadow-neon">
      <div class="flex items-center justify-between">
        <span class="uppercase tracking-[0.12em] text-[#A4A4B5]">Debug Run</span>
        <span class="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/80">{{ run.phase() }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <app-card [interactive]="false" title="Room" [subtitle]="run.currentRoom() + '/' + run.totalRooms()"></app-card>
        <app-card [interactive]="false" title="Type" [subtitle]="run.roomType()"></app-card>
        <app-card [interactive]="false" title="Stage" [subtitle]="roomStage"></app-card>
        <app-card [interactive]="false" title="Power" [subtitle]="playerPowerLabel"></app-card>
        <app-card [interactive]="false" title="Trilhas" [subtitle]="'A ' + run.trackLevels().A + ' - B ' + run.trackLevels().B + ' - C ' + run.trackLevels().C"></app-card>
        <app-card [interactive]="false" title="Outcome" [subtitle]="run.result()"></app-card>
      </div>
      <div class="rounded-[12px] border border-white/10 bg-white/5 p-2">
        <p class="text-[10px] uppercase tracking-[0.3em] text-[#7F7F95]">Kaelis Stats</p>
        <div class="mt-2 grid grid-cols-2 gap-1 text-[11px] text-white/80">
          <span>HP {{ player.state().attributes.hp }}/{{ player.state().attributes.maxHp }}</span>
          <span>ATK {{ player.state().attributes.attack }}</span>
          <span>Crit {{ (player.state().attributes.critChance * 100) | number: '1.0-0' }}%</span>
          <span>DMG% {{ player.state().attributes.damageBonusPercent | number: '1.0-0' }}%</span>
        </div>
      </div>
      <div class="rounded-[12px] border border-white/10 bg-white/5 p-2">
        <p class="text-[10px] uppercase tracking-[0.3em] text-[#7F7F95]">Enemy Stats</p>
        <div class="mt-2 grid grid-cols-2 gap-1 text-[11px] text-white/80">
          <span>HP {{ enemy.enemy().attributes.hp }}/{{ enemy.enemy().attributes.maxHp }}</span>
          <span>ATK {{ enemy.enemy().attributes.attack }}</span>
          <span>Posture {{ enemy.enemy().attributes.posture }}/{{ enemy.enemy().attributes.maxPosture }}</span>
          <span>Crit {{ (enemy.enemy().attributes.critChance * 100) | number: '1.0-0' }}%</span>
        </div>
      </div>
      <div class="rounded-[12px] border border-white/10 bg-white/5 p-2">
        <p class="text-[10px] uppercase tracking-[0.3em] text-[#7F7F95]">Run Upgrades</p>
        <div class="mt-2 flex flex-wrap gap-1 text-[11px] text-white/70">
          @if (!activeRunUpgrades.length) {
            <span class="text-[#7F7F95]">None</span>
          } @else {
            @for (upgrade of activeRunUpgrades; track upgrade.id) {
              <span class="rounded-full bg-white/10 px-2 py-1">{{ upgrade.name }}</span>
            }
          }
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <app-button label="Force Win" variant="secondary" (click)="enemy.forceKill()"></app-button>
        <app-button label="Force Loss" variant="danger" (click)="player.applyDamage(9999, 9999)"></app-button>
        <app-button label="Skip Reward" variant="ghost" (click)="run.goToReward()"></app-button>
        <app-button label="Skip Prep" variant="ghost" (click)="run.goToPrep()"></app-button>
      </div>
    </div>
}
  `
})
export class RunDebugPanelComponent {
  protected readonly run = inject(RunStateService);
  protected readonly player = inject(PlayerStateService);
  protected readonly enemy = inject(EnemyStateService);
  readonly SHOW = SHOW_DEBUG_PANEL;

  get activeRunUpgrades() {
    return this.run.getRunUpgrades();
  }

  get roomStage(): string {
    return roomToStage(this.run.currentRoom());
  }

  get playerPowerLabel(): string {
    const power = getPlayerPowerMultiplier(this.run.currentRoom());
    return `${Math.round(power * 100)}%`;
  }
}
