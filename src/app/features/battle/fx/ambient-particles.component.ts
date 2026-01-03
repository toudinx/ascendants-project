import {
  AfterViewInit,
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
import { BattleVfxIntensityService } from "./battle-vfx-intensity.service";
import { VfxBudgetService } from "./vfx-budget.service";
import { RngService } from "../../../core/services/rng.service";

type AmbientKind = "ember" | "ash";

declare const ngDevMode: boolean;

interface AmbientParticle {
  id: string;
  kind: AmbientKind;
  x: number;
  y: number;
  size: number;
  opacity: number;
  driftX: number;
  driftY: number;
  duration: number;
  createdAt: number;
}

@Component({
  selector: "app-ambient-particles",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./ambient-particles.component.html",
  styleUrls: ["./ambient-particles.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AmbientParticlesComponent implements AfterViewInit, OnDestroy {
  @Input() reduceMotion = false;
  @ViewChild("layer", { static: true })
  private readonly layer?: ElementRef<HTMLDivElement>;

  readonly particles = signal<AmbientParticle[]>([]);

  private readonly intensityService = inject(BattleVfxIntensityService, {
    optional: true
  });
  private readonly vfxRng = inject(RngService).fork("vfx-ambient");
  private intensity = 0;
  private intensitySub?: Subscription;
  private frameHandle?: number;
  private frameTimer?: ReturnType<typeof setTimeout>;
  private lastTick = 0;
  private tickIntervalMs = 120;
  private running = false;
  private fpsWindowStart = 0;
  private framesInWindow = 0;
  private lastFpsWarning = 0;
  private readonly showPerfWarnings =
    typeof ngDevMode === "undefined" || !!ngDevMode;
  private particleCounter = 0;
  private readonly budget = inject(VfxBudgetService);

  ngAfterViewInit(): void {
    if (this.intensityService) {
      this.intensitySub = this.intensityService.intensity$.subscribe(value => {
        this.intensity = this.clamp01(value);
      });
    }
    this.tickIntervalMs = this.reduceMotion ? 200 : 120;
    this.startLoop();
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.intensitySub?.unsubscribe();
  }

  private startLoop(): void {
    if (this.running) return;
    this.running = true;
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    this.lastTick = now;
    this.fpsWindowStart = now;
    const step = (timestamp: number) => {
      if (!this.running) return;
      const time = Number.isFinite(timestamp) ? timestamp : Date.now();
      if (time - this.lastTick >= this.tickIntervalMs) {
        this.lastTick = time;
        this.tick();
      }
      this.trackFps(time);
      this.scheduleFrame(step);
    };
    this.scheduleFrame(step);
  }

  private stopLoop(): void {
    this.running = false;
    if (this.frameHandle && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this.frameHandle);
    }
    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
    }
    this.frameHandle = undefined;
    this.frameTimer = undefined;
  }

  private scheduleFrame(callback: FrameRequestCallback): void {
    if (typeof requestAnimationFrame === "function") {
      this.frameHandle = requestAnimationFrame(callback);
      return;
    }
    this.frameTimer = setTimeout(
      () => callback(Date.now()),
      this.tickIntervalMs
    );
  }

  private trackFps(now: number): void {
    if (!this.showPerfWarnings) return;
    this.framesInWindow += 1;
    const elapsed = now - this.fpsWindowStart;
    if (elapsed < 2000) return;
    const fps = (this.framesInWindow / elapsed) * 1000;
    if (fps < 30 && now - this.lastFpsWarning > 5000) {
      console.warn(
        `[ambient-particles] Low FPS detected: ${fps.toFixed(1)}`
      );
      this.lastFpsWarning = now;
    }
    this.framesInWindow = 0;
    this.fpsWindowStart = now;
  }

  private tick(): void {
    const rect = this.layerRect();
    if (rect.width <= 1 || rect.height <= 1) return;

    const now = Date.now();
    const caps = this.budget.getCaps(this.intensity, this.reduceMotion);
    let cap = Math.max(4, caps.maxAmbientParticles);
    if (this.reduceMotion) {
      cap = Math.min(14, cap);
    }
    const active = this.particles()
      .filter(item => now - item.createdAt < item.duration)
      .slice(-cap);

    const target = Math.min(cap, this.targetCount(cap));
    const missing = Math.max(0, target - active.length);
    const spawnBudget = Math.min(missing, this.spawnBudget());
    const spawned = [];

    for (let i = 0; i < spawnBudget; i += 1) {
      spawned.push(this.spawnParticle(rect));
    }

    this.particles.set([...active, ...spawned]);
  }

  private spawnParticle(rect: { width: number; height: number }): AmbientParticle {
    const kind = this.chooseKind();
    const size =
      kind === "ember"
        ? this.randomInt(3, this.reduceMotion ? 4 : 6)
        : this.randomInt(1, this.reduceMotion ? 2 : 3);
    const x = this.randomInt(0, Math.max(1, rect.width - size));
    const y = this.randomInt(0, Math.max(1, rect.height - size));
    const duration =
      kind === "ember"
        ? this.randomInt(6200, 9800)
        : this.randomInt(4200, 7600);
    const driftScale = this.reduceMotion ? 0.15 : 1;
    const driftX =
      Math.round(this.randomFloat(-18, 18) * driftScale) || 0;
    const driftY =
      Math.round(this.randomFloat(-26, 26) * driftScale) || 0;
    const baseOpacity = kind === "ember" ? 0.25 : 0.18;
    const intensityLift = kind === "ember" ? 0.35 : 0.25;
    const opacity = this.clamp01(baseOpacity + this.intensity * intensityLift);

    return {
      id: `ambient-${++this.particleCounter}`,
      kind,
      x,
      y,
      size,
      opacity,
      driftX,
      driftY,
      duration,
      createdAt: Date.now()
    };
  }

  private chooseKind(): AmbientKind {
    const emberChance = 0.25 + this.intensity * 0.25;
    return this.vfxRng.nextFloat() < emberChance ? "ember" : "ash";
  }

  private targetCount(cap: number): number {
    const min = this.reduceMotion ? 4 : 6;
    return Math.max(min, Math.round(min + this.intensity * (cap - min)));
  }

  private spawnBudget(): number {
    if (this.reduceMotion) return 1;
    return Math.max(1, Math.round(1 + this.intensity * 2));
  }

  private layerRect(): { width: number; height: number } {
    const rect = this.layer?.nativeElement.getBoundingClientRect();
    if (!rect) return { width: 1, height: 1 };
    return { width: rect.width || 1, height: rect.height || 1 };
  }

  private clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  private randomInt(min: number, max: number): number {
    return Math.round(this.randomFloat(min, max));
  }

  private randomFloat(min: number, max: number): number {
    return min + this.vfxRng.nextFloat() * (max - min);
  }
}
