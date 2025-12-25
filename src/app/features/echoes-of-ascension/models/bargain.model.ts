export type BargainTier = 'minor' | 'major' | 'mythic';

export interface BargainDefinition {
  id: string;
  name: string;
  description: string;
  tier: BargainTier;
  cost: number;
  effectText: string;
}
