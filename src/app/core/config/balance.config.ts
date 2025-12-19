export type BalanceStage = "early" | "mid" | "late";
export type EnemyEncounterKind = "normal" | "elite" | "boss";

export interface EnemyStageStats {
  hp: number;
  attack: number;
  posture: number;
}

export const ENEMY_STAT_TABLE: Record<
  BalanceStage,
  Record<EnemyEncounterKind, EnemyStageStats>
> = {
  early: {
    normal: { hp: 12000, attack: 300, posture: 220 },
    elite: { hp: 21000, attack: 350, posture: 260 },
    boss: { hp: 33000, attack: 400, posture: 320 },
  },
  mid: {
    normal: { hp: 24000, attack: 500, posture: 320 },
    elite: { hp: 52000, attack: 550, posture: 400 },
    boss: { hp: 72000, attack: 600, posture: 520 },
  },
  late: {
    normal: { hp: 36000, attack: 700, posture: 420 },
    elite: { hp: 66000, attack: 700, posture: 580 },
    boss: { hp: 108000, attack: 750, posture: 650 },
  },
};

export const PLAYER_POWER_CURVE_BY_ROOM: number[] = [
  1, 0.55, 0.6, 0.65, 0.7, 0.8, 0.9, 1,
];

export function roomToStage(room: number): BalanceStage {
  if (room >= 7) return "late";
  if (room >= 3) return "mid";
  return "early";
}

export function getPlayerPowerMultiplier(room: number): number {
  return PLAYER_POWER_CURVE_BY_ROOM[room] ?? 1;
}
