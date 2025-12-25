import { ResonanceDefinition } from '../../models/resonance.model';
import { PRISM_RESONANCE } from './defs/prism-resonance.resonance';
import { RIFT_RESONANCE } from './defs/rift-resonance.resonance';

const RESONANCE_DEFS: ResonanceDefinition[] = [PRISM_RESONANCE, RIFT_RESONANCE];

export const RESONANCE_CATALOG: Record<string, ResonanceDefinition> = RESONANCE_DEFS.reduce<Record<string, ResonanceDefinition>>(
  (acc, def) => {
    acc[def.id] = def;
    return acc;
  },
  {}
);

export function getResonances(): ResonanceDefinition[] {
  return [...RESONANCE_DEFS];
}

export function getResonanceById(id: string): ResonanceDefinition | undefined {
  return RESONANCE_CATALOG[id];
}

export function validateResonanceCatalog(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  RESONANCE_DEFS.forEach(def => {
    if (!def.id || !def.name) {
      errors.push('Resonance missing id or name.');
    }
    if (seen.has(def.id)) {
      errors.push(`Duplicate resonance id: ${def.id}`);
    }
    seen.add(def.id);
    if (!def.description) {
      errors.push(`Resonance ${def.id} missing description.`);
    }
    if (!def.effects?.length) {
      errors.push(`Resonance ${def.id} missing effects.`);
    }
    if (!def.upgradeOptions?.length) {
      errors.push(`Resonance ${def.id} missing upgrade options.`);
    }
  });
  return errors;
}
