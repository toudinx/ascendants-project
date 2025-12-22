import { resolveBattleSpriteId } from '../battle-sprites';

export interface BattleSpriteValidationResult {
  errors: string[];
  warnings: string[];
}

const VELVET_SKIN_EXPECTATIONS = [
  { skinId: 'velvet-default', expected: 'velvet_battle_default' },
  { skinId: 'velvet-crimson', expected: 'velvet_battle_crimson' },
  { skinId: 'velvet-ascendant', expected: 'velvet_battle_eternal' }
];

export function validateBattleSpriteMapping(): BattleSpriteValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  VELVET_SKIN_EXPECTATIONS.forEach(({ skinId, expected }) => {
    const resolved = resolveBattleSpriteId('velvet', skinId);
    if (resolved !== expected) {
      errors.push(`Velvet skin "${skinId}" resolves to "${resolved}" (expected "${expected}").`);
    }
  });

  const lumenFallback = resolveBattleSpriteId('lumen', 'lumen-spectrum');
  if (!lumenFallback) {
    errors.push('Skin without battleSpriteId should fallback to a Kaelis default sprite id.');
  }

  return { errors, warnings };
}
