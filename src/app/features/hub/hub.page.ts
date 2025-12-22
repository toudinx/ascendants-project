import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import {
  AppButtonComponent,
  AppCardComponent,
  AppTagComponent,
} from "../../shared/components";
import { RunStateService } from "../../core/services/run-state.service";
import { SkinStateService } from "../../core/services/skin-state.service";
import { ProfileStateService } from "../../core/services/profile-state.service";

@Component({
  selector: "app-hub-page",
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppCardComponent,
    AppTagComponent,
  ],
  template: `
    <!-- VIEWPORT WRAPPER (NO BG) -->
    <div class="min-h-[100svh] flex">
      <!-- CENTER CONTENT -->
      <div class="mx-auto w-full max-w-[1400px] px-4 py-8 flex flex-col">
        <!-- HEADER -->
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-xs tracking-[0.3em] text-white/60">
            KAEZAN: AWAKENING
          </h1>

          <span
            class="rounded-full border border-white/10 bg-white/5
                   px-3 py-1 text-[10px] text-white/60"
          >
            MINIMAL PREMIUM - DARK
          </span>
        </div>

        <!-- MAIN GRID -->
        <div class="grid flex-1 gap-6 md:grid-cols-[2fr,1fr]">
          <!-- LEFT COLUMN -->
          <div class="flex flex-col gap-6">
            <!-- FEATURED STAGE (STATIC) -->
            <div
              class="relative overflow-hidden rounded-[22px]
                     border border-white/10
                     bg-gradient-to-br from-[#1a1a2e]/80 via-[#141428]/80 to-[#050511]/80
                     p-4"
            >
              <div
                class="relative h-[320px] w-full rounded-[18px]
                       bg-gradient-to-br from-[#8A7CFF]/40 via-[#E28FE8]/20 to-[#050511]"
              >
                <div
                  class="absolute inset-3 rounded-[14px]
                         border border-white/10 bg-white/5"
                ></div>

                <div
                  class="absolute bottom-3 left-3 rounded-full
                         bg-black/40 px-3 py-1
                         text-xs text-white/80"
                >
                  Active Kaelis - {{ profile.activeKaelis().name }}
                </div>
              </div>

              <div class="mt-3 flex items-center justify-between">
                <p class="text-sm text-[#A4A4B5]">
                  {{ profile.activeKaelis().name }} -
                  {{ profile.activeKaelis().routeType }} route
                  <br />
                  Equipped skin: {{ skinState.currentSkin().name }}
                </p>

                <div class="flex gap-2">
                  <app-button
                    label="Character Management"
                    variant="ghost"
                    size="sm"
                    (click)="router.navigate(['/character-management'])"
                  ></app-button>
                </div>
              </div>
            </div>

            <!-- CTA PRINCIPAL -->
            <div
              class="rounded-[22px] border border-white/10
                     bg-[#0a0a14]/80 p-5 text-center"
            >
              <app-button
                label="Start Run"
                variant="primary"
                (click)="startRun()"
              ></app-button>

              <p class="mt-2 text-xs text-[#A4A4B5]">
                Active Kaelis: {{ profile.activeKaelis().name }} ({{
                  profile.activeKaelis().routeType
                }})
              </p>
              <div
                class="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-[#7F7F95]"
              >
                <span
                  >Gold: {{ profile.currencies().gold | number: "1.0-0" }}</span
                >
                <span
                  >Sigils:
                  {{ profile.currencies().sigils | number: "1.0-0" }}</span
                >
                <span>Potions: {{ profile.potionCount() }} / 2</span>
              </div>
              <div class="mt-3 flex justify-center">
                <app-button
                  label="Change Outfit"
                  variant="ghost"
                  size="sm"
                  (click)="router.navigate(['/collection'])"
                ></app-button>
              </div>
            </div>

            <!-- DAILY / GOAL -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <app-card
                title="Daily Login"
                subtitle="Today's reward"
                [interactive]="false"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <app-tag label="+1 Reroll" tone="accent"></app-tag>
                    <app-tag label="Potion" tone="success"></app-tag>
                  </div>

                  <app-button
                    label="Claim"
                    variant="primary"
                    size="sm"
                  ></app-button>
                </div>
              </app-card>

              <app-card
                title="Quick Goal"
                subtitle="Limited objective"
                [interactive]="false"
              >
                <div class="space-y-1 text-sm text-[#A4A4B5]">
                  <p>Clear 3 rooms</p>
                  <p>Progress: 0 / 3</p>
                </div>
              </app-card>
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div class="flex flex-col gap-6">
            <app-card
              class="flex-1 min-h-[260px]"
              title="Event"
              subtitle="Limited time"
              [interactive]="true"
              (click)="router.navigate(['/events'])"
            >
              <p class="text-sm text-[#A4A4B5]">
                Ascension Trial is live. Increased potion drops.
              </p>
              <p class="mt-1 text-xs text-[#7F7F95]">Ends in 2 days</p>
            </app-card>

            <app-card
              title="Featured"
              subtitle="Current banner"
              [interactive]="true"
              (click)="router.navigate(['/gacha'])"
            >
              <p class="text-sm font-semibold text-white">
                New Banner: Velvet Eternal Ascendant
              </p>
              <p class="text-xs text-[#A4A4B5]">
                Live now on the premium gacha.
              </p>

              <div class="mt-3">
                <app-button
                  label="Go to Gacha"
                  variant="ghost"
                  size="sm"
                ></app-button>
              </div>
            </app-card>

            <div class="grid grid-cols-2 gap-3">
              <app-button
                label="Kaelis"
                variant="secondary"
                (click)="router.navigate(['/character-management'])"
              ></app-button>

              <app-button
                label="Gacha"
                variant="secondary"
                (click)="router.navigate(['/gacha'])"
              ></app-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class HubPageComponent {
  protected readonly runState = inject(RunStateService);
  protected readonly router = inject(Router);
  protected readonly skinState = inject(SkinStateService);
  protected readonly profile = inject(ProfileStateService);
  startRun(): void {
    this.runState.resetToStart();
  }
}
