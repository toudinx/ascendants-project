import { Injectable, signal } from "@angular/core";

export type ActorSide = "player" | "enemy";
export type ActorPose =
  | "idle"
  | "attack"
  | "cast"
  | "buff"
  | "defend"
  | "victory"
  | "down";

interface ActorUiState {
  pose: ActorPose;
  hitToken: number;
  critToken: number;
  dotToken: number;
}

@Injectable({ providedIn: "root" })
export class BattleUiEventBus {
  private readonly poseTimers: Record<ActorSide, ReturnType<typeof setTimeout> | null> =
    {
      player: null,
      enemy: null
    };

  readonly actorState = signal<Record<ActorSide, ActorUiState>>({
    player: { pose: "idle", hitToken: 0, critToken: 0, dotToken: 0 },
    enemy: { pose: "idle", hitToken: 0, critToken: 0, dotToken: 0 }
  });

  setPose(side: ActorSide, pose: ActorPose, durationMs = 260): void {
    this.actorState.update(current => ({
      ...current,
      [side]: { ...current[side], pose }
    }));

    if (this.poseTimers[side]) clearTimeout(this.poseTimers[side]!);
    this.poseTimers[side] = null;
    if (pose === "idle") return;
    this.poseTimers[side] = setTimeout(() => {
      this.actorState.update(current => ({
        ...current,
        [side]: { ...current[side], pose: "idle" }
      }));
      this.poseTimers[side] = null;
    }, durationMs);
  }

  triggerHit(side: ActorSide, crit = false): void {
    this.actorState.update(current => {
      const next = { ...current[side] };
      if (crit) {
        next.critToken = next.critToken + 1;
      } else {
        next.hitToken = next.hitToken + 1;
      }
      return { ...current, [side]: next };
    });
  }

  triggerDotPulse(side: ActorSide): void {
    this.actorState.update(current => ({
      ...current,
      [side]: { ...current[side], dotToken: current[side].dotToken + 1 }
    }));
  }

  reset(): void {
    (Object.keys(this.poseTimers) as ActorSide[]).forEach(side => {
      if (this.poseTimers[side]) clearTimeout(this.poseTimers[side]!);
      this.poseTimers[side] = null;
    });
    this.actorState.set({
      player: { pose: "idle", hitToken: 0, critToken: 0, dotToken: 0 },
      enemy: { pose: "idle", hitToken: 0, critToken: 0, dotToken: 0 }
    });
  }
}
