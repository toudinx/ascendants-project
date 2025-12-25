import { Injectable } from '@angular/core';
import { ASCENSION_CONFIG } from '../content/configs/ascension.config';
import { ASCENSION_PATHS } from '../content/configs/ascension-paths';
import { getAscensionPotionById } from '../content/configs/ascension-potions';
import { getEchoById } from '../content/echoes';
import { getResonanceById } from '../content/resonances';
import type { AscensionRunState } from '../state/ascension-run-state.model';

type EchoGroupKind = 'origin' | 'run' | 'flex';

export interface AscensionEchoEntryVM {
  name: string;
  description: string;
  pathId: string;
}

export interface AscensionEchoGroupVM {
  kind: EchoGroupKind;
  pathId: string;
  pathName: string;
  tag: string;
  echoes: AscensionEchoEntryVM[];
}

export interface AscensionRunDetailsVM {
  floorLabel: string;
  echoFragments: number;
  potionName: string;
  potionEffect: string;
  resonanceActive: boolean;
  resonanceName: string;
  resonanceEffect: string;
  originEchoesCollected: number;
  runEchoesCollected: number;
  originRequirement: number;
  runRequirement: number;
  originPathName: string;
  runPathName: string;
  echoGroups: AscensionEchoGroupVM[];
}

@Injectable({ providedIn: 'root' })
export class AscensionRunViewModelService {
  buildRunDetails(state: AscensionRunState): AscensionRunDetailsVM {
    const potion =
      getAscensionPotionById(state.activePotionId) ??
      getAscensionPotionById(state.selectedPotionId);
    const resonance = state.resonanceId
      ? getResonanceById(state.resonanceId)
      : undefined;
    const originPathName = this.pathName(state.originPathId);
    const runPathName = this.pathName(state.runPathId);

    return {
      floorLabel: `${state.floorIndex} / ${ASCENSION_CONFIG.totalFloors}`,
      echoFragments: state.echoFragments,
      potionName: potion?.name ?? 'None',
      potionEffect: potion?.effectText ?? 'No active potion.',
      resonanceActive: state.resonanceActive,
      resonanceName: resonance?.name ?? `${originPathName} x ${runPathName}`,
      resonanceEffect: resonance?.description ?? 'Resonance not yet unlocked.',
      originEchoesCollected: state.originEchoCount,
      runEchoesCollected: state.runEchoCount,
      originRequirement: 3,
      runRequirement: 2,
      originPathName,
      runPathName,
      echoGroups: this.buildEchoGroups(state)
    };
  }

  private buildEchoGroups(state: AscensionRunState): AscensionEchoGroupVM[] {
    const grouped = new Map<string, AscensionEchoEntryVM[]>();
    state.pickedEchoIds.forEach(id => {
      const echo = getEchoById(id);
      if (!echo) return;
      const list = grouped.get(echo.pathId) ?? [];
      list.push({
        name: echo.name,
        description: echo.description,
        pathId: echo.pathId
      });
      grouped.set(echo.pathId, list);
    });

    const groups: AscensionEchoGroupVM[] = [];
    grouped.forEach((echoes, pathId) => {
      groups.push({
        kind: this.groupKind(pathId, state.originPathId, state.runPathId),
        pathId,
        pathName: this.pathName(pathId),
        tag: this.groupTag(pathId, state.originPathId, state.runPathId),
        echoes
      });
    });

    return groups.sort(this.groupSort(state.originPathId, state.runPathId));
  }

  private groupKind(
    pathId: string,
    originPathId: string | null,
    runPathId: string | null
  ): EchoGroupKind {
    if (pathId === originPathId) return 'origin';
    if (pathId === runPathId) return 'run';
    return 'flex';
  }

  private groupTag(
    pathId: string,
    originPathId: string | null,
    runPathId: string | null
  ): string {
    if (pathId === originPathId) return 'ORIGIN';
    if (pathId === runPathId) return 'RUN';
    return 'FLEX';
  }

  private groupSort(
    originPathId: string | null,
    runPathId: string | null
  ): (a: AscensionEchoGroupVM, b: AscensionEchoGroupVM) => number {
    const order = [originPathId, runPathId];
    return (a, b) => {
      const aIndex = order.indexOf(a.pathId);
      const bIndex = order.indexOf(b.pathId);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      }
      return a.pathName.localeCompare(b.pathName);
    };
  }

  private pathName(pathId: string | null): string {
    if (!pathId) return 'Unknown';
    return ASCENSION_PATHS.find(path => path.id === pathId)?.name ?? pathId;
  }
}
