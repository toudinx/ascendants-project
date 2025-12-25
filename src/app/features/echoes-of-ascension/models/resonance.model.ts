export interface ResonanceEffectStat {
  key: string;
  label: string;
  baseValue: number;
  unit?: string;
}

export interface ResonanceUpgradeOption {
  id: string;
  name: string;
  description: string;
  hpCostPercent: number;
  statKey: string;
  delta: number;
}

export interface ResonanceDefinition {
  id: string;
  name: string;
  description: string;
  requiredEchoes: number;
  requiredEchoIds?: string[];
  effects: ResonanceEffectStat[];
  upgradeOptions: ResonanceUpgradeOption[];
}
