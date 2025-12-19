import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent } from '../../shared/components';

interface LimitedEvent {
  id: string;
  title: string;
  window: string;
  description: string;
  reward: string;
}

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent],
  template: `
    <app-header title="Events" subtitle="Limited-time activities" kicker="Live update"></app-header>
    <div class="grid gap-4 md:grid-cols-2">
      @for (event of events; track event.id) {
        <app-card [title]="event.title" [subtitle]="event.window" [interactive]="false">
          <p class="text-sm text-white/70">
            {{ event.description }}
          </p>
          <div class="mt-4 flex items-center justify-between">
            <app-tag [label]="event.reward" tone="accent"></app-tag>
            <app-button label="View Details" variant="ghost" size="sm"></app-button>
          </div>
        </app-card>
      }
    </div>
  `
})
export class EventsPageComponent {
  protected readonly events: LimitedEvent[] = [
    {
      id: 'trial',
      title: 'Ascension Trial',
      window: 'Ends in 2 days',
      description: 'Boosted potion drops and special modifiers for elite rooms.',
      reward: '+10% Loot'
    },
    {
      id: 'memory',
      title: 'Echo Memory',
      window: 'Ends in 5 days',
      description: 'Replay highlight battles to earn cosmetic shards.',
      reward: 'Skin Shards'
    }
  ];
}
