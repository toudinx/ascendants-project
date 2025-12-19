import { EnemyDef, EnemyKind } from './enemies.types';
import { STORM_RAIDER_DEF } from './defs/raider.def';
import { SIEGE_WARDEN_DEF } from './defs/warden.def';
import { BRASADRACO_DEF } from './defs/brasadraco.def';

const RAW_ENEMIES: EnemyDef[] = [STORM_RAIDER_DEF, SIEGE_WARDEN_DEF, BRASADRACO_DEF];
export const ENEMY_DEFS = RAW_ENEMIES;

export const ENEMY_CATALOG: Record<string, EnemyDef> = RAW_ENEMIES.reduce<Record<string, EnemyDef>>((acc, def) => {
  acc[def.id] = def;
  return acc;
}, {});

export function getEnemyDef(id: string): EnemyDef | undefined {
  return ENEMY_CATALOG[id];
}

export function getEnemyByKind(kind: EnemyKind): EnemyDef {
  const fallback = RAW_ENEMIES.find(def => def.kind === kind);
  if (!fallback) {
    throw new Error(`No enemy definition found for kind ${kind}`);
  }
  return fallback;
}
