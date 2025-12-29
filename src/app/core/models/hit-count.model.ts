export type HitActionKind =
  | "auto"
  | "skill"
  | "enemyAttack"
  | "enemySkill"
  | "dot"
  | "break"
  | "unknown";

export type HitContext = {
  sourceId: string;
  actionKind: HitActionKind;
  declaredHitCount?: number;
};
