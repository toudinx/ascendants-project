import { Injectable, signal } from '@angular/core';

export type LogActor = 'player' | 'enemy' | 'system';

export interface UiLogEntry {
  id: string;
  turn: number;
  actor: LogActor;
  text: string;
  kind?: LogKind;
  value?: number;
  target?: 'player' | 'enemy';
}

export interface UiState {
  logs: UiLogEntry[];
  animations: string[];
  modaisAbertos: string[];
  floatEvents: FloatEvent[];
  flashPlayer: boolean;
  flashEnemy: boolean;
  transitioning: boolean;
  transitionMessage: string;
  battleSeed?: number;
}

export interface FloatEvent {
  id: string;
  value: string;
  type: 'dmg' | 'crit' | 'dot' | 'posture';
  target?: 'player' | 'enemy';
  pos?: { x: number; y: number };
}

export type LogKind =
  | 'damage'
  | 'multihit'
  | 'dot'
  | 'posture'
  | 'break'
  | 'superbreak'
  | 'energy'
  | 'summary'
  | 'system';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private logCounter = 0;
  private floatCounter = 0;

  readonly state = signal<UiState>({
    logs: [],
    animations: [],
    modaisAbertos: [],
    floatEvents: [],
    flashPlayer: false,
    flashEnemy: false,
    transitioning: false,
    transitionMessage: 'Loading...',
    battleSeed: undefined
  });

  pushLog(
    text: string,
    actor: LogActor = 'system',
    turn = 0,
    id?: string,
    meta?: Partial<UiLogEntry>
  ): UiLogEntry {
    const entry: UiLogEntry = {
      id: id ?? `log-${++this.logCounter}`,
      text,
      actor,
      turn,
      kind: meta?.kind ?? 'system',
      value: meta?.value,
      target: meta?.target
    };
    this.state.update(current => ({
      ...current,
      logs: [entry, ...current.logs].slice(0, 50)
    }));
    return entry;
  }

  setLogs(entries: UiLogEntry[]): void {
    this.logCounter = entries.length;
    const trimmed = [...entries].slice(-50).reverse();
    this.state.update(current => ({
      ...current,
      logs: trimmed
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
    const id = `float-${++this.floatCounter}`;
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

  setBattleSeed(seed: number): void {
    this.state.update(current => ({ ...current, battleSeed: seed }));
  }

  resetBattleUi(seed?: number): void {
    this.logCounter = 0;
    this.floatCounter = 0;
    this.state.update(current => ({
      ...current,
      logs: [],
      floatEvents: [],
      battleSeed: seed ?? current.battleSeed
    }));
  }
}
