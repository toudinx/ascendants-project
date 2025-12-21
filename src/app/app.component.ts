import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import {
  RunDebugPanelComponent,
  RunTransitionOverlayComponent,
} from "./shared/components";
import { ProfileStateService } from "./core/services/profile-state.service";
import { filter } from "rxjs/operators";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RunDebugPanelComponent, RunTransitionOverlayComponent],
  template: `
    <div class="min-h-screen bg-black/40">
      <app-run-transition-overlay></app-run-transition-overlay>
      <div
        class="mx-auto py-6 md:py-10"
        [class.px-4]="!isWideLayout()"
        [class.px-6]="isWideLayout()"
        [class.max-w-6xl]="!isWideLayout()"
        [class.max-w-none]="isWideLayout()"
      >
        <div class="mb-4 flex items-center justify-between" *ngIf="!isWideLayout()">
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
  private readonly router = inject(Router);
  protected readonly isWideLayout = signal(false);

  constructor() {
    this.updateLayout(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateLayout(event.urlAfterRedirects));
  }

  private updateLayout(url: string): void {
    this.isWideLayout.set(url.startsWith("/character-management"));
  }
}
