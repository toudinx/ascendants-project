import { KaelisRouteType } from '../../core/models/kaelis-route.model';

export interface KaelisBaseTemplate {
  hp: number;
  atk: number;
  posture?: number;
  energy?: number;
  defense?: number;
  critRate?: number;
  critDamage?: number;
  damagePercent?: number;
  damageReductionPercent?: number;
  healPercent?: number;
  multiHitChance?: number;
  dotChance?: number;
  penetration?: number;
  energyRegenPercent?: number;
}

export interface KaelisKitDef {
  autoMultiplier: number;
  skillMultiplier: number;
  skillHits?: number;
  skillCooldownTurns: number;
  skillEnergyCost: number;
  multihitBonus?: number;
  dotStacksPerSkill?: number;
  multihit?: KaelisKitMultihitDef;
  dot?: KaelisKitDotDef;
  tags?: string[];
}

export interface KaelisKitMultihitDef {
  count: number;
  perHitMultiplier: number;
}

export interface KaelisKitDotDef {
  durationTurns: number;
  stacksPerUse: number;
  tickMultiplier: number;
}

export interface KaelisDef {
  id: string;
  name: string;
  title: string;
  description: string;
  routeType: KaelisRouteType;
  portrait: string;
  sprite: string;
  role: string;
  tags?: string[];
  base: KaelisBaseTemplate;
  kit: KaelisKitDef;
}
