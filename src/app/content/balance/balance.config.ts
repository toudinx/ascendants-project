export type RoundingMode = 'floor';
export type BalanceStage = 'early' | 'mid' | 'late';
export type EnemyEncounterKind = 'normal' | 'elite' | 'boss';

export interface EnemyStageStats {
  hp: number;
  attack: number;
  posture: number;
}

export interface PlayerDefaultStats {
  critRate: number;
  critDamage: number;
  damagePercent: number;
  damageReductionPercent: number;
  healPercent: number;
  energyRegenPercent: number;
}

export interface DotTuning {
  damage: number;
  duration: number;
  postureRatio: number;
}

export interface CombatTuning {
  autoPostureRatio: number;
  multiPostureRatio?: number;
  skillPostureRatio?: number;
  baseEnergyRegen?: number;
  postureRegen: number;
  dot: DotTuning;
}

export interface RunTuning {
  totalRooms: number;
  potionCap: number;
  potionDropChance: number;
}

export interface BalanceConfig {
  rounding: RoundingMode;
  damageReductionCap: number;
  playerDefaults: PlayerDefaultStats;
  playerCombat: CombatTuning;
  enemyCombat: CombatTuning;
  run: RunTuning;
  referenceKaelis: KaelisReferenceStats;
}

export interface KaelisReferenceStats {
  hp: number;
  attack: number;
  baseDamageScore: number;
  baseSurvivabilityScore: number;
}

export const BALANCE_CONFIG: BalanceConfig = {
  rounding: 'floor',
  damageReductionCap: 0.9,
  playerDefaults: {
    critRate: 0.05,
    critDamage: 1.5,
    damagePercent: 0,
    damageReductionPercent: 0,
    healPercent: 0,
    energyRegenPercent: 100
  },
  playerCombat: {
    autoPostureRatio: 0.26,
    multiPostureRatio: 0.08,
    skillPostureRatio: 0.32,
    baseEnergyRegen: 12,
    postureRegen: 8,
    dot: {
      damage: 8,
      duration: 2,
      postureRatio: 0.05
    }
  },
  enemyCombat: {
    autoPostureRatio: 0.22,
    multiPostureRatio: 0.38,
    postureRegen: 8,
    dot: {
      damage: 6,
      duration: 2,
      postureRatio: 0.05
    }
  },
  run: {
    totalRooms: 7,
    potionCap: 2,
    potionDropChance: 0.1
  },
  referenceKaelis: {
    hp: 10800,
    attack: 960,
    baseDamageScore: 5,
    baseSurvivabilityScore: 10800
  }
};

export const ENEMY_STAT_TABLE: Record<
  BalanceStage,
  Record<EnemyEncounterKind, EnemyStageStats>
> = {
  early: {
    normal: { hp: 12000, attack: 300, posture: 220 },
    elite: { hp: 21000, attack: 350, posture: 260 },
    boss: { hp: 33000, attack: 400, posture: 320 }
  },
  mid: {
    normal: { hp: 24000, attack: 500, posture: 320 },
    elite: { hp: 52000, attack: 550, posture: 400 },
    boss: { hp: 72000, attack: 600, posture: 520 }
  },
  late: {
    normal: { hp: 36000, attack: 700, posture: 420 },
    elite: { hp: 66000, attack: 700, posture: 580 },
    boss: { hp: 108000, attack: 750, posture: 650 }
  }
};

export const PLAYER_POWER_CURVE_BY_ROOM: number[] = [
  1, 0.55, 0.6, 0.65, 0.7, 0.8, 0.9, 1
];

export const MULTI_HIT_HP_SCALARS = [1.0, 0.4, 0.3, 0.2, 0.15];
export const MULTI_HIT_HP_SCALAR_MIN = 0.15;
export const MULTI_HIT_POSTURE_SCALARS = [1.0, 0.9, 0.75, 0.6, 0.5];
export const POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION = 0.35;

export function clampDamageReduction(value: number): number {
  return Math.min(BALANCE_CONFIG.damageReductionCap, Math.max(0, value));
}

export function roundStat(value: number): number {
  return Math.floor(value);
}

export function roomToStage(room: number): BalanceStage {
  if (room >= 7) return 'late';
  if (room >= 3) return 'mid';
  return 'early';
}

export function getPlayerPowerMultiplier(room: number): number {
  return PLAYER_POWER_CURVE_BY_ROOM[room] ?? 1;
}
