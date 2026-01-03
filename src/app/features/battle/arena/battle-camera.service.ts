import { Injectable, inject } from "@angular/core";
import { RngService } from "../../../core/services/rng.service";

@Injectable({ providedIn: "root" })
export class BattleCameraService {
  private readonly vfxRng = inject(RngService).fork("vfx-camera");
  private target: HTMLElement | null = null;
  private animation?: Animation;

  connect(target: HTMLElement | null): void {
    if (this.target === target) return;
    this.animation?.cancel();
    this.target?.style.removeProperty("transform");
    this.target = target;
  }

  disconnect(target: HTMLElement | null): void {
    if (!target || this.target !== target) return;
    this.animation?.cancel();
    this.target.style.removeProperty("transform");
    this.target = null;
  }

  shake(intensity: number, durationMs: number): void {
    if (!this.target) return;
    if (this.prefersReducedMotion()) return;

    const roundedIntensity = Math.round(intensity);
    if (roundedIntensity <= 0 || durationMs <= 0) return;
    const magnitude = Math.min(8, roundedIntensity);
    const duration = Math.min(600, Math.max(120, Math.round(durationMs)));

    this.animation?.cancel();
    this.target.style.removeProperty("transform");

    const keyframes = this.buildKeyframes(magnitude);
    this.animation = this.target.animate(keyframes, {
      duration,
      easing: "linear",
    });
    this.animation.onfinish = () => {
      this.animation = undefined;
      this.target?.style.removeProperty("transform");
    };
  }

  private buildKeyframes(magnitude: number): Keyframe[] {
    const frames: Keyframe[] = [{ transform: "translate(0px, 0px)" }];
    const steps = 6;
    for (let step = 0; step < steps; step += 1) {
      frames.push({
        transform: `translate(${this.randomOffset(magnitude)}px, ${this.randomOffset(magnitude)}px)`,
      });
    }
    frames.push({ transform: "translate(0px, 0px)" });
    return frames;
  }

  private randomOffset(magnitude: number): number {
    return Math.round((this.vfxRng.nextFloat() * 2 - 1) * magnitude);
  }

  private prefersReducedMotion(): boolean {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
}
