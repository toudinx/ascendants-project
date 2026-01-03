export type SigilSlot = 'slot1' | 'slot2' | 'slot3' | 'slot4' | 'slot5';

export const SIGIL_SLOTS: SigilSlot[] = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5'];

export type SigilStatType =
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

export interface SigilStat {
  type: SigilStatType;
  value: number;
}

export type SigilSetKey = 'agressao';

export interface SigilDefinition {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  level: number;
  slot: SigilSlot;
  setKey: SigilSetKey;
  mainStat: SigilStat;
  subStats: SigilStat[];
}

export type SigilId = SigilDefinition['id'];

export interface SigilSkillBuffEffect {
  trigger: 'skill';
  damagePercent: number;
  durationTurns: number;
}

export interface SigilSetDefinition {
  key: SigilSetKey;
  name: string;
  threePieceBonus?: {
    type: 'damage_percent';
    value: number;
  };
  fivePieceSkillBuff?: SigilSkillBuffEffect;
}
