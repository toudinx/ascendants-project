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
    <app-header title="Escolha seu Upgrade" subtitle="Três opções por sala para evoluir sua rota." kicker="Recompensa"></app-header>

    <div class="space-y-5">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <app-card
          *ngFor="let upgrade of upgrades"
          [title]="upgrade.name"
          [subtitle]="upgrade.description"
          [tag]="upgrade.tag || upgrade.rota"
          (click)="select(upgrade)"
          class="transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-95"
          [ngClass]="{
            'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[#0B0B16] scale-[1.01]': selectedUpgrade?.id === upgrade.id
          }"
          [class.opacity-60]="!run.canUpgrade(upgrade.rota)"
        >
          <div class="flex items-center justify-between text-sm text-[#A4A4B5]">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--primary)]/15 text-white font-semibold">
                {{ upgrade.rota }}
              </div>
              <app-tag [label]="'Rota ' + upgrade.rota" tone="accent"></app-tag>
            </div>
            <app-tag [label]="upgrade.rarity" tone="muted"></app-tag>
          </div>
          <p class="mt-2 text-xs text-[#A4A4B5]">Rota {{ upgrade.rota }}: identidade de build.</p>
          <p *ngIf="!run.canUpgrade(upgrade.rota)" class="mt-2 text-xs text-[#FF5A78]">
            Requer outra rota em nível {{ gatingRequired(upgrade.rota) }}.
          </p>
        </app-card>
      </div>

      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-2">
          <app-button label="Rerrolar" variant="secondary" (click)="reroll()"></app-button>
          <premium-tease size="compact" title="Rerrolagem premium em breve" subtitle="Mais chances de pegar a rota perfeita."></premium-tease>
        </div>
        <div class="flex gap-2">
          <app-button label="Pular" variant="ghost" (click)="skip()"></app-button>
          <app-button label="Confirmar" variant="primary" [disabled]="!selectedUpgrade" (click)="confirm()"></app-button>
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
    return this.run.upgradesDisponiveis();
  }

  gatingRequired(route: RouteKey): number {
    return this.run.requiredLevelFor(route) - 1;
  }

  select(upgrade: UpgradeOption): void {
    if (!this.run.canUpgrade(upgrade.rota)) {
      const required = this.gatingRequired(upgrade.rota);
      this.ui.pushLog(`Upgrade indisponível para rota ${upgrade.rota} (precisa de outra rota no nível ${required}).`);
      return;
    }
    this.selectedUpgrade = upgrade;
  }

  confirm(): void {
    if (!this.selectedUpgrade) return;
    this.run.applyUpgrade(this.selectedUpgrade.rota);
  }

  reroll(): void {
    this.run.rerollUpgrades();
  }

  skip(): void {
    this.run.goToPrep();
  }
}
