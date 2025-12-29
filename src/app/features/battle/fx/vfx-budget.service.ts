import { Injectable, inject } from "@angular/core";
import { VfxSettingsService } from "./vfx-settings.service";

export type VfxCaps = {
  maxAmbientParticles: number;
  maxProcBursts: number;
  maxTrails: number;
  maxOrbitersPerActor: number;
  maxPersistentOverlays: number;
};

@Injectable({ providedIn: "root" })
export class VfxBudgetService {
  private readonly settings = inject(VfxSettingsService, { optional: true });

  getCaps(intensity: number, reduceMotion = false): VfxCaps {
    const clamped = this.clamp01(intensity);
    const densityScale = this.settings?.densityScale() ?? 1;
    const scale = (reduceMotion ? 0.35 : 1) * densityScale;

    return {
      maxAmbientParticles: this.scaleCap(6, 60, clamped, scale),
      maxProcBursts: this.scaleCap(6, 32, clamped, scale),
      maxTrails: this.scaleCap(0, 14, clamped, scale),
      maxOrbitersPerActor: this.scaleCap(0, 6, clamped, scale),
      maxPersistentOverlays: this.scaleCap(2, 10, clamped, scale),
    };
  }

  private scaleCap(
    min: number,
    max: number,
    intensity: number,
    scale: number
  ): number {
    const lerped = min + (max - min) * intensity;
    return Math.max(0, Math.round(lerped * scale));
  }

  private clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }
}
