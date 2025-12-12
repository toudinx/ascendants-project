import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent, WowBurstComponent, RarityTagComponent, SkinCardComponent } from '../../../shared/components';
import { RunStateService } from '../../../core/services/run-state.service';
import { RouteKey } from '../../../core/models/routes.model';
import { SkinStateService } from '../../../core/services/skin-state.service';

@Component({
  selector: 'app-run-evolution-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent, WowBurstComponent, RarityTagComponent, SkinCardComponent],
  template: `
    <wow-burst [trigger]="burst"></wow-burst>
    <app-header [title]="headerTitle" [subtitle]="headerSubtitle" kicker="Run"></app-header>

    <div class="space-y-5">
      <div class="relative overflow-hidden rounded-[18px] border border-[var(--primary)]/30 glass p-6 md:p-8">
        <div class="absolute inset-0 animate-pulse opacity-40" aria-hidden="true">
          <div class="absolute left-6 top-6 h-48 w-48 rounded-full bg-[var(--primary)]/25 blur-3xl"></div>
          <div class="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[var(--secondary)]/30 blur-3xl"></div>
        </div>
        <div class="relative grid gap-6 md:grid-cols-[0.95fr,1fr] md:items-center">
          <div
            class="relative h-72 rounded-[18px] border bg-gradient-to-br from-white/10 via-white/5 to-transparent shadow-neon"
            [ngClass]="[skinAccentClass, skinGlowClass]"
          >
            <div class="absolute inset-0 flex items-center justify-center animate-[fadein_0.9s_ease]">
              <div class="h-64 w-48 rounded-[16px] bg-gradient-to-br from-[var(--primary)]/40 via-[var(--secondary)]/25 to-[#050511]"></div>
            </div>
            <div class="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80">
              <span class="uppercase tracking-[0.18em]">Velvet — {{ currentSkin.name }}</span>
              <rarity-tag [rarity]="currentSkin.rarity"></rarity-tag>
            </div>
          </div>
          <div class="space-y-3">
            <p class="text-[11px] uppercase tracking-[0.22em] text-[#A4A4B5]">Rota dominante</p>
            <h3 class="text-2xl font-semibold text-white">Rota {{ dominantRoute }} — Lv {{ dominantLevel }}</h3>
            <p class="text-sm text-[#A4A4B5]">{{ evoDescription }}</p>
            <div class="flex flex-wrap gap-2">
              <app-tag label="Tick-based" tone="accent"></app-tag>
              <app-tag [label]="'Rota ' + dominantRoute" tone="muted"></app-tag>
            </div>
            <premium-tease size="full" title="Preview de Skin" subtitle="Skin ascendente liberada após esta run." cta="Ver Skin"></premium-tease>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-[16px] border border-white/10 bg-white/5 p-4">
        <div class="flex items-center justify-between">
          <p class="text-xs uppercase tracking-[0.18em] text-[#A4A4B5]">Skin em uso</p>
          <rarity-tag [rarity]="currentSkin.rarity"></rarity-tag>
        </div>
        <skin-card [skin]="currentSkin" [showInUse]="true" class="hover:scale-[1.02] transition-transform duration-200 ease-out"></skin-card>
        <div class="flex flex-wrap gap-2">
          <app-tag *ngFor="let tag of currentSkin.tags || []" [label]="tag" tone="accent"></app-tag>
          <app-tag *ngIf="!(currentSkin.tags || []).length" label="Visual padrão" tone="muted"></app-tag>
        </div>
      </div>

      <div class="flex justify-end">
        <app-button label="Continuar" variant="primary" (click)="continueFlow()"></app-button>
      </div>
    </div>
  `
})
export class RunEvolutionPageComponent implements OnInit {
  protected readonly run = inject(RunStateService);
  protected readonly skinState = inject(SkinStateService);
  protected burst = false;
  private chosenRoute: RouteKey = 'A';

  get dominantRoute(): RouteKey {
    return this.chosenRoute;
  }

  get dominantLevel(): number {
    return this.run.routeLevels()[this.chosenRoute];
  }

  get isFinal(): boolean {
    return this.run.isFinalEvolution();
  }

  get headerTitle(): string {
    return this.isFinal ? 'Evolução Final' : 'Evolução Inicial';
  }

  get headerSubtitle(): string {
    return this.isFinal ? 'Clímax da run - transformação final' : 'Marco de poder - após o mini-boss';
  }

  get evoDescription(): string {
    return this.isFinal
      ? `Evolução Final — rota ${this.dominantRoute}: explosão máxima e visual ascendente.`
      : `Evolução Inicial — rota ${this.dominantRoute}: reforço imediato e presença premium.`;
  }

  get currentSkin() {
    return this.skinState.currentSkin();
  }

  get skinAccentClass(): string {
    if (this.currentSkin.rarity === 'SSR') return 'skin-ssr';
    if (this.currentSkin.rarity === 'SR') return 'skin-sr';
    return 'border-blue-300/30 shadow-[0_0_12px_rgba(122,140,255,0.16)]';
  }

  get skinGlowClass(): string {
    return this.currentSkin.rarity === 'SSR' ? 'shadow-[0_0_16px_rgba(255,211,68,0.35)]' : '';
  }

  ngOnInit(): void {
    this.chosenRoute = this.pickDominantRoute();
    this.burst = true;
  }

  continueFlow(): void {
    this.run.registerEvolution(this.dominantRoute, this.isFinal ? 'final' : 'mini');
    if (this.isFinal) {
      this.run.goToVictory();
    } else {
      this.run.advanceRoom();
      this.run.goToPrep();
    }
  }

  private pickDominantRoute(): RouteKey {
    const levels = this.run.routeLevels();
    const max = Math.max(levels.A, levels.B, levels.C);
    const candidates = (['A', 'B', 'C'] as RouteKey[]).filter(r => levels[r] === max);
    return candidates[Math.floor(Math.random() * candidates.length)] as RouteKey;
  }
}
