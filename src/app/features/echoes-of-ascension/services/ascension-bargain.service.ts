import { Injectable, inject } from '@angular/core';
import { getResonanceById, getResonances } from '../content/resonances';
import { ResonanceDefinition, ResonanceUpgradeOption } from '../models/resonance.model';
import { AscensionRoomGeneratorService } from './ascension-room-generator.service';
import { AscensionRandomService } from './ascension-random.service';
import { AscensionRunStateService } from '../state/ascension-run-state.service';
import type { AscensionFloorPlan } from './ascension-room-generator.service';
import type { AscensionRunState } from '../state/ascension-run-state.model';

export interface BargainSpawnDecision {
  spawn: boolean;
  nextWindow: number;
  pending: boolean;
}

const MAX_BARGAINS_PER_RUN = 2;
const BARGAIN_CHANCE = 0.7;

@Injectable({ providedIn: 'root' })
export class AscensionBargainService {
  private readonly state = inject(AscensionRunStateService);
  private readonly roomGenerator = inject(AscensionRoomGeneratorService);
  private readonly random = inject(AscensionRandomService);

  shouldSpawnBargain(
    snapshot: AscensionRunState,
    floorPlan: AscensionFloorPlan,
    shopSpawned: boolean
  ): BargainSpawnDecision {
    if (!snapshot.resonanceActive || !snapshot.bargainPending) {
      return { spawn: false, nextWindow: snapshot.bargainWindow, pending: false };
    }
    if (
      snapshot.bargainsTaken >= MAX_BARGAINS_PER_RUN ||
      snapshot.bargainTakenForResonance
    ) {
      return { spawn: false, nextWindow: 0, pending: false };
    }
    if (shopSpawned || floorPlan.isChallenge || floorPlan.isBoss) {
      return {
        spawn: false,
        nextWindow: snapshot.bargainWindow,
        pending: snapshot.bargainPending
      };
    }
    if (snapshot.lastBargainFloor === snapshot.floorIndex - 1) {
      return {
        spawn: false,
        nextWindow: snapshot.bargainWindow,
        pending: snapshot.bargainPending
      };
    }

    if (snapshot.bargainWindow <= 0) {
      return {
        spawn: true,
        nextWindow: 0,
        pending: snapshot.bargainPending
      };
    }

    if (this.random.nextFloat() < BARGAIN_CHANCE) {
      return {
        spawn: true,
        nextWindow: snapshot.bargainWindow,
        pending: snapshot.bargainPending
      };
    }

    const nextWindow = Math.max(0, snapshot.bargainWindow - 1);
    return {
      spawn: false,
      nextWindow,
      pending: snapshot.bargainPending
    };
  }

  generateBargainOptions(snapshot: AscensionRunState): ResonanceUpgradeOption[] {
    const resonance = this.ensureResonance(snapshot);
    if (!resonance) return [];
    const applied = new Set(snapshot.resonanceUpgradeIds ?? []);
    const available = resonance.upgradeOptions.filter(option => !applied.has(option.id));
    if (available.length <= 2) return available;

    const count = this.random.nextFloat() < 0.55 ? 2 : 3;
    return this.pickRandomMany(available, count);
  }

  applyBargainOption(optionId: string): boolean {
    const snapshot = this.state.getSnapshot();
    const resonance = this.ensureResonance(snapshot);
    if (!resonance) return false;
    if (!snapshot.bargainPending || !snapshot.resonanceActive) return false;
    if (
      snapshot.bargainsTaken >= MAX_BARGAINS_PER_RUN ||
      snapshot.bargainTakenForResonance
    ) {
      return false;
    }

    const applied = new Set(snapshot.resonanceUpgradeIds ?? []);
    if (applied.has(optionId)) return false;

    const option = resonance.upgradeOptions.find(upgrade => upgrade.id === optionId);
    if (!option) return false;

    const hpLoss = Math.max(1, Math.round(snapshot.hpMax * option.hpCostPercent));
    const nextHpMax = Math.max(1, snapshot.hpMax - hpLoss);
    const hpCurrent = Math.min(nextHpMax, snapshot.hpCurrent);

    this.state.patchState({
      hpMax: nextHpMax,
      hpCurrent,
      resonanceUpgradeIds: [...(snapshot.resonanceUpgradeIds ?? []), optionId],
      bargainPending: false,
      bargainWindow: 0,
      bargainsTaken: snapshot.bargainsTaken + 1,
      bargainTakenForResonance: true,
      lastBargainFloor: snapshot.floorIndex
    });

    return true;
  }

  declineBargain(): void {
    const snapshot = this.state.getSnapshot();
    this.state.patchState({
      bargainPending: false,
      bargainWindow: 0,
      lastBargainFloor: snapshot.floorIndex
    });
  }

  getActiveResonance(snapshot: AscensionRunState): ResonanceDefinition | null {
    const resonance = this.ensureResonance(snapshot);
    return resonance ?? null;
  }

  getFloorPlan(snapshot: AscensionRunState): AscensionFloorPlan {
    return this.roomGenerator.getFloorPlan(snapshot.floorIndex);
  }

  private ensureResonance(snapshot: AscensionRunState): ResonanceDefinition | null {
    if (!snapshot.resonanceActive) return null;
    const id = snapshot.resonanceId ?? this.pickResonanceId(snapshot);
    if (!id) return null;
    if (id !== snapshot.resonanceId) {
      this.state.patchState({
        resonanceId: id,
        resonanceUpgradeIds: snapshot.resonanceUpgradeIds ?? []
      });
    }
    return getResonanceById(id) ?? null;
  }

  private pickResonanceId(snapshot: AscensionRunState): string | null {
    const resonances = getResonances();
    if (!resonances.length) return null;
    const pick = resonances[this.random.nextInt(resonances.length)];
    return pick?.id ?? null;
  }

  private pickRandomMany<T>(pool: T[], count: number): T[] {
    if (!pool.length || count <= 0) return [];
    const copy = [...pool];
    const picked: T[] = [];
    while (copy.length && picked.length < count) {
      const index = this.random.nextInt(copy.length);
      picked.push(copy.splice(index, 1)[0]);
    }
    return picked;
  }
}
