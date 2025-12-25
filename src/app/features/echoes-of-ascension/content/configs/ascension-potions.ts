import { AscensionPotionDefinition } from '../../models/ascension-potion.model';

export const ASCENSION_POTIONS: AscensionPotionDefinition[] = [
  {
    id: 'vital-draught',
    name: 'Vital Draught',
    description: 'Begin the run with reinforced vitality.',
    effectText: '+20% max HP for the entire run.',
    runEffects: {
      maxHpPercent: 20
    }
  },
  {
    id: 'echo-clarity',
    name: 'Echo Clarity',
    description: 'Gain clarity to stabilize fragments early.',
    effectText: '+2 echo fragments after every victory.',
    runEffects: {
      fragmentsPerVictory: 2
    }
  },
  {
    id: 'fervor-serum',
    name: 'Fervor Serum',
    description: 'Prime your resonance to spike the opener.',
    effectText: '+15% damage for the entire run.',
    runEffects: {
      damagePercent: 15
    }
  }
];

export const ASCENSION_POTION_CATALOG = ASCENSION_POTIONS.reduce<
  Record<string, AscensionPotionDefinition>
>((acc, potion) => {
  acc[potion.id] = potion;
  return acc;
}, {});

export function getAscensionPotionById(
  id: string | null | undefined
): AscensionPotionDefinition | undefined {
  if (!id) return undefined;
  return ASCENSION_POTION_CATALOG[id];
}
