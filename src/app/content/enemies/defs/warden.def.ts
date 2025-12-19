import { EnemyDef } from '../enemies.types';

export const SIEGE_WARDEN_DEF: EnemyDef = {
  id: 'siege-warden',
  name: 'Siege Warden',
  kind: 'elite',
  base: {
    hp: 7000,
    attack: 350,
    posture: 260
  },
  combat: {
    defense: 440,
    critChance: 0.18,
    critDamage: 1.55,
    multiHitChance: 0.22,
    dotChance: 0.18
  },
  abilities: {
    auto: {
      name: 'Hammerfall',
      damageMultiplier: 1,
      postureRatio: 0.24
    },
    heavy: {
      name: 'Fortress Crush',
      damageMultiplier: 1.75,
      postureRatio: 0.42,
      onceBonusAttack: 1400,
      telegraphTurns: 1,
      maxActivations: 1
    }
  },
  dot: {
    chance: 0.2,
    damage: 8,
    duration: 2,
    postureRatio: 0.05
  },
  aiPlan: {
    type: 'elite-one-strong-hit',
    strongHitMultiplier: 1.75
  },
  tags: ['elite', 'charge-once']
};
