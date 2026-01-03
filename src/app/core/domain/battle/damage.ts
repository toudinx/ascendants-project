import {
  clampDamageReduction,
  MULTI_HIT_HP_SCALARS,
  MULTI_HIT_HP_SCALAR_MIN,
  MULTI_HIT_POSTURE_SCALARS
} from "../../../content/balance/balance.config";

export function resolveMultiHitScalar(
  hitIndex: number,
  scalars: number[],
  minScalar?: number
): number {
  if (!scalars.length) return 1;
  const index = Math.min(hitIndex, scalars.length - 1);
  const scalar = scalars[index];
  if (!Number.isFinite(scalar)) {
    return typeof minScalar === "number" ? minScalar : 1;
  }
  if (typeof minScalar === "number") {
    return Math.max(minScalar, scalar);
  }
  return scalar;
}

export function applyMultiHitHpScalar(baseDamage: number, hitIndex: number): number {
  if (baseDamage <= 0) return 0;
  const scalar = resolveMultiHitScalar(
    hitIndex,
    MULTI_HIT_HP_SCALARS,
    MULTI_HIT_HP_SCALAR_MIN
  );
  return Math.max(1, Math.round(baseDamage * scalar));
}

export function applyMultiHitPostureScalar(basePosture: number, hitIndex: number): number {
  if (basePosture <= 0) return 0;
  const scalar = resolveMultiHitScalar(hitIndex, MULTI_HIT_POSTURE_SCALARS);
  return Math.max(1, Math.round(basePosture * scalar));
}

export function computeDamageTaken(
  rawDamage: number,
  damageReductionPercent?: number
): number {
  if (rawDamage <= 0) return 0;
  const drPercent = damageReductionPercent ?? 0;
  const dr = clampDamageReduction(drPercent / 100);
  return Math.max(1, Math.floor(rawDamage * (1 - dr)));
}
