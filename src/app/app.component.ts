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
    <div class="min-h-screen bg-black/40 flex items-center justify-center">
      <app-run-transition-overlay></app-run-transition-overlay>
      <div
        class="w-full py-10"
        [class.px-4]="!isWideLayout()"
        [class.px-6]="isWideLayout()"
        [class.max-w-6xl]="!isWideLayout()"
        [class.max-w-none]="isWideLayout()"
      >
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
  }
}
