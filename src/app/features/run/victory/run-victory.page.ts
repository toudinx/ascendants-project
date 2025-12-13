import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import {
  AppHeaderComponent,
  AppTagComponent,
  AppButtonComponent,
  AppCardComponent,
  WowBurstComponent,
  SkinCardComponent,
} from "../../../shared/components";
import { RunStateService } from "../../../core/services/run-state.service";
import { SkinStateService } from "../../../core/services/skin-state.service";

@Component({
  selector: "app-run-victory-page",
  standalone: true,
  imports: [
    CommonModule,
    AppHeaderComponent,
    AppTagComponent,
    AppButtonComponent,
    AppCardComponent,
    WowBurstComponent,
    SkinCardComponent,
  ],
  template: `
    <wow-burst [trigger]="true"></wow-burst>
    <app-header
      title="Ascension Achieved"
      subtitle="Final boss defeated. Velvet reigns."
      kicker="Victory"
    ></app-header>
    <div class="space-y-4">
      <div
        class="relative overflow-hidden rounded-[18px] border border-[var(--primary)]/40 glass p-6 md:p-8"
      >
        <div class="absolute inset-0 opacity-30 blur-3xl">
          <div
            class="absolute left-0 top-0 h-40 w-40 rounded-full bg-[var(--primary)]/25"
          ></div>
          <div
            class="absolute right-0 bottom-0 h-52 w-52 rounded-full bg-[var(--secondary)]/25"
          ></div>
        </div>
        <div class="relative grid gap-4 md:grid-cols-2">
          <app-card
            title="Final Routes"
            [subtitle]="
              'A ' + levels.A + ' - B ' + levels.B + ' - C ' + levels.C
            "
            [interactive]="false"
          ></app-card>
          <app-card
            title="Evolutions"
            [subtitle]="run.evolutions().join(', ') || 'None'"
            [interactive]="false"
          ></app-card>
          <app-card
            title="Rooms"
            [subtitle]="run.currentRoom() + '/' + run.totalRooms()"
            [interactive]="false"
          ></app-card>
          <app-card
            title="Potions used"
            subtitle="~2 (mock)"
            [interactive]="false"
          ></app-card>
          <app-card
            title="Run time"
            subtitle="~5m20s (mock)"
            [interactive]="false"
          ></app-card>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <app-tag label="Victory" tone="accent"></app-tag>
          <app-tag label="Final Boss" tone="danger"></app-tag>
          <app-tag label="Skin in use" tone="muted"></app-tag>
        </div>
        <div class="mt-4">
          <skin-card
            [skin]="currentSkin"
            [showInUse]="true"
            class="max-w-xs transition-transform duration-200 ease-out hover:scale-[1.02]"
          ></skin-card>
        </div>
      </div>

      <div
        *ngIf="newSkins.length"
        class="rounded-[16px] border border-white/10 bg-white/5 p-4 space-y-3"
      >
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-white">New skins obtained!</p>
          <app-button
            label="View Collection"
            variant="ghost"
            (click)="router.navigate(['/collection'])"
          ></app-button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <skin-card
            *ngFor="let skin of newSkins"
            [skin]="skin"
            class="transition-transform duration-200 ease-out hover:scale-[1.02]"
          ></skin-card>
        </div>
      </div>

      <div
        class="rounded-[14px] border border-[var(--primary)]/30 bg-[#111120]/80 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p class="text-sm font-semibold text-white">
            The current banner features Velvet's SSR skin
          </p>
          <p class="text-xs text-[#A4A4B5]">
            Try your luck in the premium gacha and grow your collection.
          </p>
        </div>
        <app-button
          label="Go to Gacha"
          variant="primary"
          (click)="router.navigate(['/gacha'])"
        ></app-button>
      </div>

      <div class="flex flex-col gap-2 md:flex-row md:justify-end">
        <app-button
          label="View Summary"
          variant="secondary"
          (click)="goSummary()"
        ></app-button>
        <app-button
          label="Back to Hub"
          variant="ghost"
          (click)="finishRun()"
        ></app-button>
        <app-button
          label="Play Again"
          variant="primary"
          (click)="restart()"
        ></app-button>
      </div>
    </div>
  `,
})
export class RunVictoryPageComponent implements OnInit {
  protected readonly run = inject(RunStateService);
  protected readonly router = inject(Router);
  protected readonly skinState = inject(SkinStateService);

  get levels() {
    return this.run.routeLevels();
  }

  get currentSkin() {
    return this.skinState.currentSkin();
  }

  get newSkins() {
    return this.skinState.lastObtainedSkins();
  }

  ngOnInit(): void {}

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
