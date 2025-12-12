import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RunPhase } from '../models/run.model';
import { RunStateService } from './run-state.service';
import { UiStateService } from './ui-state.service';

type PhaseExpectation = RunPhase | RunPhase[];

@Injectable({ providedIn: 'root' })
export class RunGuardService {
  private readonly run = inject(RunStateService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiStateService);

  isPhase(expected: PhaseExpectation): boolean {
    const current = this.run.phase();
    const allowed = Array.isArray(expected) ? expected : [expected];
    return allowed.includes(current);
  }

  ensurePhase(expected: PhaseExpectation, redirectTo = '/', map?: Partial<Record<RunPhase, string>>): void {
    if (this.isPhase(expected)) return;
    const current = this.run.phase();
    const target = (map && map[current]) || redirectTo;
    this.ui.pushLog('Out-of-phase navigation, rerouting.');
    this.router.navigate([target]);
  }
}
