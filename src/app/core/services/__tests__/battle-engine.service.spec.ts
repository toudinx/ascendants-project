import { TestBed } from '@angular/core/testing';
import { BattleEngineService } from '../battle-engine.service';
import { EnemyStateService } from '../enemy-state.service';
import { PlayerStateService } from '../player-state.service';
import { UiStateService } from '../ui-state.service';
import { ProfileStateService } from '../profile-state.service';
import { StorageService } from '../storage.service';
import { DEV_COMBAT } from '../../config/dev-combat.config';
import {
  clampDamageReduction,
  MULTI_HIT_HP_SCALARS,
  POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION
} from '../../../content/balance/balance.config';
import { createPrng } from '../../domain/rng/prng';
import { PlayerAttributes, PlayerState } from '../../models/player.model';
import { KaelisKitConfig } from '../../models/kaelis.model';
import { Enemy, EnemyAttributes } from '../../models/enemy.model';

describe('BattleEngineService multi-hit tuning', () => {
  let engine: BattleEngineService;
  let playerState: PlayerStateService;
  let enemyState: EnemyStateService;
  let engineHarness: EngineHarness;

  const originalHitCountBonusFromSets = DEV_COMBAT.hitCountBonusFromSets;
  const originalHitCountBonusFromResonance = DEV_COMBAT.hitCountBonusFromResonance;
  const originalDeterministic = DEV_COMBAT.deterministic;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BattleEngineService,
        EnemyStateService,
        PlayerStateService,
        UiStateService,
        ProfileStateService,
        StorageService
      ]
    });
    engine = TestBed.inject(BattleEngineService);
    playerState = TestBed.inject(PlayerStateService);
    enemyState = TestBed.inject(EnemyStateService);
    engineHarness = engine as unknown as EngineHarness;

    DEV_COMBAT.deterministic = true;
    DEV_COMBAT.hitCountBonusFromSets = 0;
    DEV_COMBAT.hitCountBonusFromResonance = 0;

    engine.setRunContext({
      getPhase: () => 'battle',
      getTrackLevels: () => ({ A: 0, B: 0, C: 0 }),
      getCurrentRoom: () => 0,
      finishBattle: () => undefined,
      tickTurnUpgrades: () => undefined
    });
  });

  afterEach(() => {
    DEV_COMBAT.hitCountBonusFromSets = originalHitCountBonusFromSets;
    DEV_COMBAT.hitCountBonusFromResonance = originalHitCountBonusFromResonance;
    DEV_COMBAT.deterministic = originalDeterministic;
  });

  it('applies diminishing HP scalars for multi-hit actions', () => {
    DEV_COMBAT.hitCountBonusFromResonance = 3;
    setupPlayer(
      {
        attack: 100,
        critChance: 0,
        critDamage: 1.5,
        dotChance: 0
      },
      { autoMultiplier: 1 }
    );
    setupEnemy({ defense: 0, maxHp: 10000, maxPosture: 100 });

    engine.startBattle({ seed: 1 });
    engineHarness.autoAttackPlayer();

    const events = engineHarness.turnEvents as TurnEvent[];
    const damageEvents = events.filter(
      evt =>
        evt.kind === 'damage' && evt.target === 'enemy' && evt.actionKind === 'auto'
    );
    const values = damageEvents.map(evt => evt.value);
    const expected = MULTI_HIT_HP_SCALARS.slice(0, 4).map(scalar =>
      Math.round(100 * scalar)
    );
    expect(values).toEqual(expected);
  });

  it('caps posture overkill contribution per action', () => {
    DEV_COMBAT.hitCountBonusFromResonance = 3;
    setupPlayer(
      {
        attack: 40,
        critChance: 0,
        critDamage: 1.5,
        dotChance: 0,
        postureDamageBonusPercent: 400
      },
      { autoMultiplier: 1 }
    );
    setupEnemy({ defense: 0, maxPosture: 20, maxHp: 10000 });

    const appliedPosture: number[] = [];
    const originalApplyHit = engineHarness.applyHitToEnemy.bind(engineHarness);
    spyOn(engineHarness, 'applyHitToEnemy').and.callFake(
      (damage: number, postureDamage: number, type: string, hitMeta: unknown) => {
        appliedPosture.push(postureDamage);
        return originalApplyHit(damage, postureDamage, type, hitMeta);
      }
    );

    engine.startBattle({ seed: 1 });
    engineHarness.autoAttackPlayer();

    const totalPosture = appliedPosture.reduce((sum, value) => sum + value, 0);
    const startPosture = 20;
    const cap = Math.round(
      startPosture * POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION
    );
    expect(totalPosture).toBe(startPosture + cap);
    expect(enemyState.enemy().attributes.posture).toBe(0);
  });

  it('uses a single crit roll per action (all hits crit together)', () => {
    DEV_COMBAT.hitCountBonusFromResonance = 3;
    setupPlayer(
      {
        attack: 80,
        critChance: 0.5,
        critDamage: 1.8,
        dotChance: 0
      },
      { autoMultiplier: 1 }
    );
    setupEnemy({ defense: 0, maxHp: 10000, maxPosture: 100 });

    const hitTypes: string[] = [];
    const originalApplyHit = engineHarness.applyHitToEnemy.bind(engineHarness);
    spyOn(engineHarness, 'applyHitToEnemy').and.callFake(
      (damage: number, postureDamage: number, type: string, hitMeta: unknown) => {
        hitTypes.push(type);
        return originalApplyHit(damage, postureDamage, type, hitMeta);
      }
    );

    engine.startBattle({ seed: 7 });
    engineHarness.autoAttackPlayer();

    expect(hitTypes.length).toBe(4);
    hitTypes.forEach(type => expect(type).toBe('crit'));
  });

  it('uses a single crit roll per action (all hits miss together)', () => {
    DEV_COMBAT.hitCountBonusFromResonance = 3;
    setupPlayer(
      {
        attack: 80,
        critChance: 0.5,
        critDamage: 1.8,
        dotChance: 0
      },
      { autoMultiplier: 1 }
    );
    setupEnemy({ defense: 0, maxHp: 10000, maxPosture: 100 });

    const hitTypes: string[] = [];
    const originalApplyHit = engineHarness.applyHitToEnemy.bind(engineHarness);
    spyOn(engineHarness, 'applyHitToEnemy').and.callFake(
      (damage: number, postureDamage: number, type: string, hitMeta: unknown) => {
        hitTypes.push(type);
        return originalApplyHit(damage, postureDamage, type, hitMeta);
      }
    );

    engine.startBattle({ seed: 12345 });
    engineHarness.autoAttackPlayer();

    expect(hitTypes.length).toBe(4);
    hitTypes.forEach(type => expect(type).toBe('dmg'));
  });

  it('replays a deterministic first damage event for a fixed seed', () => {
    const seed = 4242;
    setupPlayer(
      {
        attack: 100,
        critChance: 0.5,
        critDamage: 2,
        dotChance: 0,
        damageBonusPercent: 0
      },
      { autoMultiplier: 1 }
    );
    setupEnemy({ defense: 0, maxHp: 10000, maxPosture: 100 });

    const rng = createPrng(seed);
    const isCrit = rng() < 0.5;
    const expectedDamage = Math.max(1, Math.floor(100 * (isCrit ? 2 : 1)));

    engine.startBattle({ seed });
    engineHarness.autoAttackPlayer();

    const events = engineHarness.turnEvents as TurnEvent[];
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toEqual(
      jasmine.objectContaining({
        kind: 'damage',
        target: 'enemy',
        actionKind: 'auto',
        value: expectedDamage
      })
    );
  });

  it('applies damage reduction percent to incoming HP damage', () => {
    setupPlayer(
      {
        maxHp: 100,
        hp: 100,
        damageReductionPercent: 50
      },
      { autoMultiplier: 1 }
    );

    const before = playerState.state().attributes.hp;
    const taken = engineHarness.applyHitToPlayer(100, 0, 'dmg');
    const after = playerState.state().attributes.hp;

    expect(taken).toBe(50);
    expect(before - after).toBe(50);
  });

  it('caps damage reduction percent at the balance limit', () => {
    setupPlayer(
      {
        maxHp: 100,
        hp: 100,
        damageReductionPercent: 200
      },
      { autoMultiplier: 1 }
    );

    const before = playerState.state().attributes.hp;
    const expected = Math.max(1, Math.floor(100 * (1 - clampDamageReduction(2))));
    const taken = engineHarness.applyHitToPlayer(100, 0, 'dmg');
    const after = playerState.state().attributes.hp;

    expect(taken).toBe(expected);
    expect(before - after).toBe(expected);
  });

  function setupPlayer(
    attributeOverrides: Partial<PlayerAttributes> = {},
    kitOverrides: Partial<KaelisKitConfig> = {}
  ): void {
    const baseAttributes: PlayerAttributes = {
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
    const attributes: PlayerAttributes = {
      ...baseAttributes,
      ...attributeOverrides
    };
    if (attributeOverrides.maxHp !== undefined && attributeOverrides.hp === undefined) {
      attributes.hp = attributeOverrides.maxHp;
    }
    if (
      attributeOverrides.maxPosture !== undefined &&
      attributeOverrides.posture === undefined
    ) {
      attributes.posture = attributeOverrides.maxPosture;
    }
    if (
      attributeOverrides.maxEnergy !== undefined &&
      attributeOverrides.energy === undefined
    ) {
      attributes.energy = Math.min(
        attributeOverrides.maxEnergy,
        baseAttributes.energy
      );
    }

    const kit: KaelisKitConfig = {
      autoMultiplier: 1,
      skillMultiplier: 1,
      skillCooldownTurns: 0,
      skillEnergyCost: 0,
      ...kitOverrides
    };

    const state: PlayerState = {
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
      sigilDamageBuffPercent: 0,
      sigilDamageBuffTurns: 0,
      sigilDamageBuffSource: undefined,
      sigilSetCounts: undefined,
      sigilSkillBuffs: undefined
    };

    playerState.state.set(state);
  }

  function setupEnemy(attributeOverrides: Partial<EnemyAttributes> = {}): void {
    const baseAttributes: EnemyAttributes = {
      name: 'Dummy',
      maxHp: 10000,
      hp: 10000,
      maxPosture: 100,
      posture: 100,
      attack: 10,
      defense: 0,
      critChance: 0,
      critDamage: 1.5,
      multiHitChance: 0,
      baseHitCount: 1,
      dotChance: 0,
      strongAttackReady: false
    };
    const attributes: EnemyAttributes = {
      ...baseAttributes,
      ...attributeOverrides
    };
    if (attributeOverrides.maxHp !== undefined && attributeOverrides.hp === undefined) {
      attributes.hp = attributeOverrides.maxHp;
    }
    if (
      attributeOverrides.maxPosture !== undefined &&
      attributeOverrides.posture === undefined
    ) {
      attributes.posture = attributeOverrides.maxPosture;
    }

    const enemy: Enemy = {
      attributes,
      state: 'normal',
      breakTurns: 0
    };

    enemyState.spawnEncounter(enemy);
  }
});

interface TurnEvent {
  kind?: string;
  target?: string;
  actionKind?: string;
  value?: number;
}

interface EngineHarness {
  autoAttackPlayer: () => void;
  applyHitToPlayer: (damage: number, postureDamage: number, type: string, hitMeta?: unknown) => number;
  turnEvents: TurnEvent[];
  applyHitToEnemy: (damage: number, postureDamage: number, type: string, hitMeta: unknown) => number;
}

