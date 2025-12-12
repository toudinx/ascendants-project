import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppPanelComponent, AppTagComponent, AppButtonComponent, AppCardComponent, SkinCardComponent } from '../../../shared/components';
import { RunStateService } from '../../../core/services/run-state.service';
import { SkinStateService } from '../../../core/services/skin-state.service';

@Component({
  selector: 'app-run-summary-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppPanelComponent, AppTagComponent, AppButtonComponent, AppCardComponent, SkinCardComponent],
  template: `
    <app-header [title]="title" subtitle="Rotas, evoluções e métricas rápidas." kicker="Run"></app-header>

    <div class="space-y-4">
      <app-panel title="Skin utilizada" subtitle="Identidade visual da run">
        <div class="max-w-xs">
          <skin-card [skin]="currentSkin" [showInUse]="true" class="transition-transform duration-200 ease-out hover:scale-[1.02]"></skin-card>
        </div>
      </app-panel>

      <app-panel title="Rotas finais" subtitle="Distribuição de níveis">
        <div class="grid gap-3 md:grid-cols-3">
          <app-card *ngFor="let rota of run.rotas()" [title]="rota.title" [subtitle]="rota.emphasis" [tag]="'Lv ' + rota.level">
            <div class="text-sm text-[#A4A4B5]">Rota {{ rota.route }}</div>
          </app-card>
        </div>
      </app-panel>

      <app-panel title="Evoluções" subtitle="Momentos transformacionais">
        <div class="flex flex-wrap gap-2">
          <app-tag *ngFor="let evo of run.evolucoes()" [label]="evo" tone="accent"></app-tag>
          <app-tag *ngIf="!run.evolucoes().length" label="Sem evoluções" tone="muted"></app-tag>
        </div>
      </app-panel>

      <app-panel title="Estatísticas">
        <div class="grid gap-3 text-sm text-[#A4A4B5] md:grid-cols-3">
          <app-card title="Salas concluídas" [subtitle]="run.currentRoom() + ' de ' + run.totalRooms()" [interactive]="false"></app-card>
          <app-card title="Upgrades pegos" [subtitle]="totalUpgrades + ''" [interactive]="false"></app-card>
          <app-card title="Resultado" [subtitle]="resultLabel" [interactive]="false"></app-card>
        </div>
      </app-panel>

      <div class="flex flex-col gap-2 md:flex-row md:justify-end">
        <app-button label="Voltar ao Hub" variant="ghost" (click)="finishRun()"></app-button>
        <app-button label="Jogar Novamente" variant="primary" (click)="restart()"></app-button>
      </div>
    </div>
  `
})
export class RunSummaryPageComponent implements OnInit {
  protected readonly run = inject(RunStateService);
  protected readonly skinState = inject(SkinStateService);

  ngOnInit(): void {}

  get title(): string {
    switch (this.run.result()) {
      case 'victory':
        return 'Vitória!';
      case 'defeat':
        return 'Derrota...';
      case 'fled':
        return 'Você abandonou a run.';
      default:
        return 'Resumo da Run';
    }
  }

  get resultLabel(): string {
    switch (this.run.result()) {
      case 'victory':
        return 'Vitória';
      case 'defeat':
        return 'Derrota';
      case 'fled':
        return 'Fuga';
      default:
        return 'Indefinido';
    }
  }

  get totalUpgrades(): number {
    const levels = this.run.routeLevels();
    return levels.A + levels.B + levels.C;
  }

  get currentSkin() {
    return this.skinState.currentSkin();
  }

  restart(): void {
    this.run.resetToStart();
  }

  finishRun(): void {
    this.run.finishRun();
  }
}
