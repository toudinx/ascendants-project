import { Injectable, OnDestroy, inject } from "@angular/core";
import { BattleFxBusService } from "./battle-fx-bus.service";
import { ActorSide, AfterglowFieldKey, Point } from "./battle-fx.types";
import {
  ActionKind,
  ActionVfxProfile,
  ActionVfxStep,
  ENABLE_VISUAL_COMBOS
} from "./action-vfx-profiles";
import { RngService } from "../../../core/services/rng.service";

export interface VfxSequenceRequest {
  attacker: ActorSide;
  target: ActorSide;
  origin: Point;
  impact: Point;
  amount: number;
  crit?: boolean;
  dot?: boolean;
  stacks?: number;
  hitIndex?: number;
  hitCount?: number;
  profile: ActionVfxProfile;
  fieldKey?: AfterglowFieldKey;
  reduceMotion?: boolean;
}

@Injectable()
export class VfxSequencerService implements OnDestroy {
  private readonly bus = inject(BattleFxBusService);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly vfxRng = inject(RngService).fork("vfx-sequencer");

  run(request: VfxSequenceRequest): void {
    const hitIndex = this.resolveHitIndex(request.hitIndex);
    const hitCount = this.resolveHitCount(request.hitCount);
    const baseSteps = request.profile.steps;
    const combo = request.profile.combo;
    const allowVisualCombo = ENABLE_VISUAL_COMBOS || !combo?.visualOnly;
    const hasActualHits = hitCount > 1;
    const comboHits =
      combo && !request.reduceMotion && allowVisualCombo && !hasActualHits
        ? Math.max(1, combo.hits)
        : 1;
    const comboAmounts =
      comboHits > 1 ? this.splitAmount(request.amount, comboHits) : null;
    const visualCombo =
      !!combo &&
      combo.visualOnly &&
      allowVisualCombo &&
      !request.reduceMotion &&
      combo.hits > 1;
    const emitTextMain = !visualCombo;
    const hitScale = this.resolveHitScale(
      request.profile.kind,
      hitIndex,
      hitCount
    );
    const angleOffset = this.resolveAngleOffset(
      hitIndex,
      hitCount,
      request.reduceMotion
    );
    const points = this.resolveHitPoints(
      request.origin,
      request.impact,
      hitIndex,
      hitCount,
      request.reduceMotion
    );
    const adjustedRequest: VfxSequenceRequest = {
      ...request,
      origin: points.origin,
      impact: points.impact
    };
    let offset = 0;
    let impactAt = 0;
    let slashAt: number | null = null;

    for (const step of baseSteps) {
      const skipStep = this.shouldSkipStep(step, request.profile.kind, hitIndex, hitCount);
      const stepMs = this.resolveStepMs(step, request.profile.kind, hitIndex, hitCount);
      const delay = this.stepDelay(stepMs, request.reduceMotion);
      if (step.t === "impactPackage") {
        const amount = comboAmounts ? comboAmounts[0] : request.amount;
        const tier = this.resolveImpactTier(
          step.tier,
          request.profile.kind,
          hitIndex,
          hitCount
        );
        const reaction = this.resolveImpactReaction(
          adjustedRequest,
          hitIndex,
          hitCount
        );
        this.schedule(offset, () =>
          this.emitImpactPackage(
            adjustedRequest,
            tier,
            emitTextMain,
            amount,
            reaction,
            false
          )
        );
        impactAt = offset;
      } else if (!skipStep) {
        this.schedule(offset, () =>
          this.runStep(
            step,
            adjustedRequest,
            {
              scale: hitScale,
              angleOffset
            },
            stepMs
          )
        );
      }
      if (step.t === "impactPackage") impactAt = offset;
      if (step.t === "slashArc" && !skipStep) slashAt = offset;
      if (!skipStep || step.t === "impactPackage") {
        offset += delay;
      }
    }

    if (comboHits > 1) {
      this.runCombo(adjustedRequest, impactAt, slashAt, comboAmounts);
      if (visualCombo && comboAmounts) {
        this.runComboText(adjustedRequest, impactAt, comboAmounts);
      }
    }
  }

