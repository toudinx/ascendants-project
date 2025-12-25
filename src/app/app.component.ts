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
  imports: [
    CommonModule,
    RouterOutlet,
    RunDebugPanelComponent,
    RunTransitionOverlayComponent,
  ],
  template: `
    <div
      class="min-h-screen bg-black/40"
      [ngClass]="layoutShellClasses"
    >
      <app-run-transition-overlay></app-run-transition-overlay>
      <div class="w-full" [ngClass]="layoutContainerClasses">
        <div
          class="card-surface"
          [ngClass]="{ 'asc-start-card': isAscensionStartLayout() }"
        >
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
  protected readonly isAscensionBattleLayout = signal(false);
  protected readonly isAscensionStartLayout = signal(false);

  constructor() {
    this.updateLayout(this.router.url);
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        )
      )
      .subscribe((event) => this.updateLayout(event.urlAfterRedirects));
  }

  private updateLayout(url: string): void {
    this.isWideLayout.set(
      url.startsWith("/character-management") || url.startsWith("/run/battle")
    );
    this.isAscensionBattleLayout.set(url.startsWith("/ascension/battle"));
    this.isAscensionStartLayout.set(url.startsWith("/ascension/start"));
  }

  get layoutContainerClasses(): string {
    if (this.isAscensionBattleLayout()) {
      return "p-3 sm:p-4 md:p-6 max-w-none";
    }
    if (this.isAscensionStartLayout()) {
      return "px-4 max-w-6xl";
    }
    if (this.isWideLayout()) {
      return "py-10 px-6 max-w-none";
    }
    return "py-10 px-4 max-w-6xl";
  }

  get layoutShellClasses(): string {
    if (this.isAscensionBattleLayout()) {
      return "grid place-items-center";
    }
    if (this.isAscensionStartLayout()) {
      return "flex justify-center items-start pt-6 md:pt-10 pb-0";
    }
    return "flex items-center justify-center";
  }
}
