import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent } from '../../shared/components';
import { ProfileStateService } from '../../core/services/profile-state.service';
import { KaelisDefinition, KaelisId } from '../../core/models/kaelis.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-character-select-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent],
  template: `
    <app-header title="Kaelis Select" subtitle="Choose who leads your next ascension run." kicker="Roster"></app-header>
    <div class="mb-4 flex justify-end">
      <app-button label="Edit Loadout" variant="ghost" size="sm" (click)="goToLoadout()"></app-button>
    </div>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      @for (kaelis of kaelisList(); track kaelis.id) {
        <app-card
          [title]="kaelis.name"
          [subtitle]="kaelis.title"
          [interactive]="true"
          (click)="select(kaelis.id)"
          [ngClass]="{
            'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[#050511]': isActive(kaelis.id)
          }"
        >
          <div class="flex gap-3">
            <img
              class="h-20 w-20 rounded-[12px] border border-white/10 object-cover"
              [src]="kaelis.portrait"
              [alt]="kaelis.name"
            />
            <div class="flex-1 space-y-2 text-xs text-white/70">
              <p>{{ kaelis.description }}</p>
              <div class="flex flex-wrap gap-2">
                <app-tag [label]="kaelis.routeType" tone="accent"></app-tag>
                <app-tag [label]="kaelis.role" tone="muted"></app-tag>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[11px] text-white/60">
                <span>HP {{ kaelis.baseStats.hpBase }}</span>
                <span>ATK {{ kaelis.baseStats.atkBase }}</span>
                <span>Crit {{ (kaelis.baseStats.critRateBase * 100) | number : '1.0-0' }}%</span>
                <span>DOT {{ (kaelis.baseStats.dotChanceBase * 100) | number : '1.0-0' }}%</span>
              </div>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between text-xs text-white/60">
            <div>
              Skill {{ kaelis.kit.skillMultiplier }}x /
              {{ kaelis.kit.skillHits ?? 1 }} hit{{ kaelis.kit.skillHits === 1 ? '' : 's' }}
              · {{ kaelis.kit.skillEnergyCost }} EP
            </div>
            <app-button
              [label]="isActive(kaelis.id) ? 'Active' : 'Select'"
              [variant]="isActive(kaelis.id) ? 'primary' : 'secondary'"
              size="sm"
              [disabled]="isActive(kaelis.id)"
              (click)="$event.stopPropagation(); select(kaelis.id)"
            ></app-button>
          </div>
        </app-card>
      }
    </div>
  `
})
export class CharacterSelectPageComponent {
  protected readonly profile = inject(ProfileStateService);
  protected readonly router = inject(Router);

  kaelisList(): KaelisDefinition[] {
    return this.profile.kaelisList();
  }

  isActive(id: KaelisId): boolean {
    return this.profile.activeKaelis().id === id;
  }

  select(id: KaelisId): void {
    this.profile.setSelectedKaelis(id);
  }

  goToLoadout(): void {
    this.router.navigate(['/loadout']);
  }
}
