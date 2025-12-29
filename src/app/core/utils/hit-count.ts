import { Enemy } from "../models/enemy.model";
import { PlayerState } from "../models/player.model";
import { DEV_COMBAT } from "../config/dev-combat.config";
import {
  ResonancePathStateLike,
  ResonanceStateLike,
  resolveSentinelHitCountBonus
} from "./resonance.utils";

const HIT_COUNT_CAP = 6;

type HitCountActorState = PlayerState | Enemy;

export type HitCountContext = ResonanceStateLike &
  ResonancePathStateLike & {
    hitCountBonusFromSets?: number;
  };

export function getBonusHitCountFromSets(
  actorState: PlayerState,
  context?: HitCountContext
): number {
  void actorState;
  const override = context?.hitCountBonusFromSets;
  const bonus = typeof override === "number" ? override : DEV_COMBAT.hitCountBonusFromSets;
  if (!Number.isFinite(bonus)) return 0;
  return bonus;
}

export function getBonusHitCountFromResonance(
  context?: HitCountContext
): number {
  if (context) {
    return resolveSentinelHitCountBonus(context);
  }
  const bonus = DEV_COMBAT.hitCountBonusFromResonance;
  return Number.isFinite(bonus) ? bonus : 0;
}

export function resolveActorHitCount(
  actorState: HitCountActorState,
  context?: HitCountContext
): number {
  if (isPlayerState(actorState)) {
    const bonus =
      getBonusHitCountFromSets(actorState, context) +
      getBonusHitCountFromResonance(context);
    return clampHitCount(1 + bonus);
  }
  return clampHitCount(actorState.attributes.baseHitCount ?? 1);
}

function clampHitCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(HIT_COUNT_CAP, Math.max(1, Math.floor(value)));
}

function isPlayerState(
  actorState: HitCountActorState
): actorState is PlayerState {
  return "kaelisId" in actorState;
}
