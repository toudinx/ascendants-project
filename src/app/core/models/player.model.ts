import { KaelisRouteType } from './kaelis-route.model';
import { KaelisKitConfig } from './kaelis.model';
import { WeaponId } from './weapon.model';
import { RingSetKey, RingSkillBuffEffect } from './ring.model';

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
  energyRegenPercent: number;
  damageBonusPercent?: number;
  damageReductionPercent?: number;
  healBonusPercent?: number;
  postureDamageBonusPercent?: number;
}

export interface PlayerState {
  attributes: PlayerAttributes;
  buffs: PlayerBuff[];
  status?: 'normal' | 'broken' | 'superbroken';
  breakTurns?: number;
  skillCooldown?: number;
  kaelisRoute: KaelisRouteType;
  kaelisId: string;
  kaelisName: string;
  kaelisSprite: string;
  kit: KaelisKitConfig;
  weaponId: WeaponId;
  ringSetCounts?: Record<RingSetKey, number>;
  ringSkillBuffs?: PlayerRingSkillBuff[];
  ringDamageBuffPercent?: number;
  ringDamageBuffTurns?: number;
  ringDamageBuffSource?: RingSetKey;
}

export interface PlayerRingSkillBuff extends RingSkillBuffEffect {
  setKey: RingSetKey;
}
