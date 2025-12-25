import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ASCENSION_CONFIG } from '../content/configs/ascension.config';
import { AscensionRoomType, AscensionRunState } from './ascension-run-state.model';

export interface AscensionRunInitOptions {
  seed?: number;
  originPathId?: string | null;
  runPathId?: string | null;
  selectedPotionId?: string | null;
  floorIndex?: number;
  roomType?: AscensionRoomType;
  hpMax?: number;
  hpCurrent?: number;
}

@Injectable({ providedIn: 'root' })
export class AscensionRunStateService {
  private readonly stateSubject = new BehaviorSubject<AscensionRunState>(
    this.createBaseState()
  );

  getState(): Observable<AscensionRunState> {
    return this.stateSubject.asObservable();
  }

  getSnapshot(): AscensionRunState {
    return this.stateSubject.value;
  }

  patchState(partial: Partial<AscensionRunState>): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, ...partial });
  }

  createNewRun(options: AscensionRunInitOptions = {}): AscensionRunState {
    const seed = typeof options.seed === 'number' ? options.seed : this.randomSeed();
    const hpMax = options.hpMax ?? ASCENSION_CONFIG.baseHp;
    const hpCurrent = options.hpCurrent ?? hpMax;
    const nextState = this.createBaseState({
      runId: this.uid(),
      seed,
      floorIndex: this.clampFloor(options.floorIndex ?? 1),
      roomType: options.roomType ?? 'start',
      originPathId: options.originPathId ?? null,
      runPathId: options.runPathId ?? null,
      selectedPotionId: options.selectedPotionId ?? null,
      hpMax,
      hpCurrent,
      bargainWindow: ASCENSION_CONFIG.defaultBargainWindow
    });
    this.stateSubject.next(nextState);
    return nextState;
  }

  resetRun(): void {
    this.stateSubject.next(this.createBaseState());
  }

  private createBaseState(overrides: Partial<AscensionRunState> = {}): AscensionRunState {
    return {
      runId: '',
      seed: 0,
      randomCounter: 0,
      floorIndex: 1,
      roomType: 'start',
      originPathId: null,
      runPathId: null,
      hpCurrent: ASCENSION_CONFIG.baseHp,
      hpMax: ASCENSION_CONFIG.baseHp,
      potionUsed: false,
      selectedPotionId: null,
      activePotionId: null,
      runModifiers: {},
      echoFragments: ASCENSION_CONFIG.startingEchoFragments,
      pickedEchoIds: [],
      originEchoCount: ASCENSION_CONFIG.startingEchoCount,
      runEchoCount: ASCENSION_CONFIG.startingRunEchoCount,
      resonanceActive: false,
      resonanceId: null,
      resonanceUpgradeIds: [],
      bargainPending: false,
      bargainWindow: ASCENSION_CONFIG.defaultBargainWindow,
      bargainsTaken: 0,
      bargainTakenForResonance: false,
      lastBargainFloor: null,
      shopVisited: false,
      draftHistory: [],
      nextFightBuffs: undefined,
      runOutcome: null,
      floorsCleared: 0,
      echoFragmentsEarnedTotal: 0,
      echoFragmentsSpentTotal: 0,
      endTimestamp: null,
      ...overrides
    };
  }

  private clampFloor(value: number): number {
    return Math.min(ASCENSION_CONFIG.totalFloors, Math.max(1, Math.floor(value)));
  }

  private uid(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  private randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000_000);
  }
}
