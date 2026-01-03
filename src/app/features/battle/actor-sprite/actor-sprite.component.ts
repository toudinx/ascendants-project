import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  inject,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from "@angular/core";
import { Subscription } from "rxjs";
import { BattleFxBusService } from "../fx/battle-fx-bus.service";
import { BattleFxEvent } from "../fx/battle-fx.types";
import { BattleVfxIntensityService } from "../fx/battle-vfx-intensity.service";
import { VfxBudgetService } from "../fx/vfx-budget.service";
import { RngService } from "../../../core/services/rng.service";

export type ActorSide = "player" | "enemy";
export type ActorPose =
  | "idle"
  | "attack"
  | "cast"
  | "buff"
  | "defend"
  | "victory"
  | "down";
export type ActorImpactTone =
  | "hit-sm"
  | "hit-lg"
  | "hit-dot"
  | "hit-posture"
  | "crit-flare"
  | "break"
  | "superbreak";

interface OrbiterSpec {
  id: string;
  angle: number;
  radius: number;
  size: number;
}

@Component({
  selector: "app-actor-sprite",
  standalone: true,
  templateUrl: "./actor-sprite.component.html",
  styleUrls: ["./actor-sprite.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActorSpriteComponent implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) side: ActorSide = "player";
  @Input({ required: true }) spriteKey = "";
  @Input() pose: ActorPose = "idle";
  @Input() scale = 1;
  @Input() footY = 8;
  @Input() impactFlags: Partial<Record<ActorImpactTone, boolean>> = {};
  @Input() flash = false;
  @Input() showDot = false;
  @Input() hasBuff = false;
  @Input() energyFull = false;
  @Input() showAlert = false;
  @Input() isBroken = false;
  @Input() isSuperBroken = false;
  @Input() echoCount = 0;
  @Input() resonanceActive = false;
  @Input() reduceMotion = false;
  @Input() hitToken = 0;
  @Input() critToken = 0;
  @Input() dotPulseToken = 0;
  @Input() altText = "Actor";

  @Output() impactAnimationEnd = new EventEmitter<AnimationEvent>();

  blinkActive = false;
  hitPulse = false;
  critPulse = false;
  dotPulse = false;
  attackActive = false;
  castActive = false;
  hitReactActive = false;
  hitReactCrit = false;
  hitReactMicro = false;
  orbiters: OrbiterSpec[] = [];
  orbiterOpacity = 0;
  orbiterSpeed = 12;

  private blinkTimer?: ReturnType<typeof setTimeout>;
  private blinkDuration?: ReturnType<typeof setTimeout>;
  private hitTimer?: ReturnType<typeof setTimeout>;
  private critTimer?: ReturnType<typeof setTimeout>;
  private dotTimer?: ReturnType<typeof setTimeout>;
  private attackTimer?: ReturnType<typeof setTimeout>;
  private castTimer?: ReturnType<typeof setTimeout>;
  private hitReactTimer?: ReturnType<typeof setTimeout>;
  private hitReactMicroTimer?: ReturnType<typeof setTimeout>;
  private intensitySub?: Subscription;
  private readonly fxBus = inject(BattleFxBusService, { optional: true });
  private readonly fxSub = new Subscription();
  private readonly intensityService = inject(BattleVfxIntensityService, {
    optional: true
  });
  private readonly budget = inject(VfxBudgetService);
  private readonly vfxRng = inject(RngService).fork("vfx-actor-sprite");
  private readonly cdr = inject(ChangeDetectorRef);
  private orbiterCounter = 0;
  private vfxIntensity = 0;
  private systemReducedMotion = false;

  @HostBinding("class.actor-sprite") readonly hostClass = true;
  @HostBinding("class.actor-sprite--player")
  get isPlayer(): boolean {
    return this.side === "player";
  }
  @HostBinding("class.actor-sprite--enemy")
  get isEnemy(): boolean {
    return this.side === "enemy";
  }
  @HostBinding("class.pose-idle")
  get isIdle(): boolean {
    return this.pose === "idle";
  }
  @HostBinding("class.pose-attack")
  get isAttack(): boolean {
    return this.pose === "attack";
  }
  @HostBinding("class.pose-cast")
  get isCast(): boolean {
    return this.pose === "cast";
  }
  @HostBinding("class.pose-buff")
  get isBuff(): boolean {
    return this.pose === "buff";
  }
  @HostBinding("class.pose-defend")
  get isDefend(): boolean {
    return this.pose === "defend";
  }
  @HostBinding("class.pose-victory")
  get isVictory(): boolean {
    return this.pose === "victory";
  }
  @HostBinding("class.pose-down")
  get isDown(): boolean {
    return this.pose === "down";
  }
  @HostBinding("class.is-attacking")
  get isAttacking(): boolean {
    return this.attackActive;
  }
  @HostBinding("class.is-casting")
  get isCasting(): boolean {
    return this.castActive;
  }
  @HostBinding("class.is-hit")
  get isHitReacting(): boolean {
    return this.hitReactActive;
  }
  @HostBinding("class.is-hit-crit")
  get isHitCrit(): boolean {
    return this.hitReactActive && this.hitReactCrit;
  }
  @HostBinding("class.is-hit-micro")
  get isHitMicro(): boolean {
    return this.hitReactMicro;
  }
  @HostBinding("style.--actor-scale")
  get scaleVar(): string {
    return `${this.scale}`;
  }
  @HostBinding("style.--actor-foot-y")
  get footYVar(): string {
    return `${this.footY}%`;
  }

  ngOnInit(): void {
    this.systemReducedMotion = this.prefersReducedMotion();
    if (!this.isReducedMotion()) {
      this.scheduleBlink();
    }
    if (this.intensityService) {
      this.intensitySub = this.intensityService.intensity$.subscribe(value => {
        this.vfxIntensity = this.clamp01(value);
        this.rebuildOrbiters();
      });
    }
    this.rebuildOrbiters();
    if (this.fxBus) {
      this.fxSub.add(
        this.fxBus.events$.subscribe(event => this.handleFxEvent(event))
      );
    }
  }

  ngOnDestroy(): void {
    this.clearBlinkTimers();
    if (this.hitTimer) clearTimeout(this.hitTimer);
    if (this.critTimer) clearTimeout(this.critTimer);
    if (this.dotTimer) clearTimeout(this.dotTimer);
    if (this.attackTimer) clearTimeout(this.attackTimer);
    if (this.castTimer) clearTimeout(this.castTimer);
    if (this.hitReactTimer) clearTimeout(this.hitReactTimer);
    if (this.hitReactMicroTimer) clearTimeout(this.hitReactMicroTimer);
    this.intensitySub?.unsubscribe();
    this.fxSub.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["hitToken"] && !changes["hitToken"].firstChange) {
      this.triggerPulse("hit");
    }
    if (changes["critToken"] && !changes["critToken"].firstChange) {
      this.triggerPulse("crit");
    }
    if (changes["dotPulseToken"] && !changes["dotPulseToken"].firstChange) {
      this.triggerPulse("dot");
    }
    if (
      changes["echoCount"] ||
      changes["resonanceActive"] ||
      changes["reduceMotion"]
    ) {
      this.rebuildOrbiters();
    }
  }

  onImpactAnimationEnd(event: AnimationEvent): void {
    if (event.target !== event.currentTarget) return;
    this.impactAnimationEnd.emit(event);
  }

  get showResonanceSigil(): boolean {
    return this.resonanceActive;
  }

  get orbitersStatic(): boolean {
    return this.isReducedMotion();
  }

  private triggerPulse(type: "hit" | "crit" | "dot"): void {
    if (type === "dot") {
      this.dotPulse = false;
      if (this.dotTimer) clearTimeout(this.dotTimer);
      this.markForCheck();
      this.raf(() => {
        this.dotPulse = true;
        this.markForCheck();
      });
      this.dotTimer = setTimeout(() => {
        this.dotPulse = false;
        this.markForCheck();
      }, 220);
      return;
    }
    if (type === "hit") {
      this.hitPulse = false;
      if (this.hitTimer) clearTimeout(this.hitTimer);
      this.markForCheck();
      this.raf(() => {
        this.hitPulse = true;
        this.markForCheck();
      });
      this.hitTimer = setTimeout(() => {
        this.hitPulse = false;
        this.markForCheck();
      }, 140);
      return;
    }

    this.critPulse = false;
    if (this.critTimer) clearTimeout(this.critTimer);
    this.markForCheck();
    this.raf(() => {
      this.critPulse = true;
      this.markForCheck();
    });
    this.critTimer = setTimeout(() => {
      this.critPulse = false;
      this.markForCheck();
    }, 180);
  }

  private handleFxEvent(event: BattleFxEvent): void {
    if (event.kind === "attackStart" && event.attacker === this.side) {
      if (event.style === "cast") {
        this.triggerCast();
      } else {
        this.triggerAttack();
      }
      return;
    }
    if (event.kind === "hitReaction" && event.target === this.side) {
      this.triggerHitReaction(!!event.crit, !!event.micro);
    }
  }

  private triggerAttack(): void {
    this.attackActive = false;
    if (this.attackTimer) clearTimeout(this.attackTimer);
    this.markForCheck();
    this.raf(() => {
      this.attackActive = true;
      this.markForCheck();
    });
    this.attackTimer = setTimeout(() => {
      this.attackActive = false;
      this.markForCheck();
    }, 200);
  }

  private triggerCast(): void {
    this.castActive = false;
    if (this.castTimer) clearTimeout(this.castTimer);
    this.markForCheck();
    this.raf(() => {
      this.castActive = true;
      this.markForCheck();
    });
    this.castTimer = setTimeout(() => {
      this.castActive = false;
      this.markForCheck();
    }, 220);
  }

  private triggerHitReaction(crit: boolean, micro = false): void {
    if (micro) {
      if (this.hitReactActive) return;
      this.hitReactMicro = false;
      if (this.hitReactMicroTimer) clearTimeout(this.hitReactMicroTimer);
      this.markForCheck();
      this.raf(() => {
        this.hitReactMicro = true;
        this.markForCheck();
      });
      this.hitReactMicroTimer = setTimeout(() => {
        this.hitReactMicro = false;
        this.markForCheck();
      }, 120);
      return;
    }
    this.hitReactActive = false;
    this.hitReactCrit = crit;
    this.hitReactMicro = false;
    if (this.hitReactTimer) clearTimeout(this.hitReactTimer);
    this.markForCheck();
    this.raf(() => {
      this.hitReactActive = true;
      this.markForCheck();
    });
    this.hitReactTimer = setTimeout(() => {
      this.hitReactActive = false;
      this.hitReactCrit = false;
      this.markForCheck();
    }, crit ? 180 : 140);
  }

  private scheduleBlink(): void {
    this.blinkTimer = setTimeout(() => {
      this.blinkActive = true;
      this.markForCheck();
      this.blinkDuration = setTimeout(() => {
        this.blinkActive = false;
        this.markForCheck();
        this.scheduleBlink();
      }, 140);
    }, this.nextBlinkDelay());
  }

  private nextBlinkDelay(): number {
    const base = 2200;
    const variance = Math.floor(this.vfxRng.nextFloat() * 2200);
    return base + variance;
  }

  private clearBlinkTimers(): void {
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    if (this.blinkDuration) clearTimeout(this.blinkDuration);
  }

  private raf(callback: () => void): void {
    const schedule =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0);
    schedule(() => callback());
  }

  private prefersReducedMotion(): boolean {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private rebuildOrbiters(): void {
    const intensity = this.clamp01(this.vfxIntensity);
    const reduced = this.isReducedMotion();
    const caps = this.budget.getCaps(intensity, reduced);
    const echoFactor = this.clamp01(this.echoCount / 4);
    const base = this.clamp01(intensity * 0.7 + echoFactor * 0.5);
    let count = Math.round(base * caps.maxOrbitersPerActor);

    if (this.echoCount > 0 && intensity > 0.1) {
      count = Math.max(1, count);
    }

    count = Math.min(caps.maxOrbitersPerActor, count);
    if (this.orbiters.length !== count) {
      this.orbiters = this.buildOrbiters(count);
    }

    const opacityBase = 0.08 + intensity * 0.22;
    this.orbiterOpacity = reduced ? opacityBase * 0.6 : opacityBase;
    const speedBase = 16 - intensity * 6;
    this.orbiterSpeed = reduced ? speedBase * 1.6 : speedBase;
    this.markForCheck();
  }

  private buildOrbiters(count: number): OrbiterSpec[] {
    if (count <= 0) return [];
    const orbiters: OrbiterSpec[] = [];
    const step = 360 / count;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.round(i * step + this.vfxRng.nextFloat() * 16);
      const radius = Math.round(26 + i * 4 + this.vfxRng.nextFloat() * 6);
      const size = Math.round(3 + (i % 2));
      orbiters.push({
        id: `orb-${this.side}-${++this.orbiterCounter}`,
        angle,
        radius,
        size
      });
    }
    return orbiters;
  }

  private isReducedMotion(): boolean {
    return this.reduceMotion || this.systemReducedMotion;
  }

  private clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  private markForCheck(): void {
    this.cdr.markForCheck();
  }
}
