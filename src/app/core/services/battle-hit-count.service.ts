import { Injectable, inject } from "@angular/core";
import { PlayerStateService } from "./player-state.service";
import { EnemyStateService } from "./enemy-state.service";
import { HitContext } from "../models/hit-count.model";
import { Enemy } from "../models/enemy.model";
import { PlayerState } from "../models/player.model";
import { resolveActorHitCount } from "../utils/hit-count";

@Injectable({ providedIn: "root" })
export class BattleHitCountService {
  private readonly player = inject(PlayerStateService);
  private readonly enemy = inject(EnemyStateService);

  resolveHitCount(ctx: HitContext, context?: Parameters<typeof resolveActorHitCount>[1]): number {
    if (Number.isFinite(ctx.declaredHitCount)) {
      return this.normalizeCount(ctx.declaredHitCount);
    }
    const actor = this.resolveActorState(ctx.sourceId);
    if (!actor) return 1;
    return resolveActorHitCount(actor, context);
  }

  resolveActorHitCount(actorState: PlayerState | Enemy, context?: Parameters<typeof resolveActorHitCount>[1]): number {
    return resolveActorHitCount(actorState, context);
  }

  private resolveActorState(sourceId: string): PlayerState | Enemy | null {
    const playerState = this.player.state();
    if (sourceId === "player" || sourceId === playerState.kaelisId) {
      return playerState;
    }

    const enemy = this.enemy.enemy();
    const enemyId =
      enemy.attributes.id ?? enemy.attributes.name ?? "enemy";
    if (sourceId === "enemy" || sourceId === enemyId) {
      return enemy;
    }

    return null;
  }

  private normalizeCount(value?: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(6, Math.max(1, Math.floor(value as number)));
  }
}
