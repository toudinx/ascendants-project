import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import {
  RunDebugPanelComponent,
  RunTransitionOverlayComponent,
} from "./shared/components";
import { ProfileStateService } from "./core/services/profile-state.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterOutlet,
    RunDebugPanelComponent,
    RunTransitionOverlayComponent,
  ],
  template: `
    <div class="min-h-screen bg-black/40">
      <app-run-transition-overlay></app-run-transition-overlay>
      <div class="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-sm uppercase tracking-[0.2em] text-[#A4A4B5]">
              Echoes of Ascension
            </p>
          </div>
          <div
            class="hidden gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-[#A4A4B5] md:flex"
          >
            <span>Minimal Premium</span>
            <span class="text-[#8A7CFF]">Dark</span>
          </div>
        </div>
        <div class="card-surface">
          <div class="rounded-[16px]">
            <router-outlet></router-outlet>
          </div>
        </div>
      </div>
      <app-run-debug-panel></app-run-debug-panel>
    </div>
  `,
})
export class AppComponent {
  private readonly profile = inject(ProfileStateService);
}
