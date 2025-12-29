import { Injectable, inject } from "@angular/core";
import { ProfileStateService } from "../../../core/services/profile-state.service";

export type VfxDensity = "low" | "med" | "high";

@Injectable({ providedIn: "root" })
export class VfxSettingsService {
  private readonly profile = inject(ProfileStateService);

  density(): VfxDensity {
    return this.profile.settings().vfxDensity;
  }

  densityScale(): number {
    switch (this.density()) {
      case "low":
        return 0.75;
      case "high":
        return 1.2;
      default:
        return 1;
    }
  }

  shakeEnabled(): boolean {
    return this.profile.settings().screenShake;
  }

  reduceFlash(): boolean {
    return this.profile.settings().reducedFlash;
  }
}
