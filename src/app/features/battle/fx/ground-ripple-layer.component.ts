import {
  ChangeDetectionStrategy,
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
import { BattleFxAnchors, BattleFxEvent, ActorSide } from "./battle-fx.types";
import { BattleFxBusService } from "./battle-fx-bus.service";
import { BattleVfxIntensityService } from "./battle-vfx-intensity.service";
import { VfxBudgetService } from "./vfx-budget.service";

interface GroundRippleInstance {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  crack: boolean;
}

@Component({
  selector: "app-ground-ripple-layer",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./ground-ripple-layer.component.html",
  styleUrls: ["./ground-ripple-layer.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GroundRippleLayerComponent implements OnDestroy {
  @Input({ required: true }) anchors!: BattleFxAnchors;
  @Input() reduceMotion = false;
  @ViewChild("layer", { static: true })
  private readonly layer?: ElementRef<HTMLDivElement>;

  readonly ripples = signal<GroundRippleInstance[]>([]);

  private readonly bus = inject(BattleFxBusService);
  private readonly intensityService = inject(BattleVfxIntensityService, {
    optional: true
  });
  private readonly budget = inject(VfxBudgetService);
  private intensity = 0;
  private intensitySub?: Subscription;
  private readonly subscriptions = new Subscription();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private instanceCounter = 0;
  private pendingImpactStyle: Record<ActorSide, "melee" | "ranged" | "cast" | null> = {
    player: null,
    enemy: null
  };

  constructor() {
    this.subscriptions.add(
      this.bus.events$.subscribe(event => this.handleEvent(event))
    );
    if (this.intensityService) {
      this.intensitySub = this.intensityService.intensity$.subscribe(value => {
        this.intensity = this.clamp01(value);
      });
    }
  }

  ngOnDestroy(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.intensitySub?.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  remove(id: string): void {
    this.clearTimer(id);
    this.ripples.update(list => list.filter(item => item.id !== id));
  }

  private handleEvent(event: BattleFxEvent): void {
    if (event.kind === "attackStart") {
      const target = event.attacker === "player" ? "enemy" : "player";
      this.pendingImpactStyle[target] = event.style;
      return;
    }

    if (event.kind !== "impact") return;
    if (event.dot) return;

    this.spawnRipple(event);
  }

  private spawnRipple(event: Extract<BattleFxEvent, { kind: "impact" }>): void {
    const foot = this.pointFor(event.target, "foot");
    const style = this.consumeImpactStyle(event.target, event.style);
    const isSkill = style === "cast" || style === "ranged";
    const tier = Math.max(1, event.tier ?? 1);
    const scale =
      1 +
      (tier - 1) * 0.12 +
      (event.crit ? 0.12 : 0) +
      (isSkill ? 0.12 : 0);
    const size = Math.round(46 * scale);
    const baseDuration = 240 + (tier - 1) * 30;
    const bonus = (event.crit ? 40 : 0) + (isSkill ? 60 : 0);
    const duration = this.reduceDuration(
      Math.min(420, Math.max(240, Math.round(baseDuration + bonus)))
    );
    const opacityBase = event.crit || isSkill ? 0.45 : 0.32;
    const opacity = this.reduceMotion ? opacityBase * 0.7 : opacityBase;
    const crack = event.crit || isSkill || tier >= 3;

    this.pushInstance({
      id: `ripple-${++this.instanceCounter}`,
      x: foot.x,
      y: foot.y,
      size,
      opacity,
      duration,
      crack
    });
  }

  private consumeImpactStyle(
    target: ActorSide,
    override?: "melee" | "ranged" | "cast"
  ): "melee" | "ranged" | "cast" {
    const style = override ?? this.pendingImpactStyle[target] ?? "melee";
    this.pendingImpactStyle[target] = null;
    return style;
  }

  private pushInstance(instance: GroundRippleInstance): void {
    const cap = this.cap();
    this.ripples.update(list => {
      let next = [...list, instance];
      if (next.length > cap) {
        const dropCount = next.length - cap;
        const dropped = next.slice(0, dropCount);
        dropped.forEach(item => this.clearTimer(item.id));
        next = next.slice(dropCount);
      }
      return next;
    });

    const timer = setTimeout(() => this.remove(instance.id), instance.duration + 120);
    this.timers.set(instance.id, timer);
  }

  private cap(): number {
    const caps = this.budget.getCaps(this.intensity, this.reduceMotion);
    let cap = Math.max(4, Math.round(caps.maxProcBursts * 0.6));
    if (this.reduceMotion) {
      cap = Math.min(8, cap);
    }
    return cap;
  }

  private pointFor(side: ActorSide, key: "foot" | "impact"): { x: number; y: number } {
    const rect = this.layerRect();
    const anchor =
      this.anchors?.[side]?.[key] ??
      this.anchors?.[side]?.impact ??
      { x: 50, y: 50 };
    const x = Math.round((anchor.x / 100) * rect.width);
    const y = Math.round((anchor.y / 100) * rect.height);
    return { x, y };
  }

  private layerRect(): { width: number; height: number } {
    const rect = this.layer?.nativeElement.getBoundingClientRect();
    if (!rect) return { width: 1, height: 1 };
    return { width: rect.width || 1, height: rect.height || 1 };
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }

  private reduceDuration(duration: number): number {
    if (!this.reduceMotion) return duration;
    return Math.max(160, Math.round(duration * 0.7));
  }

  private clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }
}
