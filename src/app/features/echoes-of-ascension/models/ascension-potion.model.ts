export interface AscensionPotionRunEffects {
  maxHpPercent?: number;
  damagePercent?: number;
  fragmentsPerVictory?: number;
}

export interface AscensionPotionDefinition {
  id: string;
  name: string;
  description: string;
  effectText: string;
  runEffects?: AscensionPotionRunEffects;
}
