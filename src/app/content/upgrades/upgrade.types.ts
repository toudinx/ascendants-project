export type UpgradeTrack = 'A' | 'B' | 'C';
export type UpgradeRarity = 'common' | 'rare' | 'epic';

export type UpgradeDuration =
  | { type: 'run' }
  | { type: 'nextBattle' }
  | { type: 'nTurns'; turns: number; ownerTurns: boolean };

export interface UpgradeEffectLine {
  icon?: string;
  text: string;
}

export interface UpgradeModifiers {
  addCritRate?: number;
  addCritDmg?: number;
  addDmgPct?: number;
  addDrPct?: number;
  addAtkFlat?: number;
  addHpFlat?: number;
  startNextBattleEnergy?: number;
  startNextBattlePosture?: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  track: UpgradeTrack;
  rarity: UpgradeRarity;
  duration: UpgradeDuration;
  effects: UpgradeEffectLine[];
  modifiers: UpgradeModifiers;
  gating?: {
    minTrackLevel?: number;
    requiresOtherTrackAtLeast?: number;
  };
  tags?: string[];
}
