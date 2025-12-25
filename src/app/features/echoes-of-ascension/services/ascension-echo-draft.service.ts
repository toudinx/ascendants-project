import { Injectable, inject, isDevMode } from '@angular/core';
import { getEchoById, getEchoes } from '../content/echoes';
import { getResonances } from '../content/resonances';
import { EchoDefinition } from '../models/echo.model';
import {
  AscensionDraftOption,
  AscensionEchoDraftOption,
  AscensionRestDraftOption
} from '../models/ascension-draft-option.model';
import { AscensionRunStateService } from '../state/ascension-run-state.service';
import { AscensionRandomService } from './ascension-random.service';
import type {
  AscensionRunState,
  AscensionDraftHistoryEntry
} from '../state/ascension-run-state.model';

type PathChoice = string | null;

const REST_NAME = 'Rest';
const REST_DESCRIPTION = 'Heal 15% of your current HP.';
const REST_TAG = 'REST';

@Injectable({ providedIn: 'root' })
export class AscensionEchoDraftService {
  private readonly state = inject(AscensionRunStateService);
  private readonly random = inject(AscensionRandomService);

  generateOffer(): AscensionDraftOption[] {
    const snapshot = this.state.getSnapshot();
    const available = this.getAvailableEchoes(snapshot);
    const poolByPath = this.groupByPath(available);
    const originPathId = snapshot.originPathId;
    const runPathId = snapshot.runPathId;
    const originAvailableCount = originPathId
      ? poolByPath.get(originPathId)?.length ?? 0
      : 0;
    const runAvailableCount = runPathId
      ? poolByPath.get(runPathId)?.length ?? 0
      : 0;
    const resonanceUnlocked = this.isResonanceUnlocked(snapshot);

    if (
      !resonanceUnlocked &&
      ((originPathId && originAvailableCount === 0) ||
        (runPathId && runAvailableCount === 0))
    ) {
      this.logDiagnostics('draft-path-exhausted', snapshot, poolByPath, []);
    }

    const eligiblePaths = Array.from(poolByPath.keys()).filter(
      pathId => (poolByPath.get(pathId)?.length ?? 0) > 0
    );

    const selectedPaths = eligiblePaths.length
      ? this.buildPathSlots(snapshot, eligiblePaths, poolByPath)
      : [];
    const echoOffer = this.pickOffer(selectedPaths, poolByPath, available);

    const offer: AscensionDraftOption[] = echoOffer.map(def => ({
      kind: 'echo',
      id: def.id,
      echo: def
    }));

    if (offer.length < 3) {
      const restNeeded = 3 - offer.length;
      for (let i = 0; i < restNeeded; i += 1) {
        offer.push(this.createRestOption(offer.length + 1));
      }
      if (restNeeded > 0) {
        this.logDiagnostics('draft-rest-fallback', snapshot, poolByPath, offer);
      }
    }

    this.updateDraftHistory(snapshot, offer, originPathId, runPathId);
    return offer;
  }

  applyEchoPick(echoId: string): { resonanceUnlocked: boolean } {
    const snapshot = this.state.getSnapshot();
    if (snapshot.pickedEchoIds.includes(echoId)) {
      return { resonanceUnlocked: false };
    }
    const echo = getEchoById(echoId);
    if (!echo) {
      return { resonanceUnlocked: false };
    }

    const nextPicked = [...snapshot.pickedEchoIds, echoId];
    const originMatches =
      !!snapshot.originPathId && echo.pathId === snapshot.originPathId;
    const runMatches = !!snapshot.runPathId && echo.pathId === snapshot.runPathId;
    const originEchoCount = snapshot.originEchoCount + (originMatches ? 1 : 0);
    const runEchoCount = snapshot.runEchoCount + (runMatches ? 1 : 0);
    const resonanceUnlocked =
      !snapshot.resonanceActive && originEchoCount >= 3 && runEchoCount >= 2;
    const resonanceId = resonanceUnlocked
      ? snapshot.resonanceId ?? this.pickResonanceId(snapshot)
      : snapshot.resonanceId ?? null;

    const patch: Partial<AscensionRunState> = {
      pickedEchoIds: nextPicked,
      originEchoCount,
      runEchoCount
    };

    if (resonanceUnlocked) {
      patch.resonanceActive = true;
      patch.resonanceId = resonanceId;
      patch.resonanceUpgradeIds = snapshot.resonanceUpgradeIds?.length
        ? snapshot.resonanceUpgradeIds
        : [];
      patch.bargainPending = true;
      patch.bargainWindow = 2;
    }

    this.state.patchState(patch);
    return { resonanceUnlocked };
  }

