import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
  signal
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Subscription } from "rxjs";
import {
  BattleFxAnchors,
  BattleFxEvent,
  Point,
  ActorSide,
  AfterglowFieldKey
} from "./battle-fx.types";
import { BattleCameraService } from "../arena/battle-camera.service";
import { AmbientParticlesComponent } from "./ambient-particles.component";
import {
  EchoSignatureLayerComponent,
  EchoSignaturePath
} from "./echo-signature-layer.component";
import { BattleFxBusService } from "./battle-fx-bus.service";
import { BattleVfxIntensityService } from "./battle-vfx-intensity.service";
import { VfxBudgetService, VfxCaps } from "./vfx-budget.service";
import { VfxSettingsService } from "./vfx-settings.service";
import { VFX_HOLD_MS, VFX_TIMING } from "./vfx-timing.config";

type VfxKind =
  | "projectile"
  | "slash"
  | "spark"
  | "ring"
  | "burst"
  | "trail"
  | "puff"
  | "charge"
  | "afterglow"
  | "vignette";
type VfxVariant = "normal" | "crit" | "dot";

interface VfxInstance {
  id: string;
  kind: VfxKind;
  variant: VfxVariant;
  x: number;
  y: number;
  fieldKey?: AfterglowFieldKey;
  dx?: number;
  dy?: number;
  angle?: number;
  size?: number;
  length?: number;
  thickness?: number;
  opacity?: number;
  duration?: number;
  ttl: number;
}

interface ImpactProfile {
  impactMs: number;
  afterglowMs: number;
  scale: number;
  isSkill: boolean;
  tier: number;
}

@Component({
  selector: "app-vfx-layer",
  standalone: true,
  imports: [CommonModule, AmbientParticlesComponent, EchoSignatureLayerComponent],
  templateUrl: "./vfx-layer.component.html",
  styleUrls: ["./vfx-layer.component.scss"]
})
export class VfxLayerComponent implements OnDestroy {
  @Input({ required: true }) anchors!: BattleFxAnchors;
  @Input() reduceMotion = false;
  @Input() echoPaths: EchoSignaturePath[] = [];
  @ViewChild("layer", { static: true })
  private readonly layer?: ElementRef<HTMLDivElement>;

  readonly instances = signal<VfxInstance[]>([]);
  readonly holdActive = signal(false);

