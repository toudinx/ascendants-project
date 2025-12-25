import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppHeaderComponent } from '../../../../shared/components';
import { ASCENSION_CONFIG } from '../../content/configs/ascension.config';
import { ASCENSION_PATHS } from '../../content/configs/ascension-paths';
import { AscensionEchoDraftService } from '../../services/ascension-echo-draft.service';
import { AscensionRunStateService } from '../../state/ascension-run-state.service';
import { EchoDefinition } from '../../models/echo.model';
import {
  AscensionDraftOption,
  AscensionEchoDraftOption
} from '../../models/ascension-draft-option.model';
import type { AscensionRunState } from '../../state/ascension-run-state.model';

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

  pathRoleLabel(echo: EchoDefinition, state: AscensionRunState): string {
    if (echo.pathId === state.originPathId) return 'Origin';
    if (echo.pathId === state.runPathId) return 'Run';
    return 'Flex';
  }

  selectOption(option: AscensionDraftOption): void {
    if (this.isResolving) return;
    this.isResolving = true;

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

  protected isEchoOption(
    option: AscensionDraftOption
  ): option is AscensionEchoDraftOption {
    return option.kind === 'echo';
  }
}
