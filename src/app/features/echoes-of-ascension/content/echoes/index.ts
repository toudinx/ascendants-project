import { EchoDefinition } from '../../models/echo.model';
import { SENTINEL_ECHOES } from './defs/sentinel.echoes';
import { RUIN_ECHOES } from './defs/ruin.echoes';
import { RESONANCE_ECHOES } from './defs/resonance.echoes';
import { FORTUNE_ECHOES } from './defs/fortune.echoes';
import { COLOSSUS_ECHOES } from './defs/colossus.echoes';
import { WRATH_ECHOES } from './defs/wrath.echoes';

const ECHO_DEFS: EchoDefinition[] = [
  ...SENTINEL_ECHOES,
  ...RUIN_ECHOES,
  ...RESONANCE_ECHOES,
  ...FORTUNE_ECHOES,
  ...COLOSSUS_ECHOES,
  ...WRATH_ECHOES
];

export const ECHO_REGISTRY: Record<string, EchoDefinition[]> = ECHO_DEFS.reduce<
  Record<string, EchoDefinition[]>
>((acc, def) => {
  const list = acc[def.pathId] ?? [];
  list.push(def);
  acc[def.pathId] = list;
  return acc;
}, {});

export const ECHO_CATALOG: Record<string, EchoDefinition> = ECHO_DEFS.reduce<Record<string, EchoDefinition>>(
  (acc, def) => {
    acc[def.id] = def;
    return acc;
  },
  {}
);

export function getEchoes(): EchoDefinition[] {
  return [...ECHO_DEFS];
}

export function getEchoById(id: string): EchoDefinition | undefined {
  return ECHO_CATALOG[id];
}

export function validateEchoCatalog(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  ECHO_DEFS.forEach(def => {
    if (!def.id || !def.name) {
      errors.push('Echo missing id or name.');
    }
    if (!def.pathId) {
      errors.push(`Echo ${def.id} missing pathId.`);
    }
    if (seen.has(def.id)) {
      errors.push(`Duplicate echo id: ${def.id}`);
    }
    seen.add(def.id);
    if (!def.description) {
      errors.push(`Echo ${def.id} missing description.`);
    }
  });
  return errors;
}
