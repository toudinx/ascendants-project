import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ASCENSION_CONFIG } from '../../content/configs/ascension.config';
import { ASCENSION_PATHS } from '../../content/configs/ascension-paths';
import { AscensionEchoDraftService } from '../../services/ascension-echo-draft.service';
import { AscensionRunStateService } from '../../state/ascension-run-state.service';
import { ReplayLogService } from '../../../../core/services/replay-log.service';
import { roomToStage } from '../../../../content/balance/balance.config';
import {
  AscensionDraftOption,
  AscensionEchoDraftOption
} from '../../models/ascension-draft-option.model';
import type { AscensionRunState } from '../../state/ascension-run-state.model';
import { isResonanceActive } from '../../../../core/utils/resonance.utils';
import { HotkeyService } from '../../../../core/services/hotkey.service';

type SourceRole = 'origin' | 'run' | 'flex';

interface ResonanceImpactPreview {
  kind: 'origin' | 'run' | 'none';
  label: string;
  before: number;
  after: number;
  max: number;
}

@Component({
  selector: 'app-ascension-draft-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ascension-draft.page.html',
  styleUrls: ['./ascension-draft.page.scss']
})
export class AscensionDraftPageComponent implements OnInit, OnDestroy {
  private readonly runState = inject(AscensionRunStateService);
  private readonly draftService = inject(AscensionEchoDraftService);
  private readonly replayLog = inject(ReplayLogService);
  private readonly router = inject(Router);
  private readonly hotkeys = inject(HotkeyService);

  protected readonly totalFloors = ASCENSION_CONFIG.totalFloors;
  protected readonly state$ = this.runState.getState();
  protected offer: AscensionDraftOption[] = [];
  protected bannerMessage: string | null = null;
  protected isResolving = false;
  protected selectedOptionId: string | null = null;
  private bannerTimer: number | null = null;

  ngOnInit(): void {
    this.offer = this.draftService.generateOffer();
    this.hotkeys.register({
      '1': () => this.pickByIndex(0),
      '2': () => this.pickByIndex(1),
      '3': () => this.pickByIndex(2)
    });
  }

  ngOnDestroy(): void {
    if (this.bannerTimer) {
      window.clearTimeout(this.bannerTimer);
    }
    this.hotkeys.unregisterAll();
  }

  pathName(pathId: string | null): string {
    if (!pathId) return 'Unknown';
    return ASCENSION_PATHS.find(path => path.id === pathId)?.name ?? pathId;
  }

  pathBadge(option: AscensionDraftOption): string {
    return option.kind === 'echo' ? option.echo.pathId : option.tag;
  }

  sourceRole(option: AscensionDraftOption, state: AscensionRunState): SourceRole {
    if (option.kind !== 'echo') return 'flex';
    if (option.echo.pathId === state.originPathId) return 'origin';
    if (option.echo.pathId === state.runPathId) return 'run';
    return 'flex';
  }

  sourceRoleLabel(option: AscensionDraftOption, state: AscensionRunState): string {
    return this.sourceRole(option, state).toUpperCase();
  }

  hotkeyLabel(index: number): string {
    return String(index + 1);
  }

  resonanceImpact(
    option: AscensionDraftOption,
    state: AscensionRunState
  ): ResonanceImpactPreview {
    if (option.kind === 'echo' && option.echo.pathId === state.originPathId) {
      return {
        kind: 'origin',
        label: 'Origin Echoes',
        before: state.originEchoCount,
        after: state.originEchoCount + 1,
        max: 3
      };
    }

    if (option.kind === 'echo' && option.echo.pathId === state.runPathId) {
      return {
        kind: 'run',
        label: 'Run Echoes',
        before: state.runEchoCount,
        after: state.runEchoCount + 1,
        max: 2
      };
    }

    return {
      kind: 'none',
      label: 'No resonance progress',
      before: 0,
      after: 0,
      max: 0
    };
  }

  resonanceActive(state: AscensionRunState): boolean {
    return isResonanceActive(state);
  }

  selectOption(option: AscensionDraftOption, optionIndex?: number): void {
    if (this.isResolving) return;
    this.isResolving = true;
    this.selectedOptionId = option.id;
    const index =
      typeof optionIndex === 'number' ? optionIndex : this.offer.indexOf(option);
    const pickedId = this.isEchoOption(option) ? option.echo.id : option.id;
    this.replayLog.append({
      v: 1,
      t: 'draftPick',
      payload: {
        optionIndex: Math.max(0, index),
        pickedId
      }
    });

    if (this.isEchoOption(option)) {
      const result = this.draftService.applyEchoPick(option.echo.id);
      const snapshot = this.runState.getSnapshot();

      if (result.resonanceUnlocked) {
        this.bannerMessage = this.buildResonanceMessage(snapshot);
        this.bannerTimer = window.setTimeout(() => {
          this.advanceToBattle();
        }, 900);
        return;
      }
    } else {
      this.draftService.applyRestPick();
    }

    this.advanceToBattle();
  }

  private advanceToBattle(): void {
    const snapshot = this.runState.getSnapshot();
    const nextFloor = snapshot.floorIndex + 1;

    if (nextFloor > ASCENSION_CONFIG.totalFloors) {
      this.runState.patchState({
        floorIndex: ASCENSION_CONFIG.totalFloors,
        roomType: 'summary'
      });
      this.replayLog.append({
        v: 1,
        t: 'enterRoom',
        payload: {
          roomIndex: ASCENSION_CONFIG.totalFloors,
          roomType: 'summary',
          stage: roomToStage(ASCENSION_CONFIG.totalFloors)
        }
      });
      this.router.navigateByUrl('/ascension/summary');
      return;
    }

    this.runState.patchState({ floorIndex: nextFloor, roomType: 'battle' });
    this.replayLog.append({
      v: 1,
      t: 'enterRoom',
      payload: {
        roomIndex: nextFloor,
        roomType: 'battle',
        stage: roomToStage(nextFloor)
      }
    });
    this.router.navigateByUrl('/ascension/battle');
  }

  private buildResonanceMessage(snapshot: AscensionRunState): string {
    const origin = this.pathName(snapshot.originPathId);
    const run = this.pathName(snapshot.runPathId);
    return `Resonance Unlocked: ${origin} x ${run} (3+2)`;
  }

  private pickByIndex(index: number): void {
    if (this.isResolving) return;
    const option = this.offer[index];
    if (!option) return;
    this.selectOption(option, index);
  }

  protected isEchoOption(
    option: AscensionDraftOption
  ): option is AscensionEchoDraftOption {
    return option.kind === 'echo';
  }
}
