import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppCardComponent, AppTagComponent } from '../../shared/components';

interface InventoryItem {
  name: string;
  rarity: 'comum' | 'raro' | 'epico';
  quantity: number;
}

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppCardComponent, AppTagComponent],
  template: `
    <app-header title="Inventario" subtitle="Itens rápidos para a run." kicker="Meta"></app-header>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <app-card *ngFor="let item of items" [title]="item.name" [subtitle]="'Quantidade: ' + item.quantity" [interactive]="false">
        <app-tag [label]="item.rarity" [tone]="item.rarity === 'epico' ? 'accent' : 'muted'"></app-tag>
      </app-card>
      <app-card title="Slot vazio" subtitle="Espaço para futuros itens" [interactive]="false">
        <app-tag label="Locked" tone="muted"></app-tag>
      </app-card>
    </div>
  `
})
export class InventoryPageComponent {
  protected readonly items: InventoryItem[] = [
    { name: 'Poção Restauradora', rarity: 'comum', quantity: 2 },
    { name: 'Reroll Point', rarity: 'raro', quantity: 1 },
    { name: 'Token de Skin', rarity: 'epico', quantity: 0 }
  ];
}
