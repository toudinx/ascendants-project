export type StageKey = "early" | "mid" | "late";
export type EnemyStageKind = "normal" | "elite" | "boss";

export interface StageEnemySnapshot {
  hp: number;
  attack: number;
  posture: number;
}

export type StageDefinition = Record<EnemyStageKind, StageEnemySnapshot>;

export const STAGE_TABLE: Record<StageKey, StageDefinition> = {
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

export function getStageForRoom(room: number): StageKey {
  if (room >= 7) return "late";
  if (room >= 3) return "mid";
  return "early";
}

export function getStageSnapshot(
  stage: StageKey,
  kind: EnemyStageKind
): StageEnemySnapshot {
  return STAGE_TABLE[stage][kind];
}
