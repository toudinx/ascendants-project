export type CombatBreakState = "normal" | "broken" | "superbroken";
export type EnemyCombatState = CombatBreakState | "preparing" | "dead";

export interface PostureOverkillTracker {
  apply: (postureDamage: number) => number;
  getOverkill: () => number;
}

export interface DotTickResult {
  nextHp: number;
  nextPosture: number;
  hpApplied: number;
  postureLoss: number;
}

export interface EnemyDotTickResult extends DotTickResult {
  nextState: EnemyCombatState;
}

export interface DotTickPlayerInput {
  hpDamage: number;
  postureDamage: number;
  hp: number;
  posture: number;
  status?: CombatBreakState;
  damageReductionPercent?: number;
}

export interface DotTickEnemyInput {
  hpDamage: number;
  postureDamage: number;
  hp: number;
  posture: number;
  state: EnemyCombatState;
}
