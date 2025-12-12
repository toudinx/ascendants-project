import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent, WowBurstComponent } from '../../shared/components';

interface DailyReward {
  day: number;
  name: string;
  icon: string;
  claimed?: boolean;
}

@Component({
  selector: 'app-daily-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent, WowBurstComponent],
  template: `
    <wow-burst [trigger]="burst"></wow-burst>
    <app-header title="Login Diário" subtitle="Claim rewards and keep the loop alive." kicker="Retenção"></app-header>

    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <app-card
          *ngFor="let reward of rewards"
          [title]="'Day ' + reward.day"
          [subtitle]="reward.name"
          [interactive]="false"
          [ngClass]="{
            'ring-2 ring-[#8A7CFF] ring-offset-2 ring-offset-[#0B0B16] scale-[1.01]': reward.day === currentDay,
            'opacity-60': reward.claimed
          }"
        >
          <div class="flex items-center justify-between text-sm text-[#A4A4B5]">
            <span class="text-lg">{{ reward.icon }}</span>
            <app-tag [label]="reward.claimed ? 'Claimed' : reward.day === currentDay ? 'Today' : 'Disponível'" [tone]="reward.claimed ? 'muted' : reward.day === currentDay ? 'accent' : 'muted'"></app-tag>
          </div>
        </app-card>
      </div>

      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <app-button label="Claim today's reward" variant="primary" (click)="claim()" [disabled]="currentClaimed"></app-button>
        <premium-tease size="compact" title="Bônus extra por anúncio" subtitle="Future: watch to double the reward."></premium-tease>
      </div>
    </div>
  `
})
export class DailyPageComponent {
  protected currentDay = 3;
  protected currentClaimed = false;
  protected burst = false;

  protected rewards: DailyReward[] = [
    { day: 1, name: '+1 Poção', icon: '🧪', claimed: true },
    { day: 2, name: '+1 Reroll', icon: '🎲', claimed: true },
    { day: 3, name: '50 Gold', icon: '💰' },
    { day: 4, name: 'Skin Preview', icon: '✨' },
    { day: 5, name: 'Tick Boost', icon: '⚡' },
    { day: 6, name: 'Pacote Básico', icon: '🎁' },
    { day: 7, name: 'Mini Skin', icon: '🌙' }
  ];

  claim(): void {
    if (this.currentClaimed) return;
    this.currentClaimed = true;
    this.burst = true;
    this.rewards = this.rewards.map(r => r.day === this.currentDay ? { ...r, claimed: true } : r);
  }
}
