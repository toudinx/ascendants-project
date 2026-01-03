import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent, RarityTagComponent } from '../../shared/components';
import { SkinStateService, VelvetSkin } from '../../core/services/skin-state.service';

@Component({
  selector: 'app-velvet-collection-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, AppCardComponent, AppButtonComponent, AppTagComponent, PremiumTeaseComponent, RarityTagComponent],
  template: `
    <app-header title="Velvet Collection" subtitle="Pick your favorite skin and flex mid-run." kicker="Skins"></app-header>

    <div class="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        @for (skin of skins; track skin.id) {
          <app-card
            [title]="skin.name"
            [subtitle]="skin.description"
            [tag]="skin.tags?.join(' - ')"
            class="transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-95"
            [ngClass]="{
              'outline outline-2 outline-[#8A7CFF] outline-offset-2': skin.id === currentSkinId,
              'opacity-60': !skin.unlocked,
              'skin-ssr': skin.rarity === 'SSR',
              'skin-sr': skin.rarity === 'SR'
            }"
            (click)="onSelect(skin)"
          >
            <div class="flex items-center justify-between text-sm text-[#A4A4B5]">
              <app-rarity-tag [rarity]="skin.rarity"></app-rarity-tag>
              @if (skin.isNew) {
                <app-tag label="New" tone="accent"></app-tag>
              }
              @if (skin.id === currentSkinId) {
                <app-tag label="In Use" tone="success"></app-tag>
              }
            </div>
            <div class="mt-3 h-32 rounded-[12px] bg-gradient-to-br from-white/10 via-white/5 to-transparent"></div>
            @if (!skin.unlocked) {
              <p class="mt-2 text-xs text-[#FF5A78]">Earned via Gacha/Event (future)</p>
            }
          </app-card>
        }
      </div>

      <div class="space-y-3">
        <app-card [title]="previewSkin?.name || 'Select a skin'" [subtitle]="previewSkin?.description || 'Choose one on the left'" [interactive]="false">
          <div class="mb-3 h-48 rounded-[14px] bg-gradient-to-br from-[#8A7CFF]/20 via-[#E28FE8]/10 to-[#050511]"></div>
          <div class="flex flex-wrap gap-2">
            @if (previewSkin) {
              <app-rarity-tag [rarity]="previewSkin?.rarity || 'R'"></app-rarity-tag>
            }
            @for (tag of previewSkin?.tags || []; track tag) {
              <app-tag [label]="tag" tone="accent"></app-tag>
            }
          </div>
          <div class="mt-3 flex flex-col gap-2">
            <app-button
              label="Equip Skin"
              variant="primary"
              [disabled]="!previewSkin?.unlocked"
              (click)="useSkin(previewSkin)"
            ></app-button>
            <app-premium-tease size="compact" title="Premium skins via gacha/event" subtitle="No real spending."></app-premium-tease>
          </div>
        </app-card>
      </div>
    </div>
  `
})
export class VelvetCollectionPageComponent {
  protected readonly skinState = inject(SkinStateService);

  protected get skins(): VelvetSkin[] {
    return this.skinState.skins();
  }

  protected get currentSkinId(): string {
    return this.skinState.currentSkinId();
  }

  protected previewSkin?: VelvetSkin = this.skinState.getCurrentSkin();

  onSelect(skin: VelvetSkin): void {
    this.previewSkin = skin;
    if (skin.isNew) this.skinState.markSkinAsSeen(skin.id);
    if (!skin.unlocked) return;
    this.skinState.setCurrentSkin(skin.id);
  }

  useSkin(skin?: VelvetSkin): void {
    if (!skin || !skin.unlocked) return;
    this.skinState.setCurrentSkin(skin.id);
  }
}
