import { BALANCE_CONFIG } from '../balance/balance.config';
import { KaelisDefinition, KaelisBaseStats, KaelisKitConfig } from '../../core/models/kaelis.model';
import { KaelisDef, KaelisBaseTemplate } from './kaelis.types';
import { VELVET_DEF } from './defs/velvet.def';
import { LUMEN_DEF } from './defs/lumen.def';

const RAW_KAELIS: KaelisDef[] = [VELVET_DEF, LUMEN_DEF];
export const KAELIS_DEFS = RAW_KAELIS;

function resolveBaseStats(template: KaelisBaseTemplate): KaelisBaseStats {
  const defaults = BALANCE_CONFIG.playerDefaults;
  return {
    hpBase: template.hp,
    postureBase: template.posture ?? Math.floor(template.hp * 0.15),
    energyBase: template.energy ?? 100,
    atkBase: template.atk,
    defBase: template.defense ?? 40,
    critRateBase: template.critRate ?? defaults.critRate,
    critDmgBase: template.critDamage ?? defaults.critDamage,
    dmgPctBase: template.damagePercent ?? defaults.damagePercent,
    drPctBase: template.damageReductionPercent ?? defaults.damageReductionPercent,
    healPctBase: template.healPercent ?? defaults.healPercent,
    multiHitBase: template.multiHitChance ?? 0.2,
    dotChanceBase: template.dotChance ?? 0.2,
    penetrationBase: template.penetration ?? 0.2,
    energyRegenBase: template.energyRegenPercent ?? defaults.energyRegenPercent
  };
}

function mapKaelisDef(def: KaelisDef): KaelisDefinition {
  const baseStats = resolveBaseStats(def.base);
  const kit: KaelisKitConfig = { ...def.kit };
  return {
    id: def.id,
    name: def.name,
    title: def.title,
    description: def.description,
    routeType: def.routeType,
    portrait: def.portrait,
    sprite: def.sprite,
    defaultBattleSpriteId: def.defaultBattleSpriteId,
    imageUrl: def.imageUrl,
    role: def.role,
    baseStats,
    kit,
    profile: { ...def.profile }
  };
}

export function mapDefinitionToContent(def: KaelisDefinition): KaelisDef {
  return {
    id: def.id,
    name: def.name,
    title: def.title,
    description: def.description,
    routeType: def.routeType,
    portrait: def.portrait,
    sprite: def.sprite,
    defaultBattleSpriteId: def.defaultBattleSpriteId,
    imageUrl: def.imageUrl ?? def.portrait,
    role: def.role,
    base: {
      hp: def.baseStats.hpBase,
      atk: def.baseStats.atkBase,
      posture: def.baseStats.postureBase,
      energy: def.baseStats.energyBase,
      defense: def.baseStats.defBase,
      critRate: def.baseStats.critRateBase,
      critDamage: def.baseStats.critDmgBase,
      damagePercent: def.baseStats.dmgPctBase,
      damageReductionPercent: def.baseStats.drPctBase,
      healPercent: def.baseStats.healPctBase,
      multiHitChance: def.baseStats.multiHitBase,
      dotChance: def.baseStats.dotChanceBase,
      penetration: def.baseStats.penetrationBase,
      energyRegenPercent: def.baseStats.energyRegenBase
    },
    kit: { ...def.kit },
    profile: def.profile ?? {
      level: 1,
      xpCurrent: 0,
      xpMax: 100,
      affinity: 1
    }
  };
}

export const KAELIS_CATALOG: Record<string, KaelisDefinition> = RAW_KAELIS.reduce<Record<string, KaelisDefinition>>(
  (acc, def) => {
    const mapped = mapKaelisDef(def);
    acc[mapped.id] = mapped;
    return acc;
  },
  {}
);

export const KAELIS_LIST: KaelisDefinition[] = Object.values(KAELIS_CATALOG);
export const DEFAULT_KAELIS_ID = KAELIS_LIST[0]?.id ?? 'velvet';

export function getKaelisDefinition(id: string): KaelisDefinition | undefined {
  return KAELIS_CATALOG[id];
}
