export type EnemyKind = 'normal' | 'elite' | 'boss';

export interface EnemyBaseStats {
  hp: number;
  attack: number;
  posture: number;
}

export interface EnemyCombatProfile {
  defense: number;
  critChance: number;
  critDamage: number;
  multiHitChance: number;
  baseHitCount?: number;
  dotChance: number;
}

export interface EnemyAbilitySpec {
  name: string;
  damageMultiplier: number;
  postureRatio: number;
}

export interface EnemyHeavyAbilitySpec extends EnemyAbilitySpec {
  onceBonusAttack?: number;
  telegraphTurns?: number;
  maxActivations?: number;
}

export interface EnemyDotSpec {
  chance: number;
  damage: number;
  duration: number;
  postureRatio: number;
}

export type EnemyAiPlan =
  | { type: 'simple-auto' }
  | { type: 'elite-one-strong-hit'; strongHitMultiplier: number }
  | {
      type: 'boss-cycle-4';
      cycle: EnemyAiCycleAction[];
      slamMultiplier: number;
      chargeMultiplier?: number;
    };

export type EnemyAiCycleAction = 'charge' | 'slam' | 'auto';

export interface EnemyDef {
  id: string;
  name: string;
  kind: EnemyKind;
  base: EnemyBaseStats;
  combat: EnemyCombatProfile;
  abilities: {
    auto: EnemyAbilitySpec;
    heavy?: EnemyHeavyAbilitySpec;
  };
  dot?: EnemyDotSpec;
  aiPlan: EnemyAiPlan;
  tags?: string[];
}
