import { EnemyDef } from '../enemies/enemies.types';
import { ValidationReport } from './types';

export interface EnemyValidationContext {
  existingIds?: Set<string>;
}

const ENEMY_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENEMY_KINDS = new Set(['normal', 'elite', 'boss']);

export function validateEnemyDef(def: EnemyDef, context: EnemyValidationContext = {}): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ENEMY_ID_REGEX.test(def.id)) {
    errors.push('Id must be kebab-case (lowercase letters, digits, dashes).');
  }
  if (context.existingIds && context.existingIds.has(def.id)) {
    errors.push(`Id "${def.id}" already exists in catalog.`);
  }

  if (!ENEMY_KINDS.has(def.kind)) {
    errors.push(`Kind "${def.kind}" is invalid.`);
  }

  if (def.base.hp <= 0) {
    errors.push('Base HP must be greater than zero.');
  }
  if (def.base.attack <= 0) {
    errors.push('Base ATK must be greater than zero.');
  }
  if (def.base.posture <= 0) {
    errors.push('Base posture must be greater than zero.');
  }

  if (def.abilities.heavy) {
    if ((def.abilities.heavy.telegraphTurns ?? 0) < 1) {
      errors.push('Heavy attack telegraphTurns must be >= 1.');
    }
    if (def.abilities.heavy.damageMultiplier <= 1) {
      errors.push('Heavy attack damageMultiplier must be > 1.');
    }
  }

  validateAiPlan(def, errors, warnings);

  return { errors, warnings };
}

function validateAiPlan(def: EnemyDef, errors: string[], warnings: string[]): void {
  const plan = def.aiPlan;
  if (!plan) {
    errors.push('Enemy must define an aiPlan.');
    return;
  }

  switch (plan.type) {
    case 'simple-auto':
      if (def.abilities.heavy) {
        warnings.push('Heavy ability defined but aiPlan never uses it.');
      }
      break;
    case 'elite-one-strong-hit':
      if (!def.abilities.heavy) {
        errors.push('Elite strong-hit plan requires a heavy ability.');
      }
      if (plan.strongHitMultiplier <= 1) {
        errors.push('Elite strong-hit multiplier must be > 1.');
      }
      break;
    case 'boss-cycle-4':
      if (!def.abilities.heavy) {
        errors.push('Boss cycle plan requires a heavy ability.');
      }
      if (!plan.cycle || plan.cycle.length !== 4) {
        errors.push('Boss cycle must define a 4-step pattern.');
      } else if (!plan.cycle.includes('slam')) {
        warnings.push('Boss cycle should include a slam action.');
      }
      if (plan.slamMultiplier <= 1) {
        errors.push('Boss slam multiplier must be > 1.');
      }
      break;
    default:
      errors.push('Unknown AI plan type.');
  }
}