  applyRestPick(): void {
    const snapshot = this.state.getSnapshot();
    const healAmount = Math.ceil(snapshot.hpCurrent * 0.15);
    const hpCurrent = Math.min(snapshot.hpMax, snapshot.hpCurrent + healAmount);
    this.state.patchState({ hpCurrent });
  }

  private getAvailableEchoes(snapshot: AscensionRunState): EchoDefinition[] {
    const picked = new Set(snapshot.pickedEchoIds);
    return getEchoes().filter(def => !picked.has(def.id));
  }

  private buildPathSlots(
    snapshot: AscensionRunState,
    eligiblePaths: string[],
    poolByPath: Map<string, EchoDefinition[]>
  ): string[] {
    const originPathId = snapshot.originPathId;
    const runPathId = snapshot.runPathId;
    const maxUnique = Math.min(3, eligiblePaths.length);
    const chosen: string[] = [];

    const required = this.getPityRequiredPaths(
      snapshot,
      originPathId,
      runPathId,
      poolByPath
    );
    required.forEach(pathId => {
      if (!chosen.includes(pathId)) {
        chosen.push(pathId);
      }
    });

    while (chosen.length < maxUnique) {
      const available = eligiblePaths.filter(pathId => !chosen.includes(pathId));
      const pick = this.rollWeightedPath(originPathId, runPathId, available);
      if (!pick) break;
      chosen.push(pick);
    }

    while (chosen.length < 3 && eligiblePaths.length > 0) {
      const pick = this.rollWeightedPath(originPathId, runPathId, eligiblePaths);
      if (!pick) break;
      chosen.push(pick);
    }

    return chosen;
  }

