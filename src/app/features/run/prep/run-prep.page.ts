import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppPanelComponent, AppStatBarComponent, AppButtonComponent, AppTagComponent, AppCardComponent, AppModalComponent } from '../../../shared/components';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { RunStateService } from '../../../core/services/run-state.service';

@Component({
  selector: 'app-run-prep-page',
  standalone: true,
  imports: [CommonModule, AppPanelComponent, AppStatBarComponent, AppButtonComponent, AppTagComponent, AppCardComponent, AppModalComponent],
  template: `
    <div class="space-y-4">
      <app-panel title="Status Atual" subtitle="Pausa tática antes da próxima sala" [tag]="nextSalaLabel">
        <div class="grid gap-3 md:grid-cols-2">
          <app-stat-bar label="HP" [current]="player.state().attributes.hp" [max]="player.state().attributes.maxHp" tone="hp" [warnAt]="0.2"></app-stat-bar>
          <app-stat-bar label="Postura" [current]="player.state().attributes.posture" [max]="player.state().attributes.maxPosture" tone="posture"></app-stat-bar>
          <app-stat-bar label="Energia" [current]="player.state().attributes.energy" [max]="player.state().attributes.maxEnergy" tone="energy"></app-stat-bar>
          <div class="flex flex-wrap gap-2">
            <app-tag *ngFor="let buff of player.state().buffs" [label]="buff.name" [tone]="buff.type === 'buff' ? 'success' : 'danger'"></app-tag>
          </div>
        </div>
      </app-panel>

      <div class="grid gap-4 md:grid-cols-2">
        <app-panel title="Poções" subtitle="Recupere-se antes da próxima sala">
          <div class="grid grid-cols-2 gap-3">
            <app-card title="Poção Restauradora" subtitle="+30% HP" [interactive]="false">
              <div class="space-y-2 text-sm text-[#A4A4B5]">
                <p>Recupera parte da vida imediatamente.</p>
                <app-button label="Usar Poção" variant="secondary" (click)="usePotion()" [disabled]="!hasPotion"></app-button>
                <p class="text-xs text-[#A4A4B5]">Poções restantes: {{ run.pocoes() }}</p>
              </div>
            </app-card>
            <app-card title="Slot vazio" subtitle="Espaço para futuros itens" [interactive]="false">
              <app-button label="Em breve" variant="ghost" [disabled]="true"></app-button>
            </app-card>
          </div>
        </app-panel>

        <app-panel title="Próxima Sala" subtitle="Planeje rapidamente">
          <div class="flex flex-col gap-2 text-sm text-[#A4A4B5]">
            <p>Próxima: Sala {{ nextSalaNumber }} / {{ run.totalRooms() }}</p>
            <p>Tipo: {{ nextSalaLabel }}</p>
            <p>Rota dominante: {{ rotaDominante }}</p>
            <p>Reroll disponível: {{ run.rerollDisponivel() }}</p>
          </div>
        </app-panel>
      </div>

      <div class="flex flex-col gap-2 md:flex-row md:justify-end">
        <app-button label="Abandonar Run" variant="ghost" (click)="openAbandonModal()"></app-button>
        <app-button label="Continuar" variant="primary" (click)="continueBattle()"></app-button>
      </div>
    </div>

    <app-modal
      [open]="abandonModal"
      title="Abandonar run?"
      subtitle="Você manterá as recompensas obtidas até agora."
      kicker="Confirmação"
      (closed)="abandonModal = false"
    >
      <div class="text-sm text-[#A4A4B5]">
        Tem certeza que deseja abandonar a run?
      </div>
      <div modal-actions class="flex gap-2">
        <app-button label="Cancelar" variant="ghost" (click)="abandonModal = false"></app-button>
        <app-button label="Sim, abandonar" variant="danger" (click)="abandon()"></app-button>
      </div>
    </app-modal>
  `
})
export class RunPrepPageComponent implements OnInit {
  protected readonly player = inject(PlayerStateService);
  protected readonly run = inject(RunStateService);
  protected abandonModal = false;

  ngOnInit(): void {}

  get nextSalaNumber(): number {
    return Math.min(this.run.totalRooms(), this.run.currentRoom() + 1);
  }

  get nextSalaLabel(): string {
    const tipo = this.run.getRoomTypeFor(this.nextSalaNumber);
    if (tipo === 'mini-boss') return 'Mini-boss';
    if (tipo === 'boss') return 'Boss final';
    return 'Normal';
  }

  get rotaDominante(): string {
    const rotas = this.run.rotas();
    const top = rotas.reduce((best, r) => (r.level > best.level ? r : best), rotas[0]);
    return `${top.title} - Lv ${top.level}`;
  }

  get hasPotion(): boolean {
    return this.run.pocoes() > 0;
  }

  usePotion(): void {
    this.run.consumePotion();
  }

  continueBattle(): void {
    this.run.finishPrepAndStartNextBattle();
  }

  openAbandonModal(): void {
    this.abandonModal = true;
  }

  abandon(): void {
    this.abandonModal = false;
    this.run.fleeRun();
  }
}
