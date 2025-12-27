import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppHeaderComponent } from '../../../../shared/components';
import { ASCENSION_CONFIG } from '../../content/configs/ascension.config';
import { AscensionBargainService } from '../../services/ascension-bargain.service';
import { AscensionRunStateService } from '../../state/ascension-run-state.service';
import { ResonanceDefinition, ResonanceUpgradeOption } from '../../models/resonance.model';
import type { AscensionRunState } from '../../state/ascension-run-state.model';

@Component({
  selector: 'app-ascension-bargain-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './ascension-bargain.page.html',
  styleUrls: ['./ascension-bargain.page.scss']
})
export class AscensionBargainPageComponent implements OnInit {
  private readonly runState = inject(AscensionRunStateService);
  private readonly bargainService = inject(AscensionBargainService);
  private readonly router = inject(Router);

  protected readonly state$ = this.runState.getState();
  protected resonance: ResonanceDefinition | null = null;
  protected options: ResonanceUpgradeOption[] = [];
  protected isResolving = false;
  protected readonly offerHotkeys = ['1', '2', '3'];

  ngOnInit(): void {
    const snapshot = this.runState.getSnapshot();
    this.resonance = this.bargainService.getActiveResonance(snapshot);
    this.options = this.bargainService.generateBargainOptions(snapshot);
  }

  resonanceSummary(
    resonance: ResonanceDefinition,
    state: AscensionRunState
  ): Array<{ label: string; value: string }> {
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

  selectOption(option: ResonanceUpgradeOption): void {
    if (this.isResolving) return;
    this.isResolving = true;
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
    this.bargainService.declineBargain();
    this.advanceToBattle();
  }

  @HostListener('window:keydown', ['$event'])
  handleHotkeys(event: KeyboardEvent): void {
    if (event.repeat || this.isResolving) return;
    if (this.isEditableTarget(event.target)) return;

    if (event.code === 'Space') {
      event.preventDefault();
      this.decline();
      return;
    }

    const optionIndex = this.offerHotkeyIndex(event.code);
    if (optionIndex === null) return;
    const option = this.options[optionIndex];
    if (!option) return;
    event.preventDefault();
    this.selectOption(option);
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

  private offerHotkeyIndex(code: string): number | null {
    switch (code) {
      case 'Digit1':
      case 'Numpad1':
        return 0;
      case 'Digit2':
      case 'Numpad2':
        return 1;
      case 'Digit3':
      case 'Numpad3':
        return 2;
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
}
