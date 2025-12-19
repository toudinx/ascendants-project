import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';

declare const ngDevMode: boolean;

const isDevMode = typeof ngDevMode === 'undefined' ? false : !!ngDevMode;

function deny(): UrlTree {
  const router = inject(Router);
  return router.parseUrl('/');
}

export const devOnlyCanMatch: CanMatchFn = () => (isDevMode ? true : deny());
export const devOnlyCanActivate: CanActivateFn = () => (isDevMode ? true : deny());
