import { KaelisDef } from '../kaelis.types';

export const VELVET_DEF: KaelisDef = {
  id: 'velvet',
  name: 'Velvet Arclight',
  title: 'Echo Duelist',
  description: 'Sentinela prodigy who leans on relentless multihit tempo.',
  routeType: 'Sentinela',
  portrait: 'assets/battle/characters/velvet_battle_idle.png',
  sprite: 'assets/battle/characters/velvet_battle_idle.png',
  role: 'Adaptive skirmisher',
  tags: ['multi-hit', 'tempo'],
  base: {
    hp: 9800,
    atk: 920,
    posture: 260,
    energy: 110,
    defense: 320,
    critRate: 0.34,
    critDamage: 1.78,
    damagePercent: 18,
    damageReductionPercent: 6,
    healPercent: 6,
    multiHitChance: 0.34,
    dotChance: 0.2,
    penetration: 0.22,
    energyRegenPercent: 115
  },
  kit: {
    autoMultiplier: 0.82,
    skillMultiplier: 1.65,
    skillHits: 3,
    skillCooldownTurns: 3,
    skillEnergyCost: 40,
    multihitBonus: 0.1,
    tags: ['flurry']
  }
};
