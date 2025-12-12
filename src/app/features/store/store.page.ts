import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppHeaderComponent, AppButtonComponent, PremiumTeaseComponent } from '../../shared/components';
import { StoreItemCardComponent } from './components/store-item-card.component';
import { StorePremiumCardComponent } from './components/store-premium-card.component';

interface StoreItem {
  name: string;
  description: string;
  price: string;
  icon?: string;
}

interface PremiumItem {
  title: string;
  subtitle: string;
  description: string;
  highlight?: string;
}

@Component({
  selector: 'app-store-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppButtonComponent, PremiumTeaseComponent, StoreItemCardComponent, StorePremiumCardComponent],
  template: `
    <app-header title="Store" subtitle="Items to accelerate the run and premium cosmetics." kicker="Meta"></app-header>

    <div class="mb-4 flex gap-2">
      <app-button label="Core Store" [variant]="tab === 'normal' ? 'primary' : 'ghost'" (click)="tab = 'normal'"></app-button>
      <app-button label="Premium Store" [variant]="tab === 'premium' ? 'primary' : 'ghost'" (click)="tab = 'premium'"></app-button>
    </div>

    <div *ngIf="tab === 'normal'" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <store-item-card *ngFor="let item of normalItems" [name]="item.name" [description]="item.description" [price]="item.price" [icon]="item.icon"></store-item-card>
    </div>

    <div *ngIf="tab === 'premium'" class="space-y-4">
      <premium-tease size="full" title="Premium coming soon" subtitle="Skins, speed spikes and bonus rerolls." cta="Notify me"></premium-tease>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <store-premium-card
          *ngFor="let item of premiumItems"
          [title]="item.title"
          [subtitle]="item.subtitle"
          [description]="item.description"
          [highlight]="item.highlight"
        ></store-premium-card>
        <store-premium-card
          title="Summons / Gacha"
          subtitle="Current banner"
          description="Hunt rare Velvet skins (demo only)."
          highlight="Gacha"
        >
          <app-button label="Go to Banner" variant="primary" (click)="router.navigate(['/gacha'])"></app-button>
        </store-premium-card>
      </div>
      <div class="rounded-[14px] border border-white/10 bg-white/5 p-3 text-sm text-[#A4A4B5]">
        Premium layer unlocks later.
      </div>
    </div>
  `
})
export class StorePageComponent {
  protected tab: 'normal' | 'premium' = 'normal';
  protected readonly router = inject(Router);

  protected readonly normalItems: StoreItem[] = [
    { name: 'Restorative Potion', description: '+30% HP in the next room', price: '100 gold', icon: '🧪' },
    { name: 'Reroll', description: 'One more upgrade attempt', price: '150 gold', icon: '🎲' },
    { name: 'Basic Item', description: 'Placeholder for future buffs', price: '80 gold', icon: '★' }
  ];

  protected readonly premiumItems: PremiumItem[] = [
    { title: 'Velvet Skin · Nebula', subtitle: 'Premium visual drop', description: 'Waifu-first with sleek violet glow.', highlight: 'Skin' },
    { title: 'Ascendant Pack', subtitle: 'Weekly bundle', description: 'Extra rerolls + skin preview.', highlight: 'Bundle' },
    { title: 'Season Pack', subtitle: 'Season pass', description: 'Tick boost + exclusive art.', highlight: 'Season' }
  ];
}
