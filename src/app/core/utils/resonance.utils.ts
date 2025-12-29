export interface ResonanceStateLike {
  resonanceActive?: boolean | null;
}

export interface ResonancePathStateLike {
  originPathId?: string | null;
  runPathId?: string | null;
}

export function isResonanceActive(state?: ResonanceStateLike | null): boolean {
  return !!state?.resonanceActive;
}

export function hasSentinelPath(state?: ResonancePathStateLike | null): boolean {
  if (!state) return false;
  return state.originPathId === "Sentinel" || state.runPathId === "Sentinel";
}

export function resolveSentinelHitCountBonus(
  state?: ResonanceStateLike & ResonancePathStateLike | null
): number {
  if (!state) return 0;
  return isResonanceActive(state) && hasSentinelPath(state) ? 2 : 0;
}
