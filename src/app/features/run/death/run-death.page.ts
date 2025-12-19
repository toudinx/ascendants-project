import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppTagComponent, AppButtonComponent, AppCardComponent } from '../../../shared/components';
import { RunStateService } from '../../../core/services/run-state.service';

@Component({
  selector: 'app-run-death-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppTagComponent, AppButtonComponent, AppCardComponent],
  template: `
    <app-header title="You fell" subtitle="The ruin never forgives. Rise and try again." kicker="Defeat"></app-header>
    <div class="space-y-4">
      <div class="relative overflow-hidden rounded-[18px] border border-[#FF5A78]/40 glass p-6 md:p-8">
        <div class="absolute inset-0 opacity-30 blur-3xl">
          <div class="absolute left-0 top-0 h-40 w-40 rounded-full bg-[#FF5A78]/25"></div>
          <div class="absolute right-0 bottom-0 h-52 w-52 rounded-full bg-[var(--secondary)]/20"></div>
        </div>
        <div class="relative grid gap-4 md:grid-cols-2">
          <app-card title="Room reached" [subtitle]="run.currentRoom() + '/' + run.totalRooms()" [interactive]="false"></app-card>
          <app-card title="Trilhas finais" [subtitle]="'A ' + levels.A + ' - B ' + levels.B + ' - C ' + levels.C" [interactive]="false"></app-card>
          <app-card title="Damage dealt" subtitle="~12.4k (mock)" [interactive]="false"></app-card>
          <app-card title="Run time" subtitle="~4m32s (mock)" [interactive]="false"></app-card>
        </div>
        <div class="mt-4 flex gap-2">
          <app-tag label="Defeat" tone="danger"></app-tag>
          <app-tag label="Tick-based" tone="muted"></app-tag>
        </div>
      </div>
      <div class="flex flex-col gap-2 md:flex-row md:justify-end">
        <app-button label="View Summary" variant="secondary" (click)="goSummary()"></app-button>
        <app-button label="Back to Hub" variant="ghost" (click)="finishRun()"></app-button>
        <app-button label="Try Again" variant="primary" (click)="restart()"></app-button>
      </div>
    </div>
  `
})
export class RunDeathPageComponent {
  protected readonly run = inject(RunStateService);

  get levels() {
    return this.run.trackLevels();
  }

  restart(): void {
    this.run.resetToStart();
  }

  goSummary(): void {
    this.run.goToSummary();
  }

  finishRun(): void {
    this.run.finishRun();
  }
}
