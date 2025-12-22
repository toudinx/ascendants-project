import { KaelisRouteType } from './kaelis-route.model';

export interface KaelisBaseStats {
  hpBase: number;
  postureBase: number;
  energyBase: number;
  atkBase: number;
  defBase: number;
  critRateBase: number;
  critDmgBase: number;
  dmgPctBase: number;
  drPctBase: number;
  healPctBase: number;
  multiHitBase: number;
  dotChanceBase: number;
  penetrationBase: number;
  energyRegenBase: number;
}

export interface KaelisKitConfig {
  autoMultiplier: number;
  skillMultiplier: number;
  skillHits?: number;
  skillCooldownTurns: number;
  skillEnergyCost: number;
  multihitBonus?: number;
  dotStacksPerSkill?: number;
  multihit?: KaelisKitMultihitConfig;
  dot?: KaelisKitDotConfig;
  notes?: string;
}

export interface KaelisKitMultihitConfig {
  count: number;
  perHitMultiplier: number;
}

export interface KaelisKitDotConfig {
  durationTurns: number;
  stacksPerUse: number;
  tickMultiplier: number;
}

export interface KaelisProfileMeta {
  level: number;
  xpCurrent: number;
  xpMax: number;
  affinity: number;
}

export interface KaelisDefinition {
  id: string;
  name: string;
  title: string;
  description: string;
  routeType: KaelisRouteType;
  portrait: string;
  sprite: string;
  defaultBattleSpriteId: string;
  imageUrl?: string;
  role: string;
  baseStats: KaelisBaseStats;
  kit: KaelisKitConfig;
  profile?: KaelisProfileMeta;
}

export type KaelisId = KaelisDefinition['id'];

export type RunKaelisSnapshot = KaelisDefinition;
