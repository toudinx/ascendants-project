import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppCardComponent, AppTagComponent } from '../../shared/components';

interface InventoryItem {
  name: string;
  rarity: 'common' | 'rare' | 'epic';
  quantity: number;
}

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppCardComponent, AppTagComponent],
  template: `
    <app-header title="Inventory" subtitle="Quick items for the run." kicker="Goal"></app-header>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      @for (item of items; track item.name) {
        <app-card [title]="item.name" [subtitle]="'Quantity: ' + item.quantity" [interactive]="false">
          <app-tag [label]="item.rarity" [tone]="item.rarity === 'epic' ? 'accent' : 'muted'"></app-tag>
        </app-card>
      }
      <app-card title="Empty slot" subtitle="Space for future items" [interactive]="false">
        <app-tag label="Locked" tone="muted"></app-tag>
      </app-card>
    </div>
  `
})
export class InventoryPageComponent {
  protected readonly items: InventoryItem[] = [
    { name: 'Restorative Potion', rarity: 'common', quantity: 2 },
    { name: 'Reroll Point', rarity: 'rare', quantity: 1 },
    { name: 'Skin Token', rarity: 'epic', quantity: 0 }
  ];
}
