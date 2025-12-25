import { BargainDefinition } from '../../models/bargain.model';
import { DEVILS_OATH_BARGAIN } from './defs/devils-oath.bargain';
import { SHADOW_COMPACT_BARGAIN } from './defs/shadow-compact.bargain';

const BARGAIN_DEFS: BargainDefinition[] = [DEVILS_OATH_BARGAIN, SHADOW_COMPACT_BARGAIN];

export const BARGAIN_CATALOG: Record<string, BargainDefinition> = BARGAIN_DEFS.reduce<Record<string, BargainDefinition>>(
  (acc, def) => {
    acc[def.id] = def;
    return acc;
  },
  {}
);

export function getBargains(): BargainDefinition[] {
  return [...BARGAIN_DEFS];
}

export function getBargainById(id: string): BargainDefinition | undefined {
  return BARGAIN_CATALOG[id];
}

export function validateBargainCatalog(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  BARGAIN_DEFS.forEach(def => {
    if (!def.id || !def.name) {
      errors.push('Bargain missing id or name.');
    }
    if (seen.has(def.id)) {
      errors.push(`Duplicate bargain id: ${def.id}`);
    }
    seen.add(def.id);
    if (!def.description) {
      errors.push(`Bargain ${def.id} missing description.`);
    }
  });
  return errors;
}