  private rollWeightedPath(
    originPathId: string | null,
    runPathId: string | null,
    availablePaths: string[]
  ): PathChoice {
    if (!availablePaths.length) return null;
    const flexPaths = availablePaths.filter(
      pathId => pathId !== originPathId && pathId !== runPathId
    );

    const weighted: Array<{ ids: string[]; weight: number }> = [];
    if (originPathId && availablePaths.includes(originPathId)) {
      weighted.push({ ids: [originPathId], weight: 0.45 });
    }
    if (runPathId && availablePaths.includes(runPathId)) {
      weighted.push({ ids: [runPathId], weight: 0.35 });
    }
    if (flexPaths.length) {
      weighted.push({ ids: flexPaths, weight: 0.2 });
    }

    if (!weighted.length) {
      return availablePaths[this.random.nextInt(availablePaths.length)] ?? null;
    }

    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.random.nextFloat() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.ids[this.random.nextInt(entry.ids.length)] ?? null;
      }
    }

    const fallback = weighted[weighted.length - 1];
    return fallback.ids[this.random.nextInt(fallback.ids.length)] ?? null;
  }

  private getPityRequiredPaths(
    snapshot: AscensionRunState,
    originPathId: string | null,
    runPathId: string | null,
    poolByPath: Map<string, EchoDefinition[]>
  ): string[] {
    if (this.isResonanceUnlocked(snapshot)) return [];
    const history = snapshot.draftHistory ?? [];
    const needsRun = this.needsPity(history, 'runOptions');
    const needsOrigin = this.needsPity(history, 'originOptions');
    const required: string[] = [];

    if (needsRun && runPathId && (poolByPath.get(runPathId)?.length ?? 0) > 0) {
      required.push(runPathId);
    }
    if (
      needsOrigin &&
      originPathId &&
      (poolByPath.get(originPathId)?.length ?? 0) > 0
    ) {
      required.push(originPathId);
    }

    return required;
  }

  private needsPity(
    history: AscensionDraftHistoryEntry[],
    key: 'originOptions' | 'runOptions'
  ): boolean {
    if (!Array.isArray(history) || history.length < 2) return false;
    const lastTwo = history.slice(-2);
    return lastTwo.every(entry => entry[key] === 0);
  }

  private pickOffer(
    slots: PathChoice[],
    poolByPath: Map<string, EchoDefinition[]>,
    available: EchoDefinition[]
  ): EchoDefinition[] {
    const picked = new Set<string>();
    const offer: EchoDefinition[] = [];

    slots.forEach(pathId => {
      const pick = this.pickFromPath(pathId, poolByPath, picked);
      if (pick) {
        offer.push(pick);
        return;
      }
      const fallback = this.pickFromPool(available, picked);
      if (fallback) {
        offer.push(fallback);
      }
    });

    while (offer.length < 3) {
      const fallback = this.pickFromPool(available, picked);
      if (!fallback) break;
      offer.push(fallback);
    }

    return offer;
  }

  private pickFromPath(
    pathId: PathChoice,
    poolByPath: Map<string, EchoDefinition[]>,
    picked: Set<string>,
  ): EchoDefinition | null {
    if (!pathId) return null;
    const pool = poolByPath.get(pathId) ?? [];
    const available = pool.filter(def => !picked.has(def.id));
    const pick = this.pickRandom(available);
    if (pick) {
      picked.add(pick.id);
    }
    return pick;
  }

  private pickFromPool(
    pool: EchoDefinition[],
    picked: Set<string>,
  ): EchoDefinition | null {
    const available = pool.filter(def => !picked.has(def.id));
    const pick = this.pickRandom(available);
    if (pick) {
      picked.add(pick.id);
    }
    return pick;
  }

  private pickRandom<T>(pool: T[]): T | null {
    if (!pool.length) return null;
    return pool[this.random.nextInt(pool.length)];
  }

  private groupByPath(pool: EchoDefinition[]): Map<string, EchoDefinition[]> {
    const map = new Map<string, EchoDefinition[]>();
    pool.forEach(def => {
      const list = map.get(def.pathId) ?? [];
      list.push(def);
      map.set(def.pathId, list);
    });
    return map;
  }

  private updateDraftHistory(
    snapshot: AscensionRunState,
    offer: AscensionDraftOption[],
    originPathId: string | null,
    runPathId: string | null
  ): void {
    const echoOptions = offer.filter(this.isEchoOption);
    const originOptions = originPathId
      ? echoOptions.filter(def => def.echo.pathId === originPathId).length
      : 0;
    const runOptions = runPathId
      ? echoOptions.filter(def => def.echo.pathId === runPathId).length
      : 0;
    const nextEntry: AscensionDraftHistoryEntry = {
      originOptions,
      runOptions
    };
    const history = [...(snapshot.draftHistory ?? []), nextEntry].slice(-2);
    this.state.patchState({ draftHistory: history });
  }

  private pickResonanceId(snapshot: AscensionRunState): string | null {
    const resonances = getResonances();
    if (!resonances.length) return null;
    const pick = resonances[this.random.nextInt(resonances.length)];
    return pick?.id ?? null;
  }

  private isResonanceUnlocked(snapshot: AscensionRunState): boolean {
    return (
      snapshot.resonanceActive ||
      (snapshot.originEchoCount >= 3 && snapshot.runEchoCount >= 2)
    );
  }

  private createRestOption(index: number): AscensionRestDraftOption {
    return {
      kind: 'rest',
      id: `rest-${index}`,
      name: REST_NAME,
      description: REST_DESCRIPTION,
      tag: REST_TAG
    };
  }

  private isEchoOption(option: AscensionDraftOption): option is AscensionEchoDraftOption {
    return option.kind === 'echo';
  }

  private logDiagnostics(
    reason: string,
    snapshot: AscensionRunState,
    poolByPath: Map<string, EchoDefinition[]>,
    offer: AscensionDraftOption[]
  ): void {
    if (!isDevMode()) return;
    const availableByPath: Record<string, number> = {};
    poolByPath.forEach((pool, pathId) => {
      availableByPath[pathId] = pool.length;
    });
    const offerPaths = offer.map(option =>
      option.kind === 'echo' ? option.echo.pathId : option.tag
    );
    console.warn('[AscensionDraft]', reason, {
      seed: snapshot.seed,
      floorIndex: snapshot.floorIndex,
      originPathId: snapshot.originPathId,
      runPathId: snapshot.runPathId,
      availableByPath,
      offerPaths,
      pickedEchoCount: snapshot.pickedEchoIds.length
    });
  }
}
