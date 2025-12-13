import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  AppHeaderComponent,
  AppPanelComponent,
  AppButtonComponent,
  AppCardComponent,
  AppTagComponent,
  PremiumTeaseComponent
} from '../../shared/components';
import { RunStateService } from '../../core/services/run-state.service';
import { SkinStateService } from '../../core/services/skin-state.service';

@Component({
  selector: 'app-hub-page',
  standalone: true,
  imports: [
    CommonModule,
    AppHeaderComponent,
    AppPanelComponent,
    AppButtonComponent,
    AppCardComponent,
    AppTagComponent,
    PremiumTeaseComponent
  ],
  template: `
    <app-header title="Hub" subtitle="Plan your next ascension run with Velvet." kicker="Velvet"></app-header>

    <div class="grid gap-4 md:grid-cols-[1.3fr,1fr]">
      <app-panel title="Velvet" subtitle="Ready for the next run">
        <div class="flex flex-col gap-4 md:flex-row md:items-center">
          <div class="relative h-40 w-full rounded-[16px] bg-gradient-to-br from-[#8A7CFF]/40 via-[#E28FE8]/20 to-[#050511] md:h-48 md:w-40">
            <div class="absolute inset-3 rounded-[12px] border border-white/12 bg-white/5"></div>
            <div class="absolute bottom-2 left-2 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80">
              <span class="h-2 w-2 rounded-full bg-[#2DE3C8]"></span>
              {{ skinState.currentSkin().name }}
            </div>
          </div>
          <div class="flex-1 space-y-3">
            <div class="flex flex-wrap gap-2">
              <app-tag label="Sentinel" tone="accent"></app-tag>
              <app-tag label="Ruin" tone="muted"></app-tag>
              <app-tag label="Resonance" tone="muted"></app-tag>
            </div>
            <p class="text-sm text-[#A4A4B5]">
              Short loop, explosive tick cadence and premium waifu fantasy. Pick a starting route and dive in.
            </p>
            <div class="flex flex-col gap-2">
              <app-button label="Start Run" variant="primary" (click)="startRun()"></app-button>
              <div class="grid grid-cols-2 gap-2">
                <app-button label="Inventory" variant="secondary" (click)="router.navigate(['/inventory'])"></app-button>
                <app-button label="Store" variant="ghost" (click)="router.navigate(['/store'])"></app-button>
                <app-button label="Collection" variant="ghost" (click)="router.navigate(['/collection'])"></app-button>
                <app-button label="Gacha" variant="ghost" (click)="router.navigate(['/gacha'])"></app-button>
              </div>
            </div>
            <premium-tease size="compact"></premium-tease>
            <div class="rounded-[12px] border border-white/10 bg-white/5 p-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-[#A4A4B5]">Banner</p>
                  <p class="text-sm font-semibold text-white">{{ bannerCopyTitle }}</p>
                  <p class="text-xs text-[#A4A4B5]">{{ bannerCopySubtitle }}</p>
                </div>
                <app-button label="Go to Gacha" variant="primary" class="max-w-[150px]" (click)="router.navigate(['/gacha'])"></app-button>
              </div>
            </div>
          </div>
        </div>
      </app-panel>

      <div class="space-y-4">
        <app-card title="Daily Login" subtitle="Claim your daily reward and boost the run." [interactive]="false">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-sm text-[#A4A4B5]">Today's bonus</p>
              <div class="flex items-center gap-2">
                <app-tag label="+1 Reroll" tone="accent"></app-tag>
                <app-tag label="Potion" tone="success"></app-tag>
              </div>
            </div>
            <app-button label="Claim" variant="primary"></app-button>
          </div>
        </app-card>
        <app-card title="Quick Goal" subtitle="Clear 3 rooms to unlock a showcase skin." [interactive]="false">
          <div class="flex items-center justify-between">
            <div class="space-y-1 text-sm text-[#A4A4B5]">
              <p>Rooms cleared: {{ Math.max(0, runState.currentRoom() - 1) }}</p>
              <p>Evolutions claimed: {{ runState.evolutions().length }}</p>
            </div>
            <premium-tease size="compact"></premium-tease>
          </div>
        </app-card>
      </div>
    </div>
  `
})
export class HubPageComponent {
  protected readonly runState = inject(RunStateService);
  protected readonly router = inject(Router);
  protected readonly skinState = inject(SkinStateService);
  protected readonly Math = Math;

  get bannerCopyTitle(): string {
    return this.hasSSRUnlocked ? 'Live Event: SR/SSR skins unlocked' : 'New Banner: Velvet Eternal Ascendant';
  }

  get bannerCopySubtitle(): string {
    return this.hasSSRUnlocked ? 'Pull SR/SSR skins to remix the look.' : 'Live now on the premium gacha.';
  }

  private get hasSSRUnlocked(): boolean {
    return !!this.skinState.skins().find(s => s.id === 'ascendente-eterna' && s.unlocked);
  }

  startRun(): void {
    this.runState.resetToStart();
  }
}
