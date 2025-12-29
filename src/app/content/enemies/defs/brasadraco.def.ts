import { EnemyDef } from '../enemies.types';

export const BRASADRACO_DEF: EnemyDef = {
  id: 'brasadraco',
  name: 'Brasa Draco',
  kind: 'boss',
  base: {
    hp: 11000,
    attack: 400,
    posture: 320
  },
  combat: {
    defense: 520,
    critChance: 0.2,
    critDamage: 1.6,
    multiHitChance: 0.24,
    baseHitCount: 2,
    dotChance: 0.22
  },
  abilities: {
    auto: {
      name: 'Scorch Claw',
      damageMultiplier: 1.05,
      postureRatio: 0.26
    },
    heavy: {
      name: 'Draco Nova',
      damageMultiplier: 2.2,
      postureRatio: 0.48,
      telegraphTurns: 1
    }
  },
  dot: {
    chance: 0.28,
    damage: 12,
    duration: 2,
    postureRatio: 0.06
  },
  aiPlan: {
    type: 'boss-cycle-4',
    cycle: ['charge', 'slam', 'auto', 'auto'],
    slamMultiplier: 2.2,
    chargeMultiplier: 1.05
  },
  tags: ['boss', 'cycle']
};
