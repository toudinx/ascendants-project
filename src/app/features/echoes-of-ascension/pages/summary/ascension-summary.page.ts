import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppHeaderComponent } from '../../../../shared/components';
import { ProfileStateService } from '../../../../core/services/profile-state.service';
import { LoadoutService } from '../../../../core/services/loadout.service';
import { ASCENSION_PATHS } from '../../content/configs/ascension-paths';
import { ASCENSION_CONFIG } from '../../content/configs/ascension.config';
import { getEchoById } from '../../content/echoes';
import { getResonanceById } from '../../content/resonances';
import { AscensionRunStateService } from '../../state/ascension-run-state.service';
import type { AscensionRunState } from '../../state/ascension-run-state.model';

@Component({
  selector: 'app-ascension-summary-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './ascension-summary.page.html',
  styleUrls: ['./ascension-summary.page.scss']
})
export class AscensionSummaryPageComponent {
  private readonly runState = inject(AscensionRunStateService);
  private readonly profile = inject(ProfileStateService);
  private readonly loadout = inject(LoadoutService);
  private readonly router = inject(Router);

  protected readonly state$ = this.runState.getState();
  protected readonly totalFloors = ASCENSION_CONFIG.totalFloors;
  protected readonly fallbackPortrait = 'assets/battle/characters/placeholder.png';

  get activeKaelis() {
    return this.profile.activeKaelis();
  }

  get kaelisStageImage(): string {
    const skin = this.loadout.getEquippedSkin(this.activeKaelis.id);
    return (
      skin?.imageUrl ||
      this.activeKaelis.imageUrl ||
      this.activeKaelis.portrait ||
      this.fallbackPortrait
    );
  }

  pathName(pathId: string | null): string {
    if (!pathId) return 'Unknown';
    return ASCENSION_PATHS.find(path => path.id === pathId)?.name ?? pathId;
  }

  outcomeLabel(state: AscensionRunState): string {
    if (state.runOutcome === 'victory') return 'Victory';
    if (state.runOutcome === 'defeat') return 'Defeat';
    return 'Run Complete';
  }

  resonanceName(state: AscensionRunState): string {
    if (!state.resonanceActive || !state.resonanceId) return 'None';
    return getResonanceById(state.resonanceId)?.name ?? state.resonanceId;
  }

  pickedEchoes(state: AscensionRunState): Array<{ id: string; name: string; pathId: string }> {
    return state.pickedEchoIds.map(id => {
      const def = getEchoById(id);
      return {
        id,
        name: def?.name ?? id,
        pathId: def?.pathId ?? 'Unknown'
      };
    });
  }

  runAgain(): void {
    this.runState.resetRun();
    this.router.navigateByUrl('/ascension/start');
  }

  backToHome(): void {
    this.runState.resetRun();
    this.router.navigateByUrl('/');
  }
}
