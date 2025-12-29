import { Injectable, OnDestroy, computed, effect, inject, signal } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { PlayerStateService } from "../../../core/services/player-state.service";

export interface BattleVfxIntensityContext {
  floorProgress?: number | null;
  echoFactor?: number | null;
  resonanceActive?: boolean | null;
  dotCount?: number | null;
}

@Injectable()
export class BattleVfxIntensityService implements OnDestroy {
  private readonly floorProgress = signal<number | null>(null);
  private readonly echoFactor = signal<number | null>(null);
  private readonly resonanceActive = signal<boolean | null>(null);
  private readonly dotCount = signal<number | null>(null);

  private readonly player = inject(PlayerStateService, { optional: true });
  private readonly intensitySubject = new BehaviorSubject<number>(0);
  readonly intensity$: Observable<number> = this.intensitySubject.asObservable();

  private readonly intensitySignal = computed(() => this.computeIntensity());
  private readonly intensityWatcher = effect(() => {
    this.intensitySubject.next(this.intensitySignal());
  });

  setContext(context: BattleVfxIntensityContext): void {
    if (context.floorProgress !== undefined) {
      this.floorProgress.set(this.sanitize(context.floorProgress));
    }
    if (context.echoFactor !== undefined) {
      this.echoFactor.set(this.sanitize(context.echoFactor));
    }
    if (context.resonanceActive !== undefined) {
      this.resonanceActive.set(context.resonanceActive ?? null);
    }
    if (context.dotCount !== undefined) {
      this.dotCount.set(this.sanitizeCount(context.dotCount));
    }
  }

  getIntensitySnapshot(): number {
    return this.intensitySubject.value;
  }

  ngOnDestroy(): void {
    this.intensityWatcher.destroy();
    this.intensitySubject.complete();
  }

  private computeIntensity(): number {
    const floor = this.sanitize(this.floorProgress());
    const echo = this.sanitize(this.echoFactor());
    const resonance = this.resonanceActive();
    const dotCount = this.sanitizeCount(this.dotCount());
    const buffCount = this.player?.state().buffs?.length ?? null;
    const energyRatio = this.playerEnergyRatio();

    const statusFactor = this.statusFactor(buffCount, dotCount);
    const inputs: Array<{ value: number; weight: number }> = [];

    if (floor !== null) inputs.push({ value: floor, weight: 0.25 });
    if (echo !== null) inputs.push({ value: echo, weight: 0.25 });
    if (statusFactor !== null) inputs.push({ value: statusFactor, weight: 0.2 });
    if (resonance !== null) {
      inputs.push({ value: resonance ? 1 : 0, weight: 0.2 });
    }
    if (energyRatio !== null) inputs.push({ value: energyRatio, weight: 0.1 });

    const totalWeight = inputs.reduce((sum, input) => sum + input.weight, 0);
    if (!totalWeight) return 0;
    const total = inputs.reduce((sum, input) => sum + input.value * input.weight, 0);
    return this.clamp01(total / totalWeight);
  }

  private playerEnergyRatio(): number | null {
    const attrs = this.player?.state().attributes;
    if (!attrs || !attrs.maxEnergy) return null;
    return this.clamp01(attrs.energy / attrs.maxEnergy);
  }

  private statusFactor(
    buffCount: number | null,
    dotCount: number | null
  ): number | null {
    const buffFactor =
      typeof buffCount === "number" ? this.clamp01(buffCount / 4) : null;
    const dotFactor =
      typeof dotCount === "number" ? this.clamp01(dotCount / 3) : null;

    if (buffFactor === null && dotFactor === null) return null;
    if (buffFactor !== null && dotFactor !== null) {
      return this.clamp01(buffFactor * 0.6 + dotFactor * 0.4);
    }
    return buffFactor ?? dotFactor;
  }

  private sanitize(value: number | null | undefined): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return this.clamp01(value);
  }

  private sanitizeCount(value: number | null | undefined): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (value < 0) return 0;
    return value;
  }

  private clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }
}
