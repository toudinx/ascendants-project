import { Injectable } from '@angular/core';
import { Enemy } from '../models/enemy.model';
import { RoomType } from '../models/run.model';
import { BalanceStage, ENEMY_STAT_TABLE, EnemyEncounterKind, roomToStage } from '../config/balance.config';
import { getEnemyByKind } from '../../content/enemies';
import { EnemyDef } from '../../content/enemies/enemies.types';
import { EnemyAiPlan } from '../../content/enemies/enemies.types';

export interface EnemyBehaviorProfile {
  auto: EnemyAttackBehavior;
  heavy?: EnemyHeavyBehavior;
  dot?: EnemyDotBehavior;
  cycle?: EnemyCycleBehavior;
}

export interface EnemyAttackBehavior {
  name?: string;
  multiplier: number;
  postureRatio: number;
}

export interface EnemyHeavyBehavior extends EnemyAttackBehavior {
  trigger: 'probability' | 'cycle';
  probability?: number;
  cycleTurns?: number;
  onceBonusAttack?: number;
  maxActivations?: number;
  telegraphTurns?: number;
}

export interface EnemyCycleBehavior {
  pattern: ('charge' | 'slam' | 'auto')[];
}

export interface EnemyDotBehavior {
  chance: number;
  damage: number;
  duration: number;
  postureRatio: number;
}

export interface EnemyEncounter {
  enemy: Enemy;
  behavior: EnemyBehaviorProfile;
}

@Injectable({ providedIn: 'root' })
export class EnemyFactoryService {
  createEncounter(room: number, roomType: RoomType): EnemyEncounter {
    const stage = roomToStage(room);
    const kind = this.mapKind(roomType);
    const def = getEnemyByKind(kind);
    const snapshot = ENEMY_STAT_TABLE[stage][kind];
    const hp = snapshot.hp;
    const attack = snapshot.attack;
    const posture = snapshot.posture;

    const enemy: Enemy = {
      attributes: {
        name: def.name,
        maxHp: hp,
        hp,
        maxPosture: posture,
        posture,
        attack,
        defense: def.combat.defense,
        critChance: def.combat.critChance,
        critDamage: def.combat.critDamage,
        multiHitChance: def.combat.multiHitChance,
        dotChance: def.dot?.chance ?? def.combat.dotChance,
        strongAttackReady: false
      },
      state: 'normal',
      breakTurns: 0,
      phase: roomType
    };

    const behavior = this.buildBehavior(def.aiPlan, def);
    this.applyLateStageOverrides(behavior, def, stage, kind);

    return { enemy, behavior };
  }

  private buildBehavior(plan: EnemyAiPlan, def: EnemyDef): EnemyBehaviorProfile {
    const base: EnemyBehaviorProfile = {
      auto: {
        name: def.abilities.auto.name,
        multiplier: def.abilities.auto.damageMultiplier,
        postureRatio: def.abilities.auto.postureRatio
      },
      dot: def.dot
        ? {
            chance: def.dot.chance,
            damage: def.dot.damage,
            duration: def.dot.duration,
            postureRatio: def.dot.postureRatio
          }
        : undefined
    };

    if (def.abilities.heavy) {
      base.heavy = {
        name: def.abilities.heavy.name,
        multiplier: def.abilities.heavy.damageMultiplier,
        postureRatio: def.abilities.heavy.postureRatio,
        trigger: 'probability',
        probability: 0.4,
        onceBonusAttack: def.abilities.heavy.onceBonusAttack,
        maxActivations: def.abilities.heavy.maxActivations,
        telegraphTurns: def.abilities.heavy.telegraphTurns
      };
    }

    if (plan.type === 'simple-auto') {
      return base;
    }

    if (plan.type === 'elite-one-strong-hit' && def.abilities.heavy) {
      base.heavy = {
        ...base.heavy!,
        trigger: 'probability',
        probability: 0.6,
        maxActivations: def.abilities.heavy.maxActivations ?? 1,
        onceBonusAttack: def.abilities.heavy.onceBonusAttack ?? plan.strongHitMultiplier * 100,
        multiplier: plan.strongHitMultiplier
      };
      return base;
    }

    if (plan.type === 'boss-cycle-4' && def.abilities.heavy) {
      base.heavy = {
        ...base.heavy!,
        trigger: 'cycle',
        cycleTurns: plan.cycle.length,
        multiplier: plan.slamMultiplier
      };
      base.cycle = {
        pattern: plan.cycle
      };
      return base;
    }

    return base;
  }

  private applyLateStageOverrides(
    behavior: EnemyBehaviorProfile,
    def: EnemyDef,
    stage: BalanceStage,
    kind: EnemyEncounterKind
  ): void {
    if (stage !== 'late') return;
    if (kind === 'elite' && def.abilities.heavy) {
      behavior.heavy = {
        name: behavior.heavy?.name ?? def.abilities.heavy.name,
        multiplier: behavior.heavy?.multiplier ?? def.abilities.heavy.damageMultiplier,
        postureRatio: behavior.heavy?.postureRatio ?? def.abilities.heavy.postureRatio,
        trigger: 'probability',
        probability: behavior.heavy?.probability ?? 0.6,
        onceBonusAttack: behavior.heavy?.onceBonusAttack ?? def.abilities.heavy.onceBonusAttack ?? 1400,
        maxActivations: 1,
        telegraphTurns: behavior.heavy?.telegraphTurns ?? def.abilities.heavy.telegraphTurns
      };
      return;
    }

    if (kind === 'boss' && def.abilities.heavy && !behavior.cycle) {
      behavior.heavy = {
        name: behavior.heavy?.name ?? def.abilities.heavy.name,
        multiplier: behavior.heavy?.multiplier ?? def.abilities.heavy.damageMultiplier,
        postureRatio: behavior.heavy?.postureRatio ?? def.abilities.heavy.postureRatio,
        trigger: 'cycle',
        cycleTurns: 4,
        onceBonusAttack: behavior.heavy?.onceBonusAttack ?? def.abilities.heavy.onceBonusAttack,
        maxActivations: behavior.heavy?.maxActivations,
        telegraphTurns: behavior.heavy?.telegraphTurns ?? def.abilities.heavy.telegraphTurns
      };
      behavior.cycle = { pattern: ['charge', 'slam', 'auto', 'auto'] };
    }
  }

  private mapKind(roomType: RoomType): EnemyEncounterKind {
    if (roomType === 'boss') return 'boss';
    if (roomType === 'mini-boss') return 'elite';
    return 'normal';
  }
}
