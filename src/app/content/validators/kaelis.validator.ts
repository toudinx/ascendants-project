import { KaelisDef } from '../kaelis/kaelis.types';
import { BALANCE_CONFIG } from '../balance/balance.config';
import { KAELIS_LIST, mapDefinitionToContent } from '../kaelis';
import { WithScoresReport } from './types';

export interface KaelisValidationContext {
  existingIds?: Set<string>;
  referenceDamageScore?: number;
  referenceSurvivabilityScore?: number;
}

const ROUTE_TYPES = new Set(['Sentinel', 'Ruin', 'Resonance', 'Fortune', 'Colossus', 'Wrath']);
const ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function computeKaelisScores(def: KaelisDef): { damageScore: number; survivabilityScore: number } {
  const kit = def.kit;
  const multihitBonus =
    kit.multihit?.count && kit.multihit?.perHitMultiplier
      ? kit.multihit.count * kit.multihit.perHitMultiplier * 0.6
      : 0;
  const dotBonus =
    kit.dot?.durationTurns && kit.dot?.stacksPerUse && kit.dot?.tickMultiplier
      ? kit.dot.stacksPerUse * kit.dot.tickMultiplier * kit.dot.durationTurns * 0.25
      : 0;
  const estimateCycleDamage = (kit.autoMultiplier * 3 + kit.skillMultiplier) / 4;
  const damageScore = estimateCycleDamage + multihitBonus + dotBonus;

  const hp = def.base.hp;
  const drPercent = def.base.damageReductionPercent ?? BALANCE_CONFIG.playerDefaults.damageReductionPercent;
  const drFraction = Math.min(BALANCE_CONFIG.damageReductionCap, Math.max(0, drPercent / 100));
  const drWeight = drFraction >= 0.99 ? 10 : 1 / (1 - drFraction);
  const survivabilityScore = hp * drWeight;

  return { damageScore, survivabilityScore };
}

export function validateKaelisDef(def: KaelisDef, context: KaelisValidationContext = {}): WithScoresReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ID_REGEX.test(def.id)) {
    errors.push('Id must be kebab-case (lowercase letters, digits, dashes).');
  }
  if (context.existingIds && context.existingIds.has(def.id)) {
    errors.push(`Id "${def.id}" already exists in catalog.`);
  }
  if (!ROUTE_TYPES.has(def.routeType)) {
    errors.push(`Route type "${def.routeType}" is invalid.`);
  }
  if (!def.base.hp || def.base.hp <= 0) {
    errors.push('Base HP must be greater than zero.');
  }
  if (!def.base.atk || def.base.atk <= 0) {
    errors.push('Base ATK must be greater than zero.');
  }

  if (def.kit.autoMultiplier <= 0) {
    errors.push('autoMultiplier must be greater than zero.');
  }
  if (def.kit.skillMultiplier <= 0) {
    errors.push('skillMultiplier must be greater than zero.');
  }
  if (!Number.isInteger(def.kit.skillCooldownTurns) || def.kit.skillCooldownTurns < 0) {
    errors.push('skillCooldownTurns must be an integer >= 0.');
  }
  if (def.kit.skillEnergyCost < 0) {
    errors.push('skillEnergyCost must be >= 0.');
  }
  if (def.kit.dot) {
    if (def.kit.dot.durationTurns < 1) {
      errors.push('dot.durationTurns must be >= 1.');
    }
    if (def.kit.dot.stacksPerUse < 1) {
      errors.push('dot.stacksPerUse must be >= 1.');
    }
    if (def.kit.dot.tickMultiplier <= 0) {
      errors.push('dot.tickMultiplier must be > 0.');
    }
  }
  if (def.kit.multihit) {
    if (def.kit.multihit.count < 1) {
      errors.push('multihit.count must be >= 1.');
    }
    if (def.kit.multihit.perHitMultiplier <= 0) {
      errors.push('multihit.perHitMultiplier must be > 0.');
    }
  }

  const scores = computeKaelisScores(def);

  const referenceDamage =
    context.referenceDamageScore ??
    Math.max(
      BALANCE_CONFIG.referenceKaelis.baseDamageScore,
      ...KAELIS_LIST.map(entry => computeKaelisScores(mapDefinitionToContent(entry)).damageScore)
    );
  const referenceSurvivability =
    context.referenceSurvivabilityScore ??
    Math.max(
      BALANCE_CONFIG.referenceKaelis.baseSurvivabilityScore,
      ...KAELIS_LIST.map(entry => computeKaelisScores(mapDefinitionToContent(entry)).survivabilityScore)
    );

  if (scores.damageScore > referenceDamage * 1.2) {
    warnings.push('Damage score exceeds late-game reference by more than 20%.');
  }

  if (
    scores.survivabilityScore > referenceSurvivability * 1.2 &&
    scores.damageScore <= referenceDamage * 1.05
  ) {
    warnings.push('Survivability significantly above reference without proportional DPS tradeoff.');
  }

  return {
    errors,
    warnings,
    damageScore: scores.damageScore,
    survivabilityScore: scores.survivabilityScore
  };
}
