import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent, AppCardComponent } from '../index';
import { RunStateService } from '../../../core/services/run-state.service';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { EnemyStateService } from '../../../core/services/enemy-state.service';

const SHOW_DEBUG_PANEL = true;

@Component({
  selector: 'app-run-debug-panel',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppCardComponent],
  template: `
    <div *ngIf="SHOW" class="fixed bottom-4 right-4 z-40 w-[320px] space-y-2 rounded-[14px] border border-white/10 bg-black/70 p-3 text-xs text-white shadow-neon">
      <div class="flex items-center justify-between">
        <span class="uppercase tracking-[0.12em] text-[#A4A4B5]">Debug Run</span>
        <span class="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/80">{{ run.phase() }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <app-card [interactive]="false" title="Room" [subtitle]="run.currentRoom() + '/' + run.totalRooms()"></app-card>
        <app-card [interactive]="false" title="Type" [subtitle]="run.roomType()"></app-card>
        <app-card [interactive]="false" title="Routes" [subtitle]="'A ' + run.routeLevels().A + ' - B ' + run.routeLevels().B + ' - C ' + run.routeLevels().C"></app-card>
        <app-card [interactive]="false" title="Outcome" [subtitle]="run.result()"></app-card>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <app-button label="Force Win" variant="secondary" (click)="enemy.forceKill()"></app-button>
        <app-button label="Force Loss" variant="danger" (click)="player.applyDamage(9999, 9999)"></app-button>
        <app-button label="Skip Reward" variant="ghost" (click)="run.goToReward()"></app-button>
        <app-button label="Skip Prep" variant="ghost" (click)="run.goToPrep()"></app-button>
      </div>
    </div>
  `
})
export class RunDebugPanelComponent {
  protected readonly run = inject(RunStateService);
  protected readonly player = inject(PlayerStateService);
  protected readonly enemy = inject(EnemyStateService);
  readonly SHOW = SHOW_DEBUG_PANEL;
}
