import { Injectable, computed, signal } from '@angular/core';

export interface VelvetSkin {
  id: string;
  name: string;
  rarity: 'R' | 'SR' | 'SSR';
  description: string;
  unlocked: boolean;
  isNew?: boolean;
  tags?: string[];
  artUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SkinStateService {
  private readonly initialSkins: VelvetSkin[] = [
    {
      id: 'default',
      name: 'Initial Transcendence',
      rarity: 'R',
      description: "Velvet's base look, minimalist premium.",
      unlocked: true,
      tags: ['base']
    },
    {
      id: 'carmesim',
      name: 'Velvet Crimson',
      rarity: 'SR',
      description: 'Rouge arcana with crimson detailing.',
      unlocked: false,
      tags: ['event', 'premium']
    },
    {
      id: 'ascendente-eterna',
      name: 'Velvet Eternal Ascendant',
      rarity: 'SSR',
      description: 'Gilded ascendant form, eternal aura.',
      unlocked: false,
      tags: ['limited', 'banner']
    }
  ];

  readonly skins = signal<VelvetSkin[]>([...this.initialSkins]);
  readonly currentSkinId = signal<string>('default');
  readonly lastObtainedSkins = signal<VelvetSkin[]>([]);

  readonly currentSkin = computed(() => this.getCurrentSkin());

  getCurrentSkin(): VelvetSkin {
    const current = this.currentSkinId();
    return this.skins().find(s => s.id === current) ?? this.skins()[0];
  }

  setCurrentSkin(id: string): void {
    if (!this.skins().find(s => s.id === id && s.unlocked)) return;
    this.currentSkinId.set(id);
    this.markSkinAsSeen(id);
  }

  unlockSkin(id: string): void {
    this.skins.update(list =>
      list.map(s => (s.id === id ? { ...s, unlocked: true, isNew: true } : s))
    );
  }

  markSkinAsSeen(id: string): void {
    this.skins.update(list =>
      list.map(s => (s.id === id ? { ...s, isNew: false } : s))
    );
  }

  addObtainedSkins(skins: VelvetSkin[]): void {
    const ids = skins.map(s => s.id);
    this.skins.update(list =>
      list.map(s => (ids.includes(s.id) ? { ...s, unlocked: true, isNew: true } : s))
    );
    this.lastObtainedSkins.set(
      this.skins().filter(s => ids.includes(s.id))
    );
  }

  resetNewFlags(): void {
    this.skins.update(list => list.map(s => ({ ...s, isNew: false })));
    this.lastObtainedSkins.set([]);
  }

  clearLastObtained(): void {
    this.lastObtainedSkins.set([]);
  }
}
