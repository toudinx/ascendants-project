import { SerializedDotStack } from "../../models/battle-snapshot.model";
import { computeDamageTaken } from "./damage";
import {
  DotTickEnemyInput,
  DotTickPlayerInput,
  DotTickResult,
  EnemyDotTickResult
} from "./types";

export interface DotStackResolution {
  stackCount: number;
  totalHpDamage: number;
  totalPostureDamage: number;
  nextStacks: SerializedDotStack[];
}

export function resolveDotStacks(
  stacks: SerializedDotStack[]
): DotStackResolution {
  if (!stacks.length) {
    return {
      stackCount: 0,
      totalHpDamage: 0,
      totalPostureDamage: 0,
      nextStacks: []
    };
  }
  let totalHpDamage = 0;
  let totalPostureDamage = 0;
  let stackCount = 0;
  const nextStacks: SerializedDotStack[] = [];

  stacks.forEach(stack => {
    const remainingRaw = Number.isFinite(stack.remainingTurns)
      ? stack.remainingTurns
      : 0;
    const remaining = Math.max(0, Math.floor(remainingRaw));
    if (remaining <= 0) return;
    stackCount += 1;
    const hpPerTick = Number.isFinite(stack.damagePerTick)
      ? stack.damagePerTick
      : 0;
    const posturePerTick = Number.isFinite(stack.postureDamagePerTick)
      ? (stack.postureDamagePerTick as number)
      : 0;
    totalHpDamage += hpPerTick;
    totalPostureDamage += posturePerTick;
    const nextTurns = remaining - 1;
    if (nextTurns > 0) {
      nextStacks.push({
        ...stack,
        remainingTurns: nextTurns
      });
    }
  });

  return {
    stackCount,
    totalHpDamage,
    totalPostureDamage,
    nextStacks
  };
}

export function applyDotTickToEnemy(input: DotTickEnemyInput): EnemyDotTickResult {
  const hp = Math.max(0, Math.floor(input.hpDamage));
  const posture = Math.max(0, Math.floor(input.postureDamage));
  if (hp <= 0 && posture <= 0) {
    return {
      nextHp: input.hp,
      nextPosture: input.posture,
      hpApplied: 0,
      postureLoss: 0,
      nextState: input.state
    };
  }
  if (input.state === "dead") {
    return {
      nextHp: input.hp,
      nextPosture: input.posture,
      hpApplied: 0,
      postureLoss: 0,
      nextState: input.state
    };
  }
  const nextHp = Math.max(0, input.hp - hp);
  let nextPosture = input.posture;
  if (input.state === "broken" || input.state === "superbroken") {
    nextPosture = 0;
  } else if (posture > 0) {
    nextPosture = Math.max(1, input.posture - posture);
  }
  const hpApplied = input.hp - nextHp;
  const postureLoss = Math.max(0, input.posture - nextPosture);
  return {
    nextHp,
    nextPosture,
    hpApplied,
    postureLoss,
    nextState: nextHp <= 0 ? "dead" : input.state
  };
}

export function applyDotTickToPlayer(input: DotTickPlayerInput): DotTickResult {
  const rawHp = Math.max(0, input.hpDamage);
  const posture = Math.max(0, Math.floor(input.postureDamage));
  const hp = computeDamageTaken(rawHp, input.damageReductionPercent);
  if (hp <= 0 && posture <= 0) {
    return {
      nextHp: input.hp,
      nextPosture: input.posture,
      hpApplied: 0,
      postureLoss: 0
    };
  }
  const nextHp = Math.max(0, input.hp - hp);
  let nextPosture = input.posture;
  if (input.status === "broken" || input.status === "superbroken") {
    nextPosture = 0;
  } else if (posture > 0) {
    nextPosture = Math.max(1, input.posture - posture);
  }
  const hpApplied = input.hp - nextHp;
  const postureLoss = Math.max(0, input.posture - nextPosture);
  return { nextHp, nextPosture, hpApplied, postureLoss };
}
