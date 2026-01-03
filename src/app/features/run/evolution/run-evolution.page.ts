import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent, WowBurstComponent, RarityTagComponent, SkinCardComponent } from '../../../shared/components';
import { RunStateService } from '../../../core/services/run-state.service';
import { TrackKey } from '../../../core/models/tracks.model';
import { SkinStateService } from '../../../core/services/skin-state.service';
import { RngService } from '../../../core/services/rng.service';

@Component({
  selector: 'app-run-evolution-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent, WowBurstComponent, RarityTagComponent, SkinCardComponent],
  template: `
    <app-wow-burst [trigger]="burst"></app-wow-burst>
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
              <span class="uppercase tracking-[0.18em]">{{ kaelisName }} - {{ currentSkin.name }}</span>
              <app-rarity-tag [rarity]="currentSkin.rarity"></app-rarity-tag>
            </div>
          </div>
          <div class="space-y-3">
            <p class="text-[11px] uppercase tracking-[0.22em] text-[#A4A4B5]">Trilha dominante</p>
            <h3 class="text-2xl font-semibold text-white">Trilha {{ dominantTrack }} - Lv {{ dominantLevel }}</h3>
            <p class="text-sm text-[#A4A4B5]">{{ evoDescription }}</p>
            <div class="flex flex-wrap gap-2">
              <app-tag label="Tick-based" tone="accent"></app-tag>
              <app-tag [label]="'Trilha ' + dominantTrack" tone="muted"></app-tag>
            </div>
            <app-premium-tease size="full" title="Skin preview" subtitle="Ascendant skin unlocks after this run." cta="View Skin"></app-premium-tease>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-[16px] border border-white/10 bg-white/5 p-4">
        <div class="flex items-center justify-between">
          <p class="text-xs uppercase tracking-[0.18em] text-[#A4A4B5]">Skin in use</p>
          <app-rarity-tag [rarity]="currentSkin.rarity"></app-rarity-tag>
        </div>
        <app-skin-card [skin]="currentSkin" [showInUse]="true" class="hover:scale-[1.02] transition-transform duration-200 ease-out"></app-skin-card>
        <div class="flex flex-wrap gap-2">
          @for (tag of currentSkin.tags || []; track tag) {
            <app-tag [label]="tag" tone="accent"></app-tag>
          }
          @if ( !(currentSkin.tags || []).length) {
            <app-tag label="Default look" tone="muted"></app-tag>
          }
        </div>
      </div>

      <div class="flex justify-end">
        <app-button label="Continue" variant="primary" (click)="continueFlow()"></app-button>
      </div>
    </div>
  `
})
export class RunEvolutionPageComponent implements OnInit {
  protected readonly run = inject(RunStateService);
  protected readonly skinState = inject(SkinStateService);
  protected readonly rng = inject(RngService);
  protected burst = false;
  private chosenTrack: TrackKey = 'A';

  get dominantTrack(): TrackKey {
    return this.chosenTrack;
  }

  get dominantLevel(): number {
    return this.run.trackLevels()[this.chosenTrack];
  }

  get isFinal(): boolean {
    return this.run.isFinalEvolution();
  }

  get headerTitle(): string {
    return this.isFinal ? 'Final Evolution' : 'Opening Evolution';
  }

  get headerSubtitle(): string {
    return this.isFinal ? 'Run climax — final transformation' : 'Power milestone after the mini-boss';
  }

  get evoDescription(): string {
    return this.isFinal
      ? `Final Evolution - trilha ${this.dominantTrack}: max explosion and ascending visuals.`
      : `Opening Evolution - trilha ${this.dominantTrack}: instant reinforcement and premium presence.`;
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

  get kaelisName(): string {
    return this.run.kaelis()?.name ?? 'Kaelis';
  }

  ngOnInit(): void {
    this.chosenTrack = this.pickDominantTrack();
    this.burst = true;
  }

  continueFlow(): void {
    this.run.registerEvolution(this.dominantTrack, this.isFinal ? 'final' : 'mini');
    if (this.isFinal) {
      this.run.goToVictory();
    } else {
      this.run.advanceRoom();
      this.run.goToPrep();
    }
  }

  private pickDominantTrack(): TrackKey {
    const levels = this.run.trackLevels();
    const max = Math.max(levels.A, levels.B, levels.C);
    const candidates = (['A', 'B', 'C'] as TrackKey[]).filter(r => levels[r] === max);
    return (this.rng.pick(candidates) ?? 'A') as TrackKey;
  }
}
