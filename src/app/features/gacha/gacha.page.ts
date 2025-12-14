import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppHeaderComponent, AppButtonComponent, AppCardComponent, PremiumTeaseComponent, WowBurstComponent, RarityTagComponent, SkinCardComponent, AppTagComponent } from '../../shared/components';
import { SkinStateService, VelvetSkin } from '../../core/services/skin-state.service';
import { UiStateService } from '../../core/services/ui-state.service';

@Component({
  selector: 'app-gacha-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppButtonComponent, AppCardComponent, PremiumTeaseComponent, WowBurstComponent, RarityTagComponent, SkinCardComponent, AppTagComponent],
  template: `
    <app-wow-burst [trigger]="hasSSR()"></app-wow-burst>
    <app-header title="Crimson Ascension Banner" subtitle="Focus: Velvet SSR Ascendant Eternal" kicker="Gacha"></app-header>

    <div class="space-y-4">
      <app-card title="Current Banner" subtitle="Odds: SSR 2% | SR 8% | R 90%" [interactive]="false">
        <div class="grid items-center gap-3 md:grid-cols-[1.2fr,0.8fr]">
          <div class="h-48 rounded-[16px] bg-gradient-to-br from-[var(--primary)]/30 via-[var(--secondary)]/20 to-[#050511]"></div>
          <div class="space-y-2 text-sm text-[#A4A4B5]">
            <p>Summon premium visuals. No real-money payment required.</p>
            <div class="flex flex-wrap gap-2">
              <app-rarity-tag rarity="SSR"></app-rarity-tag>
              <app-rarity-tag rarity="SR"></app-rarity-tag>
              <app-rarity-tag rarity="R"></app-rarity-tag>
            </div>
            <div class="flex gap-2">
              <app-button label="Summon 1x" variant="secondary" (click)="pull(1)" [disabled]="pulling()"></app-button>
              <app-button label="Summon 10x" variant="primary" (click)="pull(10)" [disabled]="pulling()"></app-button>
            </div>
            <app-premium-tease size="compact" title="No payments" subtitle="Visual demo only."></app-premium-tease>
          </div>
        </div>
      </app-card>

      <div class="rounded-[16px] border border-white/10 bg-white/5 p-4">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm text-[#A4A4B5] uppercase tracking-[0.2em]">Pull animation</p>
          <app-tag tone="muted" label="Mock"></app-tag>
        </div>
        <div class="relative h-32 overflow-hidden rounded-[12px] bg-gradient-to-r from-[var(--primary)]/20 via-[var(--secondary)]/10 to-[#050511]">
          @if (pulling()) {
            <div class="absolute inset-0 flex items-center justify-center text-white/70 animate-pulse">
              Summoning...
            </div>
          }
          @if (!pulling() && hasResults()) {
            <div class="absolute inset-0 flex items-center justify-center text-white/60">
              Pull complete.
            </div>
          }
        </div>
      </div>

      @if (hasResults()) {
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm text-[#A4A4B5] uppercase tracking-[0.2em]">Results</p>
            <app-button label="View Collection" variant="ghost" (click)="router.navigate(['/collection'])"></app-button>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            @for (skin of results(); track skin.id) {
              <app-skin-card
                [skin]="skin"
                class="transition-transform duration-200 ease-out hover:scale-[1.02]"
                [ngClass]="{
                  'ring-2 ring-[#FFD344] ring-offset-2 ring-offset-[#0B0B16]': skin.rarity === 'SSR',
                  'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[#0B0B16]': skin.rarity === 'SR'
                }"
              ></app-skin-card>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class GachaPageComponent implements OnInit {
  protected readonly skinState = inject(SkinStateService);
  protected readonly router = inject(Router);
  protected readonly ui = inject(UiStateService);

  protected pulling = signal(false);
  protected results = signal<VelvetSkin[]>([]);
  protected hasSSR = signal(false);

  ngOnInit(): void {
    this.skinState.resetNewFlags();
    this.skinState.clearLastObtained();
  }

  hasResults(): boolean {
    return this.results().length > 0;
  }

  pull(count: number): void {
    if (this.pulling()) return;
    this.pulling.set(true);
    this.hasSSR.set(false);
    this.ui.startTransition('Summoning...');
    setTimeout(() => {
      const pulled: VelvetSkin[] = [];
      for (let i = 0; i < count; i++) {
        pulled.push(this.rollSkin());
      }
      const newIds: string[] = [];
      pulled.forEach(s => {
        const existing = this.skinState.skins().find(sk => sk.id === s.id);
        if (existing && !existing.unlocked) {
          this.skinState.unlockSkin(s.id);
          newIds.push(s.id);
        }
      });
      if (newIds.length) {
        const news = this.skinState.skins().filter(sk => newIds.includes(sk.id));
        this.skinState.addObtainedSkins(news);
      }
      this.hasSSR.set(pulled.some(s => s.rarity === 'SSR'));
      this.results.set(pulled);
      this.pulling.set(false);
      this.ui.endTransition();
    }, 700);
  }

  private rollSkin(): VelvetSkin {
    const roll = Math.random() * 100;
    if (roll < 2) {
      return this.skinState.skins().find(s => s.id === 'ascendente-eterna')!;
    }
    if (roll < 10) {
      return this.skinState.skins().find(s => s.id === 'carmesim')!;
    }
    return this.skinState.skins().find(s => s.id === 'default')!;
  }
}
