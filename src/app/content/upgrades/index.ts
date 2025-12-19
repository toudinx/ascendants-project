import { UpgradeDef, UpgradeTrack } from './upgrade.types';
import { PRECISION_EDGE_UPGRADE } from './defs/precision-edge.upgrade';
import { RESERVOIR_BURST_UPGRADE } from './defs/reservoir-burst.upgrade';
import { BULWARK_ENTRY_UPGRADE } from './defs/bulwark-entry.upgrade';

const UPGRADE_DEFS: UpgradeDef[] = [
  PRECISION_EDGE_UPGRADE,
  RESERVOIR_BURST_UPGRADE,
  BULWARK_ENTRY_UPGRADE
];

export const UPGRADE_CATALOG: Record<string, UpgradeDef> = UPGRADE_DEFS.reduce<Record<string, UpgradeDef>>(
  (acc, def) => {
    acc[def.id] = def;
    return acc;
  },
  {}
);

export function getUpgradesByTrack(track: UpgradeTrack): UpgradeDef[] {
  return UPGRADE_DEFS.filter(def => def.track === track);
}

export function validateUpgradeCatalog(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  UPGRADE_DEFS.forEach(def => {
    if (!def.id || !def.name) {
      errors.push('Upgrade missing id or name.');
    }
    if (seen.has(def.id)) {
      errors.push(`Duplicate upgrade id: ${def.id}`);
    }
    seen.add(def.id);
    if (!def.track) {
      errors.push(`Upgrade ${def.id} missing track.`);
    }
    if (!def.rarity) {
      errors.push(`Upgrade ${def.id} missing rarity.`);
    }
    if (!def.duration) {
      errors.push(`Upgrade ${def.id} missing duration.`);
    }
    if (!def.effects?.length) {
      errors.push(`Upgrade ${def.id} missing effects.`);
    }
    if (!def.modifiers) {
      errors.push(`Upgrade ${def.id} missing modifiers.`);
    }
  });
  return errors;
}
