export type RingSlot = 'slot1' | 'slot2' | 'slot3' | 'slot4' | 'slot5';

export const RING_SLOTS: RingSlot[] = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5'];

export type RingStatType =
  | 'hp_flat'
  | 'atk_flat'
  | 'hp_percent'
  | 'atk_percent'
  | 'crit_rate_percent'
  | 'crit_damage_percent'
  | 'damage_percent'
  | 'energy_regen_percent'
  | 'damage_reduction_percent'
  | 'heal_percent';

export interface RingStat {
  type: RingStatType;
  value: number;
}

export type RingSetKey = 'agressao';

export interface RingDefinition {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  level: number;
  slot: RingSlot;
  setKey: RingSetKey;
  mainStat: RingStat;
  subStats: RingStat[];
}

export type RingId = RingDefinition['id'];

export interface RingSkillBuffEffect {
  trigger: 'skill';
  damagePercent: number;
  durationTurns: number;
}

export interface RingSetDefinition {
  key: RingSetKey;
  name: string;
  threePieceBonus?: {
    type: 'damage_percent';
    value: number;
  };
  fivePieceSkillBuff?: RingSkillBuffEffect;
}
