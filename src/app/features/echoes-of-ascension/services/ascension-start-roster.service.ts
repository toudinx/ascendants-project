import { Injectable, inject } from '@angular/core';
import { ProfileStateService } from '../../../core/services/profile-state.service';
import { KaelisId } from '../../../core/models/kaelis.model';

@Injectable({ providedIn: 'root' })
export class AscensionStartRosterService {
  private readonly profile = inject(ProfileStateService);

  getRoster() {
    return this.profile.kaelisList();
  }

  getSelectedId(): string {
    return this.profile.selectedKaelisId();
  }

  setSelectedId(id: KaelisId): void {
    this.profile.setSelectedKaelis(id);
  }

  cycle(direction: 'prev' | 'next'): void {
    const roster = this.profile.kaelisList();
    if (!roster.length) return;
    const currentId = this.profile.selectedKaelisId();
    const currentIndex = roster.findIndex(item => item.id === currentId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      direction === 'next'
        ? (safeIndex + 1) % roster.length
        : (safeIndex - 1 + roster.length) % roster.length;
    const nextKaelis = roster[nextIndex];
    if (nextKaelis) {
      this.profile.setSelectedKaelis(nextKaelis.id);
    }
  }
}
