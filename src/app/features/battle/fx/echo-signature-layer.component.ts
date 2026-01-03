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
import { BattleFxAnchors } from "./battle-fx.types";
import { BattleVfxIntensityService } from "./battle-vfx-intensity.service";
import { PlayerStateService } from "../../../core/services/player-state.service";
import { VfxBudgetService } from "./vfx-budget.service";

export interface EchoSignaturePath {
  id: string;
  count: number;
  kind?: "origin" | "run" | "flex";
}

type SignatureTarget = "player" | "enemy";

@Component({
  selector: "app-echo-signature-layer",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./echo-signature-layer.component.html",
  styleUrls: ["./echo-signature-layer.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EchoSignatureLayerComponent implements OnDestroy {
  @Input({ required: true }) anchors!: BattleFxAnchors;
  @Input() reduceMotion = false;
  @Input() activePaths: EchoSignaturePath[] = [];
  @ViewChild("layer", { static: true })
  private readonly layer?: ElementRef<HTMLDivElement>;

  readonly intensity = signal(0);

  private readonly intensityService = inject(BattleVfxIntensityService, {
    optional: true
  });
  private readonly player = inject(PlayerStateService, { optional: true });
  private readonly budget = inject(VfxBudgetService);
  private intensitySub?: Subscription;

  constructor() {
    if (this.intensityService) {
      this.intensitySub = this.intensityService.intensity$.subscribe(value => {
        this.intensity.set(this.clamp01(value));
      });
    }
  }

  ngOnDestroy(): void {
    this.intensitySub?.unsubscribe();
  }

  signatureClass(path: EchoSignaturePath): string[] {
    const base = this.classForPath(path.id);
    const target = this.targetFor(path.id);
    const classes = [
      "signature",
      `signature--${base}`,
      `signature--${target}`
    ];
    if (path.kind) {
      classes.push(`signature--${path.kind}`);
    }
    if (base === "sentinel" && this.hasShield()) {
      classes.push("signature--shielded");
    }
    return classes;
  }

  signatureStyle(path: EchoSignaturePath): Record<string, string | number> {
    const target = this.targetFor(path.id);
    const point = this.pointFor(target);
    const intensity = this.reduceMotion ? this.intensity() * 0.35 : this.intensity();
    const countFactor = this.countFactor(path.count);
    const baseStrength = 0.12 + intensity * 0.68;
    const size = this.sizeFor(path.id);
    const scale = 0.9 + intensity * 0.2 + Math.min(path.count, 4) * 0.03;
    const offsetY = this.offsetFor(path.id);

    let strength = this.clamp01(baseStrength * countFactor);
    if (path.id === "Sentinel" && this.hasShield()) {
      strength = this.clamp01(strength + 0.12);
    }

    return {
      left: `${point.x}px`,
      top: `${point.y}px`,
      "--sig-strength": strength,
      "--sig-scale": scale,
      "--sig-size": `${size}px`,
      "--sig-offset-y": `${offsetY}px`,
      "--sig-count": Math.min(path.count, 4)
    };
  }

  visiblePaths(): EchoSignaturePath[] {
    const caps = this.budget.getCaps(this.intensity(), this.reduceMotion);
    const max = Math.max(1, caps.maxPersistentOverlays);
    if (this.activePaths.length <= max) return this.activePaths;
    return [...this.activePaths]
      .sort((a, b) => b.count - a.count)
      .slice(0, max);
  }

  showStack(path: EchoSignaturePath): boolean {
    if (path.count < 2) return false;
    const caps = this.budget.getCaps(this.intensity(), this.reduceMotion);
    return caps.maxPersistentOverlays > 2;
  }

  private targetFor(pathId: string): SignatureTarget {
    if (pathId === "Ruin") return "enemy";
    return "player";
  }

  private classForPath(pathId: string): string {
    return pathId.toLowerCase();
  }

  private offsetFor(pathId: string): number {
    if (pathId === "Ruin") return 24;
    if (pathId === "Colossus") return 8;
    return 0;
  }

  private sizeFor(pathId: string): number {
    switch (pathId) {
      case "Ruin":
        return 220;
      case "Colossus":
        return 190;
      case "Wrath":
        return 180;
      default:
        return 170;
    }
  }

  private countFactor(count: number): number {
    if (count <= 0) return 0.6;
    return Math.min(1, 0.6 + Math.min(count, 4) * 0.1);
  }

  private hasShield(): boolean {
    const attrs = this.player?.state().attributes;
    if (!attrs || !attrs.maxPosture) return false;
    return attrs.posture >= attrs.maxPosture * 0.55;
  }

  private pointFor(side: SignatureTarget): { x: number; y: number } {
    const rect = this.layerRect();
    const anchor = this.anchors?.[side]?.origin ?? { x: 50, y: 50 };
    const x = Math.round((anchor.x / 100) * rect.width);
    const y = Math.round((anchor.y / 100) * rect.height);
    return { x, y };
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
}
