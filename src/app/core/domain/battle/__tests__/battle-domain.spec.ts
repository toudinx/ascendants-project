import { POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION } from '../../../../content/balance/balance.config';
import { applyMultiHitHpScalar, applyMultiHitPostureScalar } from '../damage';
import { applyDotTickToPlayer, resolveDotStacks } from '../dots';
import { createPostureOverkillTracker } from '../posture';

describe('battle domain helpers', () => {
  it('applies multi-hit scalars for HP and posture damage', () => {
    expect(applyMultiHitHpScalar(100, 0)).toBe(100);
    expect(applyMultiHitHpScalar(100, 1)).toBe(40);
    expect(applyMultiHitHpScalar(100, 3)).toBe(20);
    expect(applyMultiHitHpScalar(100, 10)).toBe(15);

    expect(applyMultiHitPostureScalar(100, 0)).toBe(100);
    expect(applyMultiHitPostureScalar(100, 2)).toBe(75);
    expect(applyMultiHitPostureScalar(100, 3)).toBe(60);
  });

  it('caps posture overkill per action', () => {
    const tracker = createPostureOverkillTracker(
      20,
      20,
      POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION
    );
    expect(tracker.apply(30)).toBe(27);
    expect(tracker.getOverkill()).toBe(7);
    expect(tracker.apply(5)).toBe(0);
  });

  it('sums DoT stacks into one tick and expires durations', () => {
    const stacks = [
      {
        id: 'dot-1',
        element: 'burn',
        sourceId: 'player',
        damagePerTick: 10,
        remainingTurns: 1,
        appliedTurn: 1
      },
      {
        id: 'dot-2',
        element: 'burn',
        sourceId: 'player',
        damagePerTick: 10,
        remainingTurns: 2,
        appliedTurn: 1
      },
      {
        id: 'dot-3',
        element: 'burn',
        sourceId: 'player',
        damagePerTick: 10,
        remainingTurns: 3,
        appliedTurn: 1
      }
    ];

    const resolution = resolveDotStacks(stacks);
    expect(resolution.stackCount).toBe(3);
    expect(resolution.totalHpDamage).toBe(30);
    expect(resolution.totalPostureDamage).toBe(0);
    expect(resolution.nextStacks.map(stack => stack.remainingTurns)).toEqual([1, 2]);

    const outcome = applyDotTickToPlayer({
      hpDamage: resolution.totalHpDamage,
      postureDamage: 0,
      hp: 100,
      posture: 30,
      status: 'normal',
      damageReductionPercent: 0
    });

    expect(outcome.hpApplied).toBe(30);
    expect(outcome.nextHp).toBe(70);
    expect(outcome.nextPosture).toBe(30);
  });
});
