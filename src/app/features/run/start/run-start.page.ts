import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppPanelComponent, AppCardComponent, AppButtonComponent, AppTagComponent, AppStatBarComponent, PremiumTeaseComponent } from '../../../shared/components';
import { RunStateService } from '../../../core/services/run-state.service';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { RouteKey } from '../../../core/models/routes.model';

interface RouteOption {
  key: RouteKey;
  name: string;
  fantasy: string;
  tag: string;
}

@Component({
  selector: 'app-run-start-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppPanelComponent, AppCardComponent, AppButtonComponent, AppTagComponent, AppStatBarComponent, PremiumTeaseComponent],
  template: `
    <app-header
      title="Choose your Starting Route"
      subtitle="Define the tone of your run: Critical, Spiritual, or Impact builds."
      kicker="Run"
    ></app-header>

    <div class="grid gap-4 md:grid-cols-[1fr,1.2fr]">
      <app-panel title="Velvet" subtitle="Quick status">
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="h-24 w-20 rounded-[12px] bg-gradient-to-br from-[#8A7CFF]/40 to-[#E28FE8]/20"></div>
            <div class="flex-1 space-y-2">
              <app-stat-bar label="HP" [current]="player.state().attributes.hp" [max]="player.state().attributes.maxHp" tone="hp"></app-stat-bar>
              <app-stat-bar label="Posture" [current]="player.state().attributes.posture" [max]="player.state().attributes.maxPosture" tone="posture"></app-stat-bar>
              <app-stat-bar label="Energy" [current]="player.state().attributes.energy" [max]="player.state().attributes.maxEnergy" tone="energy"></app-stat-bar>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <app-tag label="Tick-based" tone="accent"></app-tag>
            <app-tag label="Auto-battle" tone="muted"></app-tag>
            <app-tag label="Waifu" tone="accent"></app-tag>
          </div>
        </div>
      </app-panel>

      <div class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3">
          <app-card
            *ngFor="let route of routes"
            [title]="route.name"
            [subtitle]="route.fantasy"
            [tag]="route.tag"
            [interactive]="true"
            (click)="selectRoute(route.key)"
            [ngClass]="{ 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[#0B0B16]': selectedRoute === route.key }"
          >
            <div class="flex flex-col gap-2 text-sm text-[#A4A4B5]">
              <p>Initial identity for your build.</p>
              <app-tag *ngIf="selectedRoute === route.key" label="Selected" tone="success"></app-tag>
            </div>
          </app-card>
        </div>
        <div class="flex items-center justify-between gap-3">
          <premium-tease size="compact"></premium-tease>
          <div class="flex gap-2">
            <app-button label="Back" variant="ghost" (click)="cancel()"></app-button>
            <app-button label="Confirm" variant="primary" [disabled]="!selectedRoute" (click)="confirm()"></app-button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RunStartPageComponent implements OnInit {
  protected readonly runState = inject(RunStateService);
  protected readonly player = inject(PlayerStateService);

  protected routes: RouteOption[] = [
    { key: 'A', name: 'Critical', fantasy: 'Sentinel + multi-hit', tag: 'A' },
    { key: 'B', name: 'Spiritual', fantasy: 'Ruin + DoT', tag: 'B' },
    { key: 'C', name: 'Impact', fantasy: 'Resonance + posture', tag: 'C' }
  ];

  protected selectedRoute?: RouteKey;

  ngOnInit(): void {
    if (this.runState.phase() === 'idle' || this.runState.phase() === 'finished') {
      this.runState.phase.set('start');
    }
  }

  selectRoute(route: RouteKey): void {
    this.selectedRoute = route;
  }

  confirm(): void {
    if (!this.selectedRoute) return;
    this.runState.startRun(this.selectedRoute);
  }

  cancel(): void {
    this.runState.finishRun();
  }
}
