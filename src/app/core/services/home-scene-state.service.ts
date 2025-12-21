import { Injectable, computed, effect, signal } from '@angular/core';
import { HOME_BACKGROUNDS, HOME_KAELIS, getDefaultHomeScene } from '../../content/home';

interface HomeSceneStoredState {
  backgroundId: string;
  kaelisId: string;
}

const STORAGE_KEY = 'ascendants-home-scene';

@Injectable({ providedIn: 'root' })
export class HomeSceneStateService {
  private readonly defaults = getDefaultHomeScene();
  private readonly backgroundIds = new Set(Object.keys(HOME_BACKGROUNDS));
  private readonly kaelisIds = new Set(Object.keys(HOME_KAELIS));

  readonly currentBackgroundId = signal<string>(this.defaults.backgroundId);
  readonly currentKaelisId = signal<string>(this.defaults.kaelisId);

  readonly currentBackground = computed(
    () => HOME_BACKGROUNDS[this.currentBackgroundId()] ?? HOME_BACKGROUNDS[this.defaults.backgroundId]
  );
  readonly currentKaelis = computed(
    () => HOME_KAELIS[this.currentKaelisId()] ?? HOME_KAELIS[this.defaults.kaelisId]
  );

  constructor() {
    this.hydrate();
    effect(() => this.persist());
  }

  setBackground(id: string): void {
    const next = this.resolveBackgroundId(id);
    if (!next || next === this.currentBackgroundId()) return;
    this.currentBackgroundId.set(next);
  }

  setKaelis(id: string): void {
    const next = this.resolveKaelisId(id);
    if (!next || next === this.currentKaelisId()) return;
    this.currentKaelisId.set(next);
  }

  private hydrate(): void {
    if (!this.hasStorage()) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<HomeSceneStoredState> | null;
      const backgroundId = this.resolveBackgroundId(parsed?.backgroundId);
      const kaelisId = this.resolveKaelisId(parsed?.kaelisId);
      if (backgroundId) {
        this.currentBackgroundId.set(backgroundId);
      }
      if (kaelisId) {
        this.currentKaelisId.set(kaelisId);
      }
    } catch {
      // ignore malformed storage entries
    }
  }

  private persist(): void {
    if (!this.hasStorage()) return;
    const payload: HomeSceneStoredState = {
      backgroundId: this.currentBackgroundId(),
      kaelisId: this.currentKaelisId()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // swallow storage errors to avoid crashing on quota issues
    }
  }

  private resolveBackgroundId(id: unknown): string | null {
    if (typeof id !== 'string') return null;
    return this.backgroundIds.has(id) ? id : null;
  }

  private resolveKaelisId(id: unknown): string | null {
    if (typeof id !== 'string') return null;
    return this.kaelisIds.has(id) ? id : null;
  }

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }
}
