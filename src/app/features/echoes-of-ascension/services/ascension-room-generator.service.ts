import { Injectable, inject } from '@angular/core';
import type { AscensionRunState } from '../state/ascension-run-state.model';
import { AscensionRandomService } from './ascension-random.service';

export interface AscensionFloorPlan {
  floorIndex: number;
  isShopCandidate: boolean;
  shopChance: number | null;
  isChallenge: boolean;
  isBoss: boolean;
}

export interface AscensionShopDecision {
  spawn: boolean;
  forced: boolean;
  chance: number | null;
}

@Injectable({ providedIn: 'root' })
export class AscensionRoomGeneratorService {
  private readonly random = inject(AscensionRandomService);
  private readonly shopCandidates = new Map<number, number>([
    [5, 0.6],
    [9, 0.8]
  ]);
  private readonly challengeFloors = new Set<number>([6]);
  private readonly bossFloors = new Set<number>([10]);

  getFloorPlan(floorIndex: number): AscensionFloorPlan {
    const chance = this.shopCandidates.get(floorIndex) ?? null;
    return {
      floorIndex,
      isShopCandidate: chance !== null,
      shopChance: chance,
      isChallenge: this.challengeFloors.has(floorIndex),
      isBoss: this.bossFloors.has(floorIndex)
    };
  }

  shouldSpawnShop(snapshot: AscensionRunState): AscensionShopDecision {
    const chance = this.shopCandidates.get(snapshot.floorIndex);
    if (chance === undefined) {
      return { spawn: false, forced: false, chance: null };
    }

    if (snapshot.floorIndex === 9 && !snapshot.shopVisited) {
      return { spawn: true, forced: true, chance };
    }

    return { spawn: this.random.nextFloat() < chance, forced: false, chance };
  }
}
