import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppHeaderComponent } from '../../../../shared/components';
import { ASCENSION_CONFIG } from '../../content/configs/ascension.config';
import { AscensionBargainService } from '../../services/ascension-bargain.service';
import { AscensionRunStateService } from '../../state/ascension-run-state.service';
import { ReplayLogService } from '../../../../core/services/replay-log.service';
import { roomToStage } from '../../../../content/balance/balance.config';
import { ResonanceDefinition, ResonanceUpgradeOption } from '../../models/resonance.model';
import type { AscensionRunState } from '../../state/ascension-run-state.model';
import { HotkeyService } from '../../../../core/services/hotkey.service';

@Component({
  selector: 'app-ascension-bargain-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './ascension-bargain.page.html',
  styleUrls: ['./ascension-bargain.page.scss']
})
export class AscensionBargainPageComponent implements OnInit, OnDestroy {
  private readonly runState = inject(AscensionRunStateService);
  private readonly bargainService = inject(AscensionBargainService);
  private readonly replayLog = inject(ReplayLogService);
  private readonly router = inject(Router);
  private readonly hotkeys = inject(HotkeyService);

  protected readonly state$ = this.runState.getState();
  protected resonance: ResonanceDefinition | null = null;
  protected options: ResonanceUpgradeOption[] = [];
  protected isResolving = false;
  protected readonly offerHotkeys = ['1', '2', '3'];

  ngOnInit(): void {
    const snapshot = this.runState.getSnapshot();
    this.resonance = this.bargainService.getActiveResonance(snapshot);
    this.options = this.bargainService.generateBargainOptions(snapshot);
    this.hotkeys.register({
      '1': () => this.pickByIndex(0),
      '2': () => this.pickByIndex(1),
      '3': () => this.pickByIndex(2),
      space: () => this.decline(),
      enter: () => this.decline()
    });
  }

  ngOnDestroy(): void {
    this.hotkeys.unregisterAll();
  }

  resonanceSummary(
    resonance: ResonanceDefinition,
    state: AscensionRunState
  ): { label: string; value: string }[] {
    const upgrades = state.resonanceUpgradeIds ?? [];
    const deltaByKey = new Map<string, number>();

    upgrades.forEach(id => {
      const option = resonance.upgradeOptions.find(upgrade => upgrade.id === id);
      if (!option) return;
      deltaByKey.set(option.statKey, (deltaByKey.get(option.statKey) ?? 0) + option.delta);
    });

    return resonance.effects.map(effect => {
      const delta = deltaByKey.get(effect.key) ?? 0;
      const value = effect.baseValue + delta;
      const unit = effect.unit ? ` ${effect.unit}` : '';
      return {
        label: effect.label,
        value: `${value}${unit}`
      };
    });
  }

  optionTargetLabel(
    option: ResonanceUpgradeOption,
    resonance: ResonanceDefinition | null
  ): string {
    if (!resonance) return option.statKey;
    return (
      resonance.effects.find(effect => effect.key === option.statKey)?.label ??
      option.statKey
    );
  }

  selectOption(option: ResonanceUpgradeOption, optionIndex?: number): void {
    if (this.isResolving) return;
    this.isResolving = true;
    const index =
      typeof optionIndex === 'number'
        ? optionIndex
        : this.options.indexOf(option);
    this.replayLog.append({
      v: 1,
      t: 'bargainPick',
      payload: {
        optionIndex: Math.max(0, index),
        pickedId: option.id
      }
    });
    const applied = this.bargainService.applyBargainOption(option.id);
    if (!applied) {
      this.isResolving = false;
      return;
    }
    this.advanceToBattle();
  }

  decline(): void {
    if (this.isResolving) return;
    this.isResolving = true;
    this.replayLog.append({
      v: 1,
      t: 'bargainPick',
      payload: {
        optionIndex: -1,
        pickedId: null
      }
    });
    this.bargainService.declineBargain();
    this.advanceToBattle();
  }

  private pickByIndex(index: number): void {
    if (this.isResolving) return;
    const option = this.options[index];
    if (!option) return;
    this.selectOption(option, index);
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

}