  private readonly camera = inject(BattleCameraService);
  private readonly bus = inject(BattleFxBusService);
  private readonly intensityService = inject(BattleVfxIntensityService, {
    optional: true
  });
  private readonly budget = inject(VfxBudgetService);
  private readonly vfxSettings = inject(VfxSettingsService, { optional: true });
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly subscriptions = new Subscription();
  private readonly lastImpactPoints: Record<"player" | "enemy", Point | null> = {
    player: null,
    enemy: null
  };
  private readonly pendingImpactStyle: Record<
    ActorSide,
    "melee" | "ranged" | "cast" | null
  > = { player: null, enemy: null };
  private readonly lastAttackStyle: Record<
    ActorSide,
    "melee" | "ranged" | "cast" | null
  > = { player: null, enemy: null };
  private instanceCounter = 0;
  private intensity = 0;
  private holdTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.subscriptions.add(
      this.bus.events$.subscribe(event => this.handleEvent(event))
    );
    if (this.intensityService) {
      this.subscriptions.add(
        this.intensityService.intensity$.subscribe(value => {
          this.intensity = this.clamp01(value);
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.subscriptions.unsubscribe();
  }

  remove(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.instances.update(list => list.filter(item => item.id !== id));
  }

  private handleEvent(event: BattleFxEvent): void {
    if (event.kind === "floatText") {
      this.lastImpactPoints[event.target] = event.at;
      return;
    }

    if (event.kind === "attackStart") {
      this.handleAttackStart(event);
      return;
    }

    if (event.kind === "projectile") {
      const target = event.attacker === "player" ? "enemy" : "player";
      this.lastImpactPoints[target] = this.roundPoint(event.to);
      this.spawnProjectile(event);
      this.spawnTrail(event.from, event.to, "normal", 1);
      return;
    }

    if (event.kind === "slash") {
      this.spawnSlashDirect(event);
      return;
    }

    if (event.kind === "field") {
      this.spawnField(event);
      return;
    }

    if (event.kind === "impact") {
      const impact = this.resolveImpactPoint(event.target);
      if (event.dot) {
        const profile = this.dotProfile();
        this.spawnDotPulse(impact, profile);
        return;
      }
      const style = this.consumeImpactStyle(event.target, event.dot, event.style);
      const isSkill = style === "cast" || style === "ranged";
      const variant = this.variantFor(event);
      const profile = this.impactProfile(event, isSkill);
      this.triggerHold();
      this.spawnSparkCluster(impact, variant, profile);
      if (event.crit || isSkill || (event.tier ?? 1) >= 2) {
        this.spawnRing(impact, variant, profile);
      }
      if (!event.dot) {
        this.spawnSlash(impact, event.target, variant, profile);
      }
      this.spawnImpactExtras(impact, event, profile);
      this.spawnProcBurst(impact, variant, profile, event);
      return;
    }

    if (event.kind === "shake") {
      if (!this.reduceMotion && (this.vfxSettings?.shakeEnabled() ?? true)) {
        this.camera.shake(event.intensity, event.durationMs);
      }
    }
  }

  private handleAttackStart(
    event: Extract<BattleFxEvent, { kind: "attackStart" }>
  ): void {
    this.lastAttackStyle[event.attacker] = event.style;
    const target = event.attacker === "player" ? "enemy" : "player";
    this.pendingImpactStyle[target] = event.style;
    const origin = this.pointFor(event.attacker, "origin");
    const duration = this.spawnAnticipation(origin, event.style, event.attacker);
    if (event.style === "cast" && event.attacker === "player") {
      this.spawnVignettePulse(duration);
    }
    if (event.style === "melee") {
      const impact = this.pointFor(target, "impact");
      this.spawnTrail(origin, impact, "normal", 0.6);
    }
  }

  private spawnProjectile(event: Extract<BattleFxEvent, { kind: "projectile" }>): void {
    if (this.reduceMotion) return;
    const origin = this.roundPoint(event.from);
    const impact = this.roundPoint(event.to);
    const dx = Math.round(impact.x - origin.x);
    const dy = Math.round(impact.y - origin.y);
    const style = this.lastAttackStyle[event.attacker];
    const timing =
      style === "cast" || style === "ranged" ? VFX_TIMING.skill : VFX_TIMING.normal;
    const duration = this.reduceDuration(
      "travelMs" in timing ? timing.travelMs : 220
    );
    const baseSize = style === "cast" ? 18 : style === "ranged" ? 16 : 14;
    const scale = Number.isFinite(event.projectileScale)
      ? Math.max(0.6, event.projectileScale as number)
      : 1;
    const size = Math.round(baseSize * scale);
    const halfSize = Math.round(size / 2);
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "projectile",
      variant: "normal",
      x: origin.x - halfSize,
      y: origin.y - halfSize,
      dx,
      dy,
      size,
      duration,
      ttl: duration + 80
    });
  }

  private spawnSlash(
    impact: Point,
    target: "player" | "enemy",
    variant: VfxVariant,
    profile: ImpactProfile
  ): void {
    if (this.reduceMotion) return;
    const attacker = target === "player" ? "enemy" : "player";
    const origin = this.pointFor(attacker, "origin");
    const dx = impact.x - origin.x;
    const dy = impact.y - origin.y;
    const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    const baseLength = profile.isSkill ? 44 : 38;
    const baseThickness = profile.isSkill ? 16 : 14;
    const length = Math.round(baseLength * profile.scale);
    const thickness = Math.round(baseThickness * profile.scale);
    const duration = this.reduceDuration(profile.impactMs + 60);
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "slash",
      variant,
      x: impact.x,
      y: impact.y,
      angle,
      length,
      thickness,
      duration,
      ttl: duration + 80
    });
  }

  private spawnSpark(impact: Point, variant: VfxVariant, profile: ImpactProfile): void {
    if (this.reduceMotion && variant !== "crit") return;
    if (!this.canSpawn("spark")) return;
    const size = Math.round((variant === "crit" ? 20 : 16) * profile.scale);
    const duration = this.reduceDuration(profile.impactMs + 40);
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "spark",
      variant,
      x: impact.x,
      y: impact.y,
      size,
      duration,
      ttl: duration + 60
    });
  }

  private spawnRing(impact: Point, variant: VfxVariant, profile: ImpactProfile): void {
    if (!this.canSpawn("ring")) return;
    const base = profile.isSkill ? 62 : 54;
    const size = Math.round(base * profile.scale);
    const duration = this.reduceDuration(profile.impactMs + 80);
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "ring",
      variant,
      x: impact.x,
      y: impact.y,
      size,
      opacity: variant === "dot" ? 0.65 : 0.85,
      duration,
      ttl: duration + 80
    });
  }

  private spawnBurst(impact: Point, variant: VfxVariant, profile: ImpactProfile): void {
    if (!this.canSpawn("burst")) return;
    const base = profile.isSkill ? 64 : 52;
    const size = Math.round(base * profile.scale);
    const duration = this.reduceDuration(profile.impactMs + 60);
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "burst",
      variant,
      x: impact.x,
      y: impact.y,
      size,
      opacity: variant === "crit" ? 0.95 : 0.75,
      duration,
      ttl: duration + 60
    });
  }

  private spawnPuff(impact: Point, duration: number): void {
    if (!this.canSpawn("puff")) return;
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "puff",
      variant: "dot",
      x: impact.x,
      y: impact.y + 6,
      size: 34,
      opacity: 0.55,
      duration,
      ttl: duration + 120
    });
  }

  private spawnTrail(
    from: Point,
    to: Point,
    variant: VfxVariant,
    chanceScale = 1
  ): void {
    if (this.reduceMotion || !this.canSpawn("trail")) return;
    if (!this.shouldSpawnTrail(chanceScale)) return;
    const origin = this.roundPoint(from);
    const impact = this.roundPoint(to);
    const dx = impact.x - origin.x;
    const dy = impact.y - origin.y;
    const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    const length = Math.max(18, Math.round(Math.hypot(dx, dy)));
    const mid = {
      x: Math.round(origin.x + dx / 2),
      y: Math.round(origin.y + dy / 2)
    };
    const duration = this.reduceDuration(VFX_TIMING.skill.travelMs ?? 220);
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "trail",
      variant,
      x: mid.x,
      y: mid.y,
      angle,
      length: Math.round(length * 1.1),
      thickness: 5,
      opacity: 0.75,
      duration,
      ttl: duration + 60
    });
  }

  private spawnImpactExtras(
    impact: Point,
    event: Extract<BattleFxEvent, { kind: "impact" }>,
    profile: ImpactProfile
  ): void {
    if (event.dot) {
      const duration = this.reduceDuration(VFX_TIMING.dot.afterglowMs);
      this.spawnPuff(impact, duration);
      return;
    }
    if (event.crit) {
      if (this.shouldProc(0.2, 0.7)) {
        this.spawnBurst(impact, "crit", profile);
      }
      return;
    }
    if (this.shouldProc(0.08, 0.5)) {
      this.spawnBurst(impact, "normal", profile);
    }
  }


  private spawnAnticipation(
    origin: Point,
    style: "melee" | "ranged" | "cast",
    attacker: ActorSide
  ): number {
    const timing =
      style === "melee" ? VFX_TIMING.normal : VFX_TIMING.skill;
    const duration = this.reduceDuration(timing.anticipationMs);
    if (this.reduceMotion || !this.canSpawn("charge")) {
      return duration;
    }
    const size = style === "melee" ? 28 : 44;
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "charge",
      variant: "normal",
      x: origin.x,
      y: origin.y,
      size,
      opacity: style === "melee" ? 0.45 : 0.6,
      duration,
      ttl: duration + 80
    });
    if (style !== "melee") {
      this.spawnChargePulse(origin, duration, size);
      const foot = this.pointFor(attacker, "foot");
      this.spawnChargeSigil(foot, duration, size);
    }
    return duration;
  }

  private spawnChargePulse(origin: Point, baseDuration: number, size: number): void {
    const duration = Math.round(baseDuration * 1.1);
    const ringSize = Math.round(size * 1.4);
    if (this.canSpawn("ring")) {
      this.pushInstance({
        id: `vfx-${++this.instanceCounter}`,
        kind: "ring",
        variant: "normal",
        x: origin.x,
        y: origin.y,
        size: ringSize,
        opacity: 0.7,
        duration,
        ttl: duration + 80
      });
    }
    const burstSize = Math.round(size * 1.1);
    const burstDuration = Math.round(baseDuration * 0.85);
    if (this.canSpawn("burst")) {
      this.pushInstance({
        id: `vfx-${++this.instanceCounter}`,
        kind: "burst",
        variant: "normal",
        x: origin.x,
        y: origin.y,
        size: burstSize,
        opacity: 0.45,
        duration: burstDuration,
        ttl: burstDuration + 80
      });
    }
  }

  private spawnChargeSigil(origin: Point, baseDuration: number, size: number): void {
    const duration = Math.round(baseDuration * 1.2);
    const ringSize = Math.round(size * 1.8);
    if (!this.canSpawn("ring")) return;
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "ring",
      variant: "normal",
      x: origin.x,
      y: origin.y,
      size: ringSize,
      opacity: 0.65,
      duration,
      ttl: duration + 120
    });
  }

  private spawnVignettePulse(duration: number): void {
    if (this.reduceMotion) return;
    if (this.vfxSettings?.reduceFlash()) return;
    if (!this.canSpawn("vignette")) return;
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "vignette",
      variant: "normal",
      x: 0,
      y: 0,
      opacity: 0.28,
      duration,
      ttl: duration + 140
    });
  }

  private spawnProcBurst(
    impact: Point,
    variant: VfxVariant,
    profile: ImpactProfile,
    event: Extract<BattleFxEvent, { kind: "impact" }>
  ): void {
    if (event.dot || !event.combo) return;
    if (!this.shouldProc(0.05, 0.4)) return;

    const procProfile: ImpactProfile = {
      impactMs: Math.max(80, Math.round(profile.impactMs * 0.6)),
      afterglowMs: 0,
      scale: profile.isSkill ? 0.85 : 0.75,
      isSkill: profile.isSkill,
      tier: 1
    };

    this.spawnRing(impact, variant, procProfile);
    if (this.shouldProc(0.2, 0.5)) {
      const sparkPoint = this.jitterPoint(impact, 6);
      this.spawnSpark(sparkPoint, variant, procProfile);
    }
  }

  private spawnSparkCluster(
    impact: Point,
    variant: VfxVariant,
    profile: ImpactProfile
  ): void {
    if (variant === "dot") return;
    let count = 1;
    if (profile.isSkill) count += 1;
    if (variant === "crit") count += 1;
    count += Math.max(0, profile.tier - 1);
    if (!this.reduceMotion) {
      count += this.randomInt(0, 2);
    }
    count = Math.min(5, count);
    for (let i = 0; i < count; i += 1) {
      const jitter = this.jitterPoint(impact, variant === "crit" ? 10 : 7);
      this.spawnSpark(jitter, variant, profile);
    }
  }

  private spawnField(
    event: Extract<BattleFxEvent, { kind: "field" }>
  ): void {
    if (!this.canSpawn("afterglow")) return;
    const at = this.roundPoint(event.at);
    const tier = event.tier ?? 1;
    const scale = 1 + (tier - 1) * 0.12;
    const duration = this.reduceDuration(event.durationMs ?? VFX_TIMING.normal.afterglowMs);
    const base = event.fieldKey === "rune" ? 86 : 72;
    const size = Math.round(base * scale);
    const opacity = event.fieldKey === "rune" ? 0.5 : 0.55;
    const variant: VfxVariant = event.fieldKey === "rune" ? "normal" : "dot";
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "afterglow",
      variant,
      x: at.x,
      y: at.y,
      size,
      opacity,
      duration,
      ttl: duration + 160,
      fieldKey: event.fieldKey
    });
  }

  private spawnSlashDirect(
    event: Extract<BattleFxEvent, { kind: "slash" }>
  ): void {
    if (this.reduceMotion) return;
    const from = this.roundPoint(event.from);
    const to = this.roundPoint(event.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    const angleOffset = event.angleOffset ?? 0;
    const scale = event.scale ?? 1;
    const length = Math.round(36 * scale);
    const thickness = Math.round(12 * scale);
    const duration = this.reduceDuration(VFX_TIMING.normal.impactMs + 60);
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "slash",
      variant: event.crit ? "crit" : "normal",
      x: to.x,
      y: to.y,
      angle: angle + angleOffset,
      length,
      thickness,
      duration,
      ttl: duration + 80
    });
  }

  private spawnDotPulse(impact: Point, profile: ImpactProfile): void {
    if (!this.canSpawn("ring")) return;
    const size = Math.round(32 * profile.scale);
    const duration = this.reduceDuration(profile.impactMs);
    this.pushInstance({
      id: `vfx-${++this.instanceCounter}`,
      kind: "ring",
      variant: "dot",
      x: impact.x,
      y: impact.y,
      size,
      opacity: 0.65,
      duration,
      ttl: duration + 80
    });
  }

  private impactProfile(
    event: Extract<BattleFxEvent, { kind: "impact" }>,
    isSkill: boolean
  ): ImpactProfile {
    const timing = isSkill ? VFX_TIMING.skill : VFX_TIMING.normal;
    let afterglowMs = timing.afterglowMs;
    let scale = isSkill ? 1.1 : 1;
    const tier = event.tier ?? 1;
    scale *= 1 + (tier - 1) * 0.12;

    if (event.crit) {
      scale *= VFX_TIMING.crit.impactScale;
      afterglowMs += VFX_TIMING.crit.afterglowBoostMs;
    }

    return {
      impactMs: timing.impactMs,
      afterglowMs,
      scale,
      isSkill,
      tier
    };
  }

  private dotProfile(): ImpactProfile {
    return {
      impactMs: VFX_TIMING.dot.pulseMs,
      afterglowMs: VFX_TIMING.dot.afterglowMs,
      scale: 0.95,
      isSkill: false,
      tier: 1
    };
  }

  private consumeImpactStyle(
    target: ActorSide,
    isDot?: boolean,
    override?: "melee" | "ranged" | "cast"
  ): "melee" | "ranged" | "cast" {
    if (isDot) return "melee";
    const style = override ?? this.pendingImpactStyle[target] ?? "melee";
    this.pendingImpactStyle[target] = null;
    return style;
  }

  private triggerHold(): void {
    if (this.reduceMotion) return;
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdActive.set(true);
    this.holdTimer = setTimeout(() => {
      this.holdActive.set(false);
    }, VFX_HOLD_MS);
  }

  private reduceDuration(duration: number): number {
    if (!this.reduceMotion) return duration;
    return Math.max(80, Math.round(duration * 0.6));
  }

  private jitterPoint(origin: Point, radius: number): Point {
    const angle = Math.random() * Math.PI * 2;
    const dist = this.randomInt(0, radius);
    return {
      x: Math.round(origin.x + Math.cos(angle) * dist),
      y: Math.round(origin.y + Math.sin(angle) * dist)
    };
  }

  private randomInt(min: number, max: number): number {
    return Math.round(min + Math.random() * (max - min));
  }

  private pushInstance(instance: VfxInstance): void {
    const caps = this.getCaps();
    const kindCap = this.capForKind(instance.kind, caps);
    const totalCap = this.totalCap(caps);

    this.instances.update(list => {
      let next = list;
      if (kindCap > 0) {
        const sameKind = list.filter(item => item.kind === instance.kind);
        if (sameKind.length >= kindCap) {
          const drop = sameKind[0];
          next = next.filter(item => item.id !== drop.id);
          this.clearTimer(drop.id);
        }
      }

      next = [...next, instance];
      if (next.length > totalCap) {
        const overflow = next.length - totalCap;
        const dropped = next.slice(0, overflow);
        dropped.forEach(item => this.clearTimer(item.id));
        next = next.slice(overflow);
      }
      return next;
    });

    const timer = setTimeout(() => this.remove(instance.id), instance.ttl);
    this.timers.set(instance.id, timer);
  }

  private pointFor(side: "player" | "enemy", key: "origin" | "impact" | "foot"): {
    x: number;
    y: number;
  } {
    const rect = this.layerRect();
    const anchor = this.anchors?.[side]?.[key] ?? { x: 50, y: 50 };
    const x = Math.round((anchor.x / 100) * rect.width);
    const y = Math.round((anchor.y / 100) * rect.height);
    return { x, y };
  }

  private layerRect(): { width: number; height: number } {
    const rect = this.layer?.nativeElement.getBoundingClientRect();
    if (!rect) return { width: 1, height: 1 };
    return { width: rect.width || 1, height: rect.height || 1 };
  }

  private resolveImpactPoint(target: "player" | "enemy"): Point {
    const stored = this.lastImpactPoints[target];
    if (stored) return this.roundPoint(stored);
    return this.pointFor(target, "impact");
  }

  private variantFor(event: Extract<BattleFxEvent, { kind: "impact" }>): VfxVariant {
    if (event.crit) return "crit";
    if (event.dot) return "dot";
    return "normal";
  }

  private roundPoint(point: Point): Point {
    return {
      x: Math.round(point.x),
      y: Math.round(point.y)
    };
  }

  private getCaps(): VfxCaps {
    return this.budget.getCaps(this.intensity, this.reduceMotion);
  }

  private capForKind(kind: VfxKind, caps: VfxCaps): number {
    switch (kind) {
      case "trail":
        return Math.max(0, caps.maxTrails);
      case "projectile":
        return Math.max(2, Math.round(caps.maxTrails * 0.5) + 2);
      case "slash":
        return Math.max(2, Math.round(caps.maxProcBursts * 0.4));
      case "spark":
        return Math.max(3, Math.round(caps.maxProcBursts * 0.7));
      case "vignette":
        return 1;
      default:
        return Math.max(0, caps.maxProcBursts);
    }
  }

  private totalCap(caps: VfxCaps): number {
    const base = caps.maxProcBursts + caps.maxTrails + 8;
    return Math.min(80, Math.max(12, base));
  }

  private canSpawn(kind: VfxKind): boolean {
    const caps = this.getCaps();
    const cap = this.capForKind(kind, caps);
    if (cap <= 0) return false;
    const active = this.instances().filter(item => item.kind === kind).length;
    return active < cap;
  }

  private shouldProc(base: number, max: number): boolean {
    const intensity = this.clamp01(this.intensity);
    const scaled = base + (max - base) * intensity;
    const adjusted = this.reduceMotion ? scaled * 0.35 : scaled;
    return Math.random() < adjusted;
  }

  private shouldSpawnTrail(scale: number): boolean {
    if (this.intensity < 0.2) return false;
    return this.shouldProc(0.12, 0.7) && Math.random() < scale;
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }

  private clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }
}
