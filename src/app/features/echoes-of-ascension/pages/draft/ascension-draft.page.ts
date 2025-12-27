import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppHeaderComponent } from '../../../../shared/components';
import { ASCENSION_CONFIG } from '../../content/configs/ascension.config';
import { ASCENSION_PATHS } from '../../content/configs/ascension-paths';
import { AscensionEchoDraftService } from '../../services/ascension-echo-draft.service';
import { AscensionRunStateService } from '../../state/ascension-run-state.service';
import {
  AscensionDraftOption,
  AscensionEchoDraftOption
} from '../../models/ascension-draft-option.model';
import type { AscensionRunState } from '../../state/ascension-run-state.model';

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
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './ascension-draft.page.html',
  styleUrls: ['./ascension-draft.page.scss']
})
export class AscensionDraftPageComponent implements OnInit, OnDestroy {
  private readonly runState = inject(AscensionRunStateService);
  private readonly draftService = inject(AscensionEchoDraftService);
  private readonly router = inject(Router);

  protected readonly totalFloors = ASCENSION_CONFIG.totalFloors;
  protected readonly state$ = this.runState.getState();
  protected offer: AscensionDraftOption[] = [];
  protected bannerMessage: string | null = null;
  protected isResolving = false;
  protected selectedOptionId: string | null = null;
  private bannerTimer: number | null = null;

  ngOnInit(): void {
    this.offer = this.draftService.generateOffer();
  }

  ngOnDestroy(): void {
    if (this.bannerTimer) {
      window.clearTimeout(this.bannerTimer);
    }
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

  @HostListener('window:keydown', ['$event'])
  handleHotkeys(event: KeyboardEvent): void {
    if (this.isResolving) return;
    if (this.isEditableTarget(event.target)) return;
    const index = this.mapDigitToIndex(event.code, 3);
    if (index === null) return;
    const option = this.offer[index];
    if (!option) return;
    event.preventDefault();
    this.selectOption(option);
  }

  selectOption(option: AscensionDraftOption): void {
    if (this.isResolving) return;
    this.isResolving = true;
    this.selectedOptionId = option.id;

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
      this.router.navigateByUrl('/ascension/summary');
      return;
    }

    this.runState.patchState({ floorIndex: nextFloor, roomType: 'battle' });
    this.router.navigateByUrl('/ascension/battle');
  }

  private buildResonanceMessage(snapshot: AscensionRunState): string {
    const origin = this.pathName(snapshot.originPathId);
    const run = this.pathName(snapshot.runPathId);
    return `Resonance Unlocked: ${origin} x ${run} (3+2)`;
  }

  private mapDigitToIndex(
    code: string,
    count: number,
    offset = 1
  ): number | null {
    const digit = this.digitFromCode(code);
    if (digit === null) return null;
    const index = digit - offset;
    if (index < 0 || index >= count) return null;
    return index;
  }

  private digitFromCode(code: string): number | null {
    switch (code) {
      case 'Digit1':
      case 'Numpad1':
        return 1;
      case 'Digit2':
      case 'Numpad2':
        return 2;
      case 'Digit3':
      case 'Numpad3':
        return 3;
      default:
        return null;
    }
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }
    return target.isContentEditable;
  }

  protected isEchoOption(
    option: AscensionDraftOption
  ): option is AscensionEchoDraftOption {
    return option.kind === 'echo';
  }
}
