import { Injectable, signal } from '@angular/core';

export interface UiState {
  logs: string[];
  animations: string[];
  modaisAbertos: string[];
  floatEvents: FloatEvent[];
  flashPlayer: boolean;
  flashEnemy: boolean;
  transitioning: boolean;
  transitionMessage: string;
}

export interface FloatEvent {
  id: string;
  value: string;
  type: 'dmg' | 'crit' | 'dot' | 'posture';
  pos?: { x: number; y: number };
}

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly state = signal<UiState>({
    logs: [],
    animations: [],
    modaisAbertos: [],
    floatEvents: [],
    flashPlayer: false,
    flashEnemy: false,
    transitioning: false,
    transitionMessage: 'Loading...'
  });

  pushLog(entry: string): void {
    this.state.update(current => ({
      ...current,
      logs: [entry, ...current.logs].slice(0, 5)
    }));
  }

  queueAnimation(animation: string): void {
    this.state.update(current => ({
      ...current,
      animations: [...current.animations, animation]
    }));
  }

  openModal(key: string): void {
    this.state.update(current => ({
      ...current,
      modaisAbertos: current.modaisAbertos.includes(key)
        ? current.modaisAbertos
        : [...current.modaisAbertos, key]
    }));
  }

  closeModal(key: string): void {
    this.state.update(current => ({
      ...current,
      modaisAbertos: current.modaisAbertos.filter(m => m !== key)
    }));
  }

  pushFloatEvent(event: Omit<FloatEvent, 'id'>): void {
    const id = Math.random().toString(36).slice(2, 9);
    this.state.update(current => ({
      ...current,
      floatEvents: [{ id, ...event }, ...current.floatEvents].slice(0, 8)
    }));
  }

  triggerPlayerFlash(): void {
    this.state.update(current => ({ ...current, flashPlayer: true }));
    setTimeout(() => this.state.update(current => ({ ...current, flashPlayer: false })), 150);
  }

  triggerEnemyFlash(): void {
    this.state.update(current => ({ ...current, flashEnemy: true }));
    setTimeout(() => this.state.update(current => ({ ...current, flashEnemy: false })), 150);
  }

  startTransition(message = 'Loading...'): void {
    this.state.update(current => ({ ...current, transitioning: true, transitionMessage: message }));
  }

  endTransition(): void {
    this.state.update(current => ({ ...current, transitioning: false }));
  }
}
