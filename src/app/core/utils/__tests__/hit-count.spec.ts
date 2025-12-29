import { DEV_COMBAT } from '../../config/dev-combat.config';
import { PlayerAttributes, PlayerState } from '../../models/player.model';
import { KaelisKitConfig } from '../../models/kaelis.model';
import { resolveActorHitCount } from '../hit-count';

describe('resolveActorHitCount resonance gating', () => {
  const originalBonusFromSets = DEV_COMBAT.hitCountBonusFromSets;
  const originalBonusFromResonance = DEV_COMBAT.hitCountBonusFromResonance;

  beforeEach(() => {
    DEV_COMBAT.hitCountBonusFromSets = 0;
    DEV_COMBAT.hitCountBonusFromResonance = 0;
  });

  afterEach(() => {
    DEV_COMBAT.hitCountBonusFromSets = originalBonusFromSets;
    DEV_COMBAT.hitCountBonusFromResonance = originalBonusFromResonance;
  });

  it('does not apply Sentinel bonus while resonance is inactive', () => {
    const player = buildPlayerState();
    const hitCount = resolveActorHitCount(player, {
      resonanceActive: false,
      originPathId: 'Sentinel',
      runPathId: null
    });
    expect(hitCount).toBe(1);
  });

  it('applies Sentinel bonus when resonance is active', () => {
    const player = buildPlayerState();
    const hitCount = resolveActorHitCount(player, {
      resonanceActive: true,
      originPathId: 'Sentinel',
      runPathId: null
    });
    expect(hitCount).toBe(3);
  });
});

function buildPlayerState(): PlayerState {
  const attributes: PlayerAttributes = {
    maxHp: 1000,
    hp: 1000,
    maxPosture: 100,
    posture: 100,
    maxEnergy: 100,
    energy: 50,
    attack: 100,
    defense: 0,
    critChance: 0,
    critDamage: 1.5,
    multiHitChance: 0,
    dotChance: 0,
    penetration: 0,
    energyRegenPercent: 100,
    damageBonusPercent: 0,
    damageReductionPercent: 0,
    healBonusPercent: 0,
    postureDamageBonusPercent: 0
  };

  const kit: KaelisKitConfig = {
    autoMultiplier: 1,
    skillMultiplier: 1,
    skillCooldownTurns: 0,
    skillEnergyCost: 0
  };

  return {
    attributes,
    buffs: [],
    status: 'normal',
    breakTurns: 0,
    skillCooldown: 0,
    kaelisRoute: 'Sentinel',
    kaelisId: 'player',
    kaelisName: 'Tester',
    kaelisSprite: 'test',
    kit,
    weaponId: 'test-weapon',
    ringDamageBuffPercent: 0,
    ringDamageBuffTurns: 0,
    ringDamageBuffSource: undefined,
    ringSetCounts: undefined,
    ringSkillBuffs: undefined
  };
}
