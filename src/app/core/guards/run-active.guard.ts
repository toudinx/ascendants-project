import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { RunStateService } from '../services/run-state.service';

const ensureRunActive = (): boolean | UrlTree => {
  const runState = inject(RunStateService);
  const router = inject(Router);
  return runState.phase() === 'idle' ? router.parseUrl('/') : true;
};

export const runActiveCanActivate: CanActivateFn = () => ensureRunActive();
export const runActiveCanMatch: CanMatchFn = () => ensureRunActive();
