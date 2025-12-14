import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppButtonComponent } from '../../../shared/components';

@Component({
  selector: 'app-store-item-card',
  standalone: true,
  imports: [CommonModule, AppButtonComponent],
  template: `
    <div class="card-surface flex h-full flex-col gap-3 border border-white/10 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-white/20">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#8A7CFF]/15 text-xl text-white/90">
          {{ icon || '✦' }}
        </div>
        <div>
          <h3 class="text-base font-semibold text-white">{{ name }}</h3>
          <p class="text-sm text-[#A4A4B5]">{{ description }}</p>
        </div>
      </div>
      <div class="mt-auto flex items-center justify-between text-sm text-[#A4A4B5]">
        <span>{{ price }}</span>
        <app-button label="Buy" variant="secondary"></app-button>
      </div>
    </div>
  `
})
export class StoreItemCardComponent {
  @Input() name = '';
  @Input() description = '';
  @Input() price = '';
  @Input() icon?: string;
}
