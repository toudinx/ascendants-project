export type BuffType = 'buff' | 'debuff';

export interface PlayerBuff {
  id: string;
  name: string;
  type: BuffType;
  icon?: string;
  duration?: number;
}

export interface PlayerAttributes {
  maxHp: number;
  hp: number;
  maxPosture: number;
  posture: number;
  maxEnergy: number;
  energy: number;
  attack: number;
  defense: number;
  critChance: number;
  critDamage: number;
  multiHitChance: number;
  dotChance: number;
  penetration: number;
}

export interface PlayerState {
  attributes: PlayerAttributes;
  buffs: PlayerBuff[];
  status?: 'normal' | 'broken' | 'superbroken';
  breakTurns?: number;
  skillCooldown?: number;
}
