import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent, AppTagComponent } from '../../../shared/components';

@Component({
  selector: 'store-premium-card',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, AppTagComponent],
  template: `
    <div class="relative overflow-hidden rounded-[18px] border border-[#8A7CFF]/30 glass p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-neon">
      <div class="absolute inset-0 opacity-30 blur-3xl">
        <div class="absolute left-0 top-0 h-32 w-32 rounded-full bg-[#8A7CFF]/25"></div>
        <div class="absolute right-0 bottom-0 h-32 w-32 rounded-full bg-[#E28FE8]/25"></div>
      </div>
      <div class="relative space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
            <p class="text-sm text-[#A4A4B5]">{{ subtitle }}</p>
          </div>
          <app-tag *ngIf="highlight" [label]="highlight" tone="accent"></app-tag>
        </div>
        <div class="h-36 rounded-[12px] bg-gradient-to-br from-white/10 via-white/5 to-transparent"></div>
        <p class="text-sm text-[#A4A4B5]">{{ description }}</p>
        <app-button label="View Details" variant="primary"></app-button>
      </div>
    </div>
  `
})
export class StorePremiumCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() description = '';
  @Input() art?: string;
  @Input() highlight?: string;
}