  ngOnDestroy(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  private runStep(
    step: ActionVfxStep,
    request: VfxSequenceRequest,
    context: { scale: number; angleOffset: number },
    stepMs?: number
  ): void {
    switch (step.t) {
      case "attackerLunge":
      case "castCharge":
        this.bus.emit({
          kind: "attackStart",
          attacker: request.attacker,
          style: request.profile.style
        });
        return;
      case "projectile":
        this.bus.emit({
          kind: "projectile",
          attacker: request.attacker,
          from: request.origin,
          to: request.impact,
          projectileKey: step.key,
          projectileScale: this.scaleValue(step.scale, context.scale)
        });
        return;
      case "slashArc":
        this.bus.emit({
          kind: "slash",
          attacker: request.attacker,
          from: request.origin,
          to: request.impact,
          scale: this.scaleValue(step.scale, context.scale),
          crit: request.crit,
          angleOffset: context.angleOffset
        });
        return;
      case "impactPackage":
        this.emitImpactPackage(
          request,
          step.tier,
          true,
          request.amount,
          this.resolveImpactReaction(request, 0, 1)
        );
        return;
      case "afterglowField":
        this.bus.emit({
          kind: "field",
          target: request.target,
          at: request.impact,
          fieldKey: request.fieldKey ?? step.fieldKey,
          tier: 2,
          durationMs: stepMs ?? step.ms
        });
        return;
      default:
        return;
    }
  }

  private runCombo(
    request: VfxSequenceRequest,
    impactAt: number,
    slashAt: number | null,
    comboAmounts: number[] | null
  ): void {
    const combo = request.profile.combo;
    if (!combo) return;
    if (request.reduceMotion) return;

    const hits = Math.max(1, combo.hits);
    const spacing = Math.max(60, combo.spacingMs);
    const amounts = comboAmounts ?? this.splitAmount(request.amount, hits);
    const primaryTier = this.primaryTier(request.profile.steps);
    const subTier = this.clampTier(primaryTier - 1);

    const emitText = !combo.visualOnly;

    for (let hit = 1; hit < hits; hit += 1) {
      const delay = impactAt + spacing * hit;
      const slashDelay = (slashAt ?? impactAt) + spacing * hit;
      const scale = 0.82 + hit * 0.05;
      const angleOffset = this.randomInt(-18, 18);

      this.schedule(slashDelay, () => {
        this.bus.emit({
          kind: "slash",
          attacker: request.attacker,
          from: request.origin,
          to: request.impact,
          scale,
          crit: false,
          angleOffset
        });
      });

      this.schedule(delay, () => {
        this.emitImpactPackage(
          request,
          subTier,
          emitText,
          amounts[hit],
          "micro",
          true
        );
      });
    }
  }

  private emitImpactPackage(
    request: VfxSequenceRequest,
    tier: 1 | 2 | 3 | 4,
    emitText: boolean,
    amount: number,
    reaction: "full" | "micro" | "none" = "full",
    comboHit = false
  ): void {
    const dot = request.dot || request.profile.kind === "dotTick";
    const isMicro = reaction === "micro";
    const suppressReaction = reaction === "none";
    const crit = request.crit && reaction === "full";
    const impactCrit = request.crit && reaction === "full";
    const impactAmount = suppressReaction ? 0 : amount;

    if (emitText && amount > 0) {
      this.bus.emit({
        kind: "floatText",
        target: request.target,
        amount,
        crit: request.crit,
        dot,
        stacks: request.stacks,
        at: request.impact
      });
    }

    this.bus.emit({
      kind: "impact",
      target: request.target,
      amount: impactAmount,
      crit: impactCrit,
      dot,
      stacks: request.stacks,
      tier,
      combo: comboHit,
      style: request.profile.style
    });

    if (!dot && !suppressReaction) {
      this.bus.emit({
        kind: "hitReaction",
        target: request.target,
        crit,
        micro: isMicro
      });
      if (crit) {
        this.bus.emit({ kind: "shake", intensity: 3, durationMs: 220 });
      } else if (
        request.profile.kind === "skill" &&
        !request.reduceMotion &&
        !isMicro
      ) {
        this.bus.emit({ kind: "shake", intensity: 2, durationMs: 180 });
      }
    }
  }

  private runComboText(
    request: VfxSequenceRequest,
    impactAt: number,
    amounts: number[]
  ): void {
    const combo = request.profile.combo;
    if (!combo || combo.hits <= 1) return;
    if (request.reduceMotion) return;
    if (!combo.visualOnly) return;

    const hits = Math.max(1, combo.hits);
    const spacing = Math.min(110, Math.max(60, combo.spacingMs - 10));
    for (let hit = 0; hit < hits; hit += 1) {
      const amount = amounts[hit] ?? 0;
      if (amount <= 0) continue;
      const delay = impactAt + spacing * hit;
      this.schedule(delay, () => {
        this.bus.emit({
          kind: "floatText",
          target: request.target,
          amount,
          crit: request.crit,
          dot: request.dot,
          stacks: request.stacks,
          at: request.impact
        });
      });
    }
  }

  private primaryTier(steps: ActionVfxStep[]): 1 | 2 | 3 | 4 {
    const impact = steps.find(step => step.t === "impactPackage");
    if (impact && impact.tier) return impact.tier;
    return 1;
  }

  private clampTier(value: number): 1 | 2 | 3 | 4 {
    if (value <= 1) return 1;
    if (value === 2) return 2;
    if (value === 3) return 3;
    return 4;
  }

  private resolveHitIndex(index: number | undefined): number {
    if (!Number.isFinite(index)) return 0;
    return Math.max(0, Math.floor(index as number));
  }

  private resolveHitCount(count: number | undefined): number {
    if (!Number.isFinite(count)) return 1;
    return Math.max(1, Math.floor(count as number));
  }

  private shouldSkipStep(
    step: ActionVfxStep,
    kind: ActionKind,
    hitIndex: number,
    hitCount: number
  ): boolean {
    if (hitCount <= 1 || hitIndex <= 0) return false;
    if (step.t === "attackerLunge" || step.t === "castCharge") {
      return true;
    }
    if (step.t === "afterglowField") {
      return true;
    }
    if ((kind === "skill" || kind === "enemySkill") && step.t === "projectile") {
      return true;
    }
    return false;
  }

  private resolveStepMs(
    step: ActionVfxStep,
    kind: ActionKind,
    hitIndex: number,
    hitCount: number
  ): number {
    if (hitCount > 1 && hitIndex > 0 && step.t === "afterglowField") {
      return Math.max(120, Math.round(step.ms * 0.45));
    }
    if (kind === "skill" && hitCount > 1 && hitIndex > 0 && step.t === "impactPackage") {
      return Math.max(80, Math.round(step.ms * 0.8));
    }
    return step.ms;
  }

  private resolveImpactReaction(
    request: VfxSequenceRequest,
    hitIndex: number,
    hitCount: number
  ): "full" | "micro" | "none" {
    const dot = request.dot || request.profile.kind === "dotTick";
    if (dot) return "none";
    if (hitCount > 1 && hitIndex > 0) return "micro";
    return "full";
  }

  private resolveImpactTier(
    tier: 1 | 2 | 3 | 4,
    kind: ActionKind,
    hitIndex: number,
    hitCount: number
  ): 1 | 2 | 3 | 4 {
    let next = tier;
    if (hitCount > 1 && hitIndex > 0) {
      next -= 1;
    }
    if (hitCount >= 4) {
      next -= 1;
    }
    if ((kind === "skill" || kind === "enemySkill") && hitCount > 1 && hitIndex > 1) {
      next -= 1;
    }
    return this.clampTier(next);
  }

  private resolveHitScale(kind: ActionKind, hitIndex: number, hitCount: number): number {
    if (hitCount <= 1 || hitIndex <= 0) return 1;
    const baseDrop = kind === "skill" || kind === "enemySkill" ? 0.12 : 0.08;
    const progressive = Math.min(0.24, baseDrop + (hitIndex - 1) * 0.04);
    const densityDrop = hitCount >= 4 ? 0.06 : 0;
    return Math.max(0.68, 1 - progressive - densityDrop);
  }

  private resolveAngleOffset(
    hitIndex: number,
    hitCount: number,
    reduceMotion?: boolean
  ): number {
    if (hitCount <= 1 || hitIndex <= 0) return 0;
    const base = reduceMotion ? 6 : 10;
    const spread = Math.min(20, base + hitIndex * 2 + Math.max(0, hitCount - 3) * 2);
    return this.randomInt(-spread, spread);
  }

  private resolveHitPoints(
    origin: Point,
    impact: Point,
    hitIndex: number,
    hitCount: number,
    reduceMotion?: boolean
  ): { origin: Point; impact: Point } {
    if (hitCount <= 1 || hitIndex <= 0) {
      return { origin, impact };
    }
    const baseImpactJitter = reduceMotion ? 3 : 6;
    const impactJitter = Math.min(10, baseImpactJitter + hitIndex * 2);
    const originJitter = Math.min(4, Math.round(impactJitter * 0.5));
    return {
      origin: this.jitterPoint(origin, originJitter),
      impact: this.jitterPoint(impact, impactJitter)
    };
  }

  private stepDelay(ms: number, reduceMotion?: boolean): number {
    if (!reduceMotion) return ms;
    return Math.max(40, Math.round(ms * 0.6));
  }

  private schedule(delay: number, callback: () => void): void {
    if (delay <= 0) {
      callback();
      return;
    }
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }

  private splitAmount(total: number, hits: number): number[] {
    if (hits <= 1) return [total];
    const base = Math.floor(total / hits);
    const remainder = total - base * hits;
    const parts = Array.from({ length: hits }, () => base);
    for (let i = 0; i < remainder; i += 1) {
      parts[i] += 1;
    }
    return parts;
  }

  private randomInt(min: number, max: number): number {
    return Math.round(min + this.vfxRng.nextFloat() * (max - min));
  }

  private scaleValue(base: number | undefined, scale: number): number | undefined {
    const resolved = Number.isFinite(base) ? (base as number) : 1;
    return Math.max(0.2, Math.round(resolved * scale * 100) / 100);
  }

  private jitterPoint(origin: Point, radius: number): Point {
    if (radius <= 0) return { ...origin };
    const angle = this.vfxRng.nextFloat() * Math.PI * 2;
    const dist = this.randomInt(0, radius);
    return {
      x: Math.round(origin.x + Math.cos(angle) * dist),
      y: Math.round(origin.y + Math.sin(angle) * dist)
    };
  }
}
