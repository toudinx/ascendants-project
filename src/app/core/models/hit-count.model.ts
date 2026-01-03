export type HitActionKind =
  | "auto"
  | "skill"
  | "enemyAttack"
  | "enemySkill"
  | "dot"
  | "break"
  | "unknown";

export interface HitContext {
  sourceId: string;
  actionKind: HitActionKind;
  declaredHitCount?: number;
}
