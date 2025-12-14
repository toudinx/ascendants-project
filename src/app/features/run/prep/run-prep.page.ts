import { Component, inject } from '@angular/core';
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
      <app-panel title="Current Status" subtitle="Tactical pause before the next room" [tag]="nextRoomLabel">
        <div class="grid gap-3 md:grid-cols-2">
          <app-stat-bar label="HP" [current]="player.state().attributes.hp" [max]="player.state().attributes.maxHp" tone="hp" [warnAt]="0.2"></app-stat-bar>
          <app-stat-bar label="Posture" [current]="player.state().attributes.posture" [max]="player.state().attributes.maxPosture" tone="posture"></app-stat-bar>
          <app-stat-bar label="Energy" [current]="player.state().attributes.energy" [max]="player.state().attributes.maxEnergy" tone="energy"></app-stat-bar>
          <div class="flex flex-wrap gap-2">
            @for (buff of player.state().buffs; track buff.name) {
              <app-tag [label]="buff.name" [tone]="buff.type === 'buff' ? 'success' : 'danger'"></app-tag>
            }
          </div>
        </div>
      </app-panel>

      <div class="grid gap-4 md:grid-cols-2">
        <app-panel title="Potions" subtitle="Recover before the next room">
          <div class="grid grid-cols-2 gap-3">
            <app-card title="Restorative Potion" subtitle="+30% HP" [interactive]="false">
              <div class="space-y-2 text-sm text-[#A4A4B5]">
                <p>Recovers a chunk of HP instantly.</p>
                <app-button label="Use Potion" variant="secondary" (click)="usePotion()" [disabled]="!hasPotion"></app-button>
                <p class="text-xs text-[#A4A4B5]">Potions remaining: {{ run.potions() }}</p>
              </div>
            </app-card>
            <app-card title="Empty slot" subtitle="Space for future items" [interactive]="false">
              <app-button label="Coming soon" variant="ghost" [disabled]="true"></app-button>
            </app-card>
          </div>
        </app-panel>

        <app-panel title="Next Room" subtitle="Plan quickly">
          <div class="flex flex-col gap-2 text-sm text-[#A4A4B5]">
            <p>Next: Room {{ nextRoomNumber }} / {{ run.totalRooms() }}</p>
            <p>Type: {{ nextRoomLabel }}</p>
            <p>Dominant route: {{ dominantRouteLabel }}</p>
            <p>Rerolls available: {{ run.rerollsAvailable() }}</p>
          </div>
        </app-panel>
      </div>

      <div class="flex flex-col gap-2 md:flex-row md:justify-end">
        <app-button label="Abandon Run" variant="ghost" (click)="openAbandonModal()"></app-button>
        <app-button label="Continue" variant="primary" (click)="continueBattle()"></app-button>
      </div>
    </div>

    <app-modal
      [open]="abandonModal"
      title="Abandon run?"
      subtitle="You will keep the rewards collected so far."
      kicker="Confirmation"
      (closed)="abandonModal = false"
    >
      <div class="text-sm text-[#A4A4B5]">
        Are you sure you want to abandon the run?
      </div>
      <div modal-actions class="flex gap-2">
        <app-button label="Cancel" variant="ghost" (click)="abandonModal = false"></app-button>
        <app-button label="Yes, abandon" variant="danger" (click)="abandon()"></app-button>
      </div>
    </app-modal>
  `
})
export class RunPrepPageComponent {
  protected readonly player = inject(PlayerStateService);
  protected readonly run = inject(RunStateService);
  protected abandonModal = false;

  get nextRoomNumber(): number {
    return Math.min(this.run.totalRooms(), this.run.currentRoom() + 1);
  }

  get nextRoomLabel(): string {
    const roomType = this.run.getRoomTypeFor(this.nextRoomNumber);
    if (roomType === 'mini-boss') return 'Mini-boss';
    if (roomType === 'boss') return 'Final Boss';
    return 'Normal';
  }

  get dominantRouteLabel(): string {
    const routeList = this.run.routes();
    if (!routeList.length) return 'Unknown';
    const top = routeList.reduce((best, route) => (route.level > best.level ? route : best));
    return `${top.title} - Lv ${top.level}`;
  }

  get hasPotion(): boolean {
    return this.run.potions() > 0;
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
