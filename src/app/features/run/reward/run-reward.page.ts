import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent } from '../../../shared/components';
import { RunStateService } from '../../../core/services/run-state.service';
import { UpgradeOption } from '../../../core/models/upgrades.model';
import { RouteKey } from '../../../core/models/routes.model';
import { UiStateService } from '../../../core/services/ui-state.service';

@Component({
  selector: 'app-run-reward-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent],
  template: `
    <app-header title="Choose your Upgrade" subtitle="Three options per room to evolve your route." kicker="Reward"></app-header>

    <div class="space-y-5">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <app-card
          *ngFor="let upgrade of upgrades"
          [title]="upgrade.name"
          [subtitle]="upgrade.description"
          [tag]="upgrade.tag || upgrade.route"
          (click)="select(upgrade)"
          class="transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-95"
          [ngClass]="{
            'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[#0B0B16] scale-[1.01]': selectedUpgrade?.id === upgrade.id
          }"
          [class.opacity-60]="!run.canUpgrade(upgrade.route)"
        >
          <div class="flex items-center justify-between text-sm text-[#A4A4B5]">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--primary)]/15 text-white font-semibold">
                {{ upgrade.route }}
              </div>
              <app-tag [label]="'Route ' + upgrade.route" tone="accent"></app-tag>
            </div>
            <app-tag [label]="upgrade.rarity" tone="muted"></app-tag>
          </div>
          <p class="mt-2 text-xs text-[#A4A4B5]">Route {{ upgrade.route }}: build identity.</p>
          <p *ngIf="!run.canUpgrade(upgrade.route)" class="mt-2 text-xs text-[#FF5A78]">
            Requires another route at level {{ gatingRequired(upgrade.route) }}.
          </p>
        </app-card>
      </div>

      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-2">
          <app-button label="Reroll" variant="secondary" (click)="reroll()"></app-button>
          <premium-tease size="compact" title="Premium reroll coming soon" subtitle="More chances at the perfect route."></premium-tease>
        </div>
        <div class="flex gap-2">
          <app-button label="Skip" variant="ghost" (click)="skip()"></app-button>
          <app-button label="Confirm" variant="primary" [disabled]="!selectedUpgrade" (click)="confirm()"></app-button>
        </div>
      </div>
    </div>
  `
})
export class RunRewardPageComponent implements OnInit {
  protected readonly run = inject(RunStateService);
  protected readonly ui = inject(UiStateService);

  protected selectedUpgrade?: UpgradeOption;

  ngOnInit(): void {}

  get upgrades(): UpgradeOption[] {
    return this.run.availableUpgrades();
  }

  gatingRequired(route: RouteKey): number {
    return this.run.requiredLevelFor(route) - 1;
  }

  select(upgrade: UpgradeOption): void {
    if (!this.run.canUpgrade(upgrade.route)) {
      const required = this.gatingRequired(upgrade.route);
      this.ui.pushLog(`Upgrade unavailable for route ${upgrade.route} (needs another route at level ${required}).`);
      return;
    }
    this.selectedUpgrade = upgrade;
  }

  confirm(): void {
    if (!this.selectedUpgrade) return;
    this.run.applyUpgrade(this.selectedUpgrade.route);
  }

  reroll(): void {
    this.run.rerollUpgrades();
  }

  skip(): void {
    this.run.goToPrep();
  }
}
