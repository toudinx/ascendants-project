import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="space-y-1">
        <p *ngIf="kicker" class="text-[11px] uppercase tracking-[0.22em] text-[#A4A4B5]">{{ kicker }}</p>
        <h1 class="text-2xl font-semibold text-white leading-tight">{{ title }}</h1>
        <p *ngIf="subtitle" class="text-sm text-[#A4A4B5] max-w-2xl">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2" *ngIf="hasActions">
        <ng-content select="[actions]"></ng-content>
      </div>
    </header>
  `
})
export class AppHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() kicker?: string;
  @Input() hasActions = false;
}
