import { Injectable, inject } from '@angular/core';
import { AscensionRunInitOptions, AscensionRunStateService } from '../state/ascension-run-state.service';
import { AscensionGeneratorService } from './ascension-generator.service';
import { AscensionRoomGeneratorService } from './ascension-room-generator.service';
import { AscensionBargainService } from './ascension-bargain.service';
import type { AscensionRoomType, AscensionRunState } from '../state/ascension-run-state.model';
import { EchoDefinition } from '../models/echo.model';

export type AscensionNextStep = 'draft' | 'shop' | 'bargain';

@Injectable({ providedIn: 'root' })
export class AscensionOrchestratorService {
  private readonly state = inject(AscensionRunStateService);
  private readonly generator = inject(AscensionGeneratorService);
  private readonly roomGenerator = inject(AscensionRoomGeneratorService);
  private readonly bargainService = inject(AscensionBargainService);

  startNewRun(options: AscensionRunInitOptions = {}): AscensionRunState {
    const run = this.state.createNewRun(options);
    return run;
  }

  resetRun(): void {
    this.state.resetRun();
  }

  previewDraft(seed?: number): EchoDefinition[] {
    return this.generator.getEchoDraft(3, seed);
  }

  onBattleWin(): AscensionNextStep {
    const snapshot = this.state.getSnapshot();
    const bonusFragments = this.bonusFragmentsPerVictory(snapshot);
    const fragmentsAwarded = this.awardFragments(snapshot.floorIndex) + bonusFragments;
    const floorPlan = this.roomGenerator.getFloorPlan(snapshot.floorIndex);
    const shopDecision = this.roomGenerator.shouldSpawnShop(snapshot);
    const bargainDecision = this.bargainService.shouldSpawnBargain(
      snapshot,
      floorPlan,
      shopDecision.spawn
    );
    const nextStep = this.determineNextStep(shopDecision, bargainDecision.spawn);
    const nextRoomType: AscensionRoomType = nextStep;

    this.state.patchState({
      echoFragments: snapshot.echoFragments + fragmentsAwarded,
      echoFragmentsEarnedTotal:
        snapshot.echoFragmentsEarnedTotal + fragmentsAwarded,
      floorsCleared: Math.max(snapshot.floorsCleared, snapshot.floorIndex),
      roomType: nextRoomType,
      bargainPending: bargainDecision.pending,
      bargainWindow: bargainDecision.nextWindow,
      shopVisited: snapshot.shopVisited || nextStep === 'shop'
    });

    return nextStep;
  }

  private determineNextStep(
    shopDecision: { spawn: boolean; forced: boolean },
    bargainSpawned: boolean
  ): AscensionNextStep {
    if (shopDecision.forced) return 'shop';
    if (bargainSpawned) return 'bargain';
    if (shopDecision.spawn) return 'shop';
    return 'draft';
  }

  private awardFragments(floorIndex: number): number {
    const base = 4;
    const bonus = Math.min(4, Math.floor(floorIndex / 2));
    return base + bonus;
  }

  private bonusFragmentsPerVictory(snapshot: AscensionRunState): number {
    return snapshot.runModifiers?.fragmentsPerVictory ?? 0;
  }
}
