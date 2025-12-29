export type EnemyState = 'normal' | 'preparing' | 'broken' | 'superbroken' | 'dead';

export interface EnemyAttributes {
  id?: string;
  name: string;
  maxHp: number;
  hp: number;
  maxPosture: number;
  posture: number;
  attack: number;
  defense: number;
  critChance: number;
  critDamage: number;
  multiHitChance: number;
  baseHitCount?: number;
  dotChance: number;
  strongAttackReady: boolean;
}

export interface Enemy {
  attributes: EnemyAttributes;
  state: EnemyState;
  preparingSince?: number;
  breakTurns?: number;
  phase?: 'normal' | 'mini-boss' | 'boss';
}
