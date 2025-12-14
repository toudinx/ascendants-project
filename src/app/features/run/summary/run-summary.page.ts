import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppPanelComponent, AppTagComponent, AppButtonComponent, AppCardComponent, SkinCardComponent } from '../../../shared/components';
import { RunStateService } from '../../../core/services/run-state.service';
import { SkinStateService } from '../../../core/services/skin-state.service';

@Component({
  selector: 'app-run-summary-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppPanelComponent, AppTagComponent, AppButtonComponent, AppCardComponent, SkinCardComponent],
  template: `
    <app-header [title]="title" subtitle="Routes, evolutions and quick stats." kicker="Run"></app-header>

    <div class="space-y-4">
      <app-panel title="Skin in Use" subtitle="Run identity visual">
        <div class="max-w-xs">
          <app-skin-card [skin]="currentSkin" [showInUse]="true" class="transition-transform duration-200 ease-out hover:scale-[1.02]"></app-skin-card>
        </div>
      </app-panel>

      <app-panel title="Final Routes" subtitle="Level distribution">
        <div class="grid gap-3 md:grid-cols-3">
          @for (route of run.routes(); track route.route) {
            <app-card [title]="route.title" [subtitle]="route.emphasis" [tag]="'Lv ' + route.level">
              <div class="text-sm text-[#A4A4B5]">Route {{ route.route }}</div>
            </app-card>
          }
        </div>
      </app-panel>

      <app-panel title="Evolutions" subtitle="Transformational moments">
        <div class="flex flex-wrap gap-2">
          @for (evo of run.evolutions(); track evo) {
            <app-tag [label]="evo" tone="accent"></app-tag>
          }
          @if (!run.evolutions().length) {
            <app-tag label="No evolutions" tone="muted"></app-tag>
          }
        </div>
      </app-panel>

      <app-panel title="Stats">
        <div class="grid gap-3 text-sm text-[#A4A4B5] md:grid-cols-3">
          <app-card title="Rooms cleared" [subtitle]="run.currentRoom() + ' of ' + run.totalRooms()" [interactive]="false"></app-card>
          <app-card title="Upgrades obtained" [subtitle]="totalUpgrades + ''" [interactive]="false"></app-card>
          <app-card title="Result" [subtitle]="resultLabel" [interactive]="false"></app-card>
        </div>
      </app-panel>

      <div class="flex flex-col gap-2 md:flex-row md:justify-end">
        <app-button label="Back to Hub" variant="ghost" (click)="finishRun()"></app-button>
        <app-button label="Play Again" variant="primary" (click)="restart()"></app-button>
      </div>
    </div>
  `
})
export class RunSummaryPageComponent {
  protected readonly run = inject(RunStateService);
  protected readonly skinState = inject(SkinStateService);

  get title(): string {
    switch (this.run.result()) {
      case 'victory':
        return 'Victory!';
      case 'defeat':
        return 'Defeat...';
      case 'fled':
        return 'You fled the run.';
      default:
        return 'Run Summary';
    }
  }

  get resultLabel(): string {
    switch (this.run.result()) {
      case 'victory':
        return 'Victory';
      case 'defeat':
        return 'Defeat';
      case 'fled':
        return 'Fled';
      default:
        return 'Undefined';
    }
  }

  get totalUpgrades(): number {
    const levels = this.run.routeLevels();
    return levels.A + levels.B + levels.C;
  }

  get currentSkin() {
    return this.skinState.currentSkin();
  }

  restart(): void {
    this.run.resetToStart();
  }

  finishRun(): void {
    this.run.finishRun();
  }
}
