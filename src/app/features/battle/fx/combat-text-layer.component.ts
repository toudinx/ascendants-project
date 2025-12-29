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
import { BattleFxAnchors, BattleFxEvent, Point } from "./battle-fx.types";
import { BattleFxBusService } from "./battle-fx-bus.service";
import { VFX_TIMING } from "./vfx-timing.config";
import { VfxSettingsService } from "./vfx-settings.service";

type TargetSide = "player" | "enemy";

type CombatTextTone = "normal" | "crit" | "dot";

interface CombatTextEntry {
  id: string;
  target: TargetSide;
  tone: CombatTextTone;
  amount: number;
  stacks?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
  popScale: number;
  popOvershoot: number;
  popY: number;
  midY: number;
  fallY: number;
  fontSize: number;
  lineHeight: number;
  padX: number;
  padY: number;
  tagFontSize: number;
  tagPadX: number;
  tagPadY: number;
  tagGap: number;
  tagChipGap: number;
}

@Component({
  selector: "app-combat-text-layer",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./combat-text-layer.component.html",
  styleUrls: ["./combat-text-layer.component.scss"]
})
export class CombatTextLayerComponent implements OnDestroy {
  @Input({ required: true }) anchors!: BattleFxAnchors;
  @Input() reduceMotion = false;
  @ViewChild("layer", { static: true })
  private readonly layer?: ElementRef<HTMLDivElement>;

  readonly entries = signal<CombatTextEntry[]>([]);

  private readonly bus = inject(BattleFxBusService);
  private readonly settings = inject(VfxSettingsService, { optional: true });
  private readonly subscriptions = new Subscription();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private entryCounter = 0;

  constructor() {
    this.subscriptions.add(
      this.bus.events$.subscribe(event => {
        if (event.kind === "floatText") {
          this.handleTextEvent(event);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.subscriptions.unsubscribe();
  }

  remove(id: string): void {
    this.clearTimer(id);
    this.entries.update(list => list.filter(item => item.id !== id));
  }

  labelFor(entry: CombatTextEntry): string {
    return this.valueLabel(entry.amount);
  }

  private handleTextEvent(event: Extract<BattleFxEvent, { kind: "floatText" }>): void {
    const target = event.target;
    const tone = this.toneFor(event);

    const point = this.resolvePoint(event.at, target);
    const duration = this.textDuration(tone);
    const pop = this.popProfile(tone);
    const fall = this.fallProfile(tone);
    const metrics = this.fontMetrics(tone);
    const size = this.estimateEntrySize(event, metrics);
    const placement = this.placeEntry(point, target, size, fall);
    const entry: CombatTextEntry = {
      id: `text-${++this.entryCounter}`,
      target,
      tone,
      amount: event.amount,
      stacks: event.stacks,
      x: placement.x,
      y: placement.y,
      width: size.width,
      height: size.height,
      duration,
      popScale: pop.scale,
      popOvershoot: pop.overshoot,
      popY: fall.popY,
      midY: fall.midY,
      fallY: fall.fallY,
      fontSize: size.fontSize,
      lineHeight: size.lineHeight,
      padX: size.padX,
      padY: size.padY,
      tagFontSize: size.tagFontSize,
      tagPadX: size.tagPadX,
      tagPadY: size.tagPadY,
      tagGap: size.tagGap,
      tagChipGap: size.tagChipGap
    };

    this.entries.update(list => this.appendEntry(list, entry));
    const timer = setTimeout(() => this.remove(entry.id), duration + 80);
    this.timers.set(entry.id, timer);
  }

  private resolvePoint(point: Point | undefined, side: TargetSide): { x: number; y: number } {
    if (
      point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    ) {
      return { x: Math.round(point.x), y: Math.round(point.y) };
    }
    return this.pointFor(side);
  }

  private pointFor(side: TargetSide): { x: number; y: number } {
    const rect = this.layerRect();
    const anchor = this.anchors?.[side]?.impact ?? { x: 50, y: 50 };
    const x = Math.round((anchor.x / 100) * rect.width);
    const y = Math.round((anchor.y / 100) * rect.height);
    return { x, y };
  }

  private layerRect(): { width: number; height: number } {
    const rect = this.layer?.nativeElement.getBoundingClientRect();
    if (!rect) return { width: 1, height: 1 };
    return { width: rect.width || 1, height: rect.height || 1 };
  }

  private toneFor(event: Extract<BattleFxEvent, { kind: "floatText" }>): CombatTextTone {
    if (event.dot) return "dot";
    if (event.crit) return "crit";
    return "normal";
  }

  private textDuration(tone: CombatTextTone): number {
    const base =
      tone === "crit"
        ? VFX_TIMING.combatText.critMs
        : tone === "dot"
          ? VFX_TIMING.combatText.dotMs
          : VFX_TIMING.combatText.normalMs;
    if (!this.reduceMotion) return base;
    return Math.max(1400, Math.round(base * 0.85));
  }

  private popProfile(tone: CombatTextTone): { scale: number; overshoot: number } {
    if (tone === "crit") {
      return { scale: 0.78, overshoot: 1.14 };
    }
    if (tone === "dot") {
      return { scale: 0.9, overshoot: 1.04 };
    }
    return { scale: 0.86, overshoot: 1.08 };
  }

  private fallProfile(tone: CombatTextTone): { popY: number; midY: number; fallY: number } {
    const fallBase = tone === "crit" ? 110 : tone === "dot" ? 118 : 96;
    const midBase = tone === "crit" ? 22 : tone === "dot" ? 24 : 18;
    const popBase = tone === "crit" ? -16 : tone === "dot" ? -14 : -12;
    if (this.reduceMotion) {
      return {
        popY: Math.round(popBase * 0.55),
        midY: Math.round(midBase * 0.5),
        fallY: Math.round(fallBase * 0.45)
      };
    }
    return {
      popY: popBase,
      midY: midBase,
      fallY: fallBase
    };
  }

  private fontMetrics(tone: CombatTextTone): {
    fontSize: number;
    lineHeight: number;
    padX: number;
    padY: number;
    tagFontSize: number;
    tagPadX: number;
    tagPadY: number;
    tagGap: number;
    tagChipGap: number;
    tagRowHeight: number;
  } {
    const rect = this.layerRect();
    const clampFont = (min: number, vw: number, max: number): number => {
      const px = (vw / 100) * rect.width;
      return Math.round(this.clampFloat(px, min, max));
    };
    let fontSize = clampFont(22, 2.2, 34);
    if (tone === "crit") {
      fontSize = clampFont(28, 2.8, 44);
    } else if (tone === "dot") {
      fontSize = clampFont(20, 2.0, 30);
    }
    const lineHeight = Math.round(fontSize * 1.15);
    const padX = Math.max(12, Math.round(fontSize * 0.7));
    const padY = Math.max(6, Math.round(fontSize * 0.3));
    const tagFontSize = Math.max(15, Math.round(fontSize * 0.7));
    const tagPadX = Math.max(6, Math.round(tagFontSize * 0.6));
    const tagPadY = Math.max(3, Math.round(tagFontSize * 0.3));
    const tagGap = Math.max(6, Math.round(fontSize * 0.2));
    const tagChipGap = Math.max(6, Math.round(tagFontSize * 0.35));
    const tagRowHeight = tagFontSize + tagPadY * 2;
    return {
      fontSize,
      lineHeight,
      padX,
      padY,
      tagFontSize,
      tagPadX,
      tagPadY,
      tagGap,
      tagChipGap,
      tagRowHeight
    };
  }

  private estimateEntrySize(
    event: Extract<BattleFxEvent, { kind: "floatText" }>,
    metrics: {
      fontSize: number;
      lineHeight: number;
      padX: number;
      padY: number;
      tagFontSize: number;
      tagPadX: number;
      tagPadY: number;
      tagGap: number;
      tagChipGap: number;
      tagRowHeight: number;
    }
  ): {
    width: number;
    height: number;
    fontSize: number;
    lineHeight: number;
    padX: number;
    padY: number;
    tagFontSize: number;
    tagPadX: number;
    tagPadY: number;
    tagGap: number;
    tagChipGap: number;
  } {
    const valueText = this.valueLabel(event.amount);
    const valueWidth = valueText.length * metrics.fontSize * 0.62;
    let tagWidth = 0;
    let tagCount = 0;
    if (event.stacks) {
      tagWidth += this.tagWidth(
        `x${event.stacks}`,
        metrics.tagFontSize,
        metrics.tagPadX
      );
      tagCount += 1;
    }
    const tagRowWidth =
      tagCount > 0 ? tagWidth + metrics.tagChipGap * (tagCount - 1) : 0;
    const contentWidth = Math.max(valueWidth, tagRowWidth);
    const width = Math.round(metrics.padX * 2 + contentWidth);
    const tagHeight = tagCount > 0 ? metrics.tagRowHeight + metrics.tagGap : 0;
    const height = Math.round(
      metrics.padY * 2 + metrics.lineHeight + tagHeight
    );
    return {
      width,
      height,
      fontSize: metrics.fontSize,
      lineHeight: metrics.lineHeight,
      padX: metrics.padX,
      padY: metrics.padY,
      tagFontSize: metrics.tagFontSize,
      tagPadX: metrics.tagPadX,
      tagPadY: metrics.tagPadY,
      tagGap: metrics.tagGap,
      tagChipGap: metrics.tagChipGap
    };
  }

  private placeEntry(
    point: { x: number; y: number },
    target: TargetSide,
    size: { width: number; height: number; fontSize: number; lineHeight: number },
    fall: { popY: number; midY: number; fallY: number }
  ): { x: number; y: number } {
    const rect = this.layerRect();
    const padding = 6;
    const minX = Math.round(size.width / 2 + padding);
    const maxX = Math.round(rect.width - size.width / 2 - padding);
    const minY = Math.round(padding + Math.max(0, -fall.popY));
    const maxY = Math.round(
      rect.height - size.height - padding - Math.max(0, fall.fallY)
    );
    const jitterX = this.randomInt(this.reduceMotion ? -4 : -8, this.reduceMotion ? 4 : 8);
    const jitterY = this.randomInt(this.reduceMotion ? -3 : -6, this.reduceMotion ? 3 : 6);
    const lanes = this.rotateLanes(this.laneOffsets(size.fontSize));
    const existing = this.entries().filter(item => item.target === target);
    let fallback: { x: number; y: number } | null = null;

    for (const lane of lanes) {
      let x = this.clampInt(Math.round(point.x + lane + jitterX), minX, maxX);
      let y = this.clampInt(Math.round(point.y + jitterY), minY, maxY);
      let attempts = 0;
      let placed = false;
      while (attempts <= 8) {
        const rectCandidate = this.entryRect(x, y, size.width, size.height);
        const collision = existing.some(item =>
          this.rectsOverlap(
            rectCandidate,
            this.entryRect(item.x, item.y, item.width, item.height)
          )
        );
        if (!collision) {
          placed = true;
          break;
        }
        const nextY = y - size.lineHeight;
        if (nextY < minY) break;
        y = nextY;
        attempts += 1;
      }
      if (!fallback) {
        fallback = { x, y };
      }
      if (placed) {
        return { x, y };
      }
    }

    if (fallback) return fallback;
    return {
      x: this.clampInt(point.x, minX, maxX),
      y: this.clampInt(point.y, minY, maxY)
    };
  }

  private laneOffsets(fontSize: number): number[] {
    const base = [0, -30, 30, -60, 60];
    const scale = fontSize / 28;
    const scaled = base.map(offset => Math.round(offset * scale));
    return this.reduceMotion ? scaled.slice(0, 3) : scaled;
  }

  private rotateLanes(lanes: number[]): number[] {
    if (lanes.length <= 1) return lanes;
    const start = this.entryCounter % lanes.length;
    return lanes.slice(start).concat(lanes.slice(0, start));
  }

  private entryRect(
    x: number,
    y: number,
    width: number,
    height: number
  ): { left: number; right: number; top: number; bottom: number } {
    const half = width / 2;
    return {
      left: x - half,
      right: x + half,
      top: y,
      bottom: y + height
    };
  }

  private rectsOverlap(
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number }
  ): boolean {
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  }

  private appendEntry(
    list: CombatTextEntry[],
    entry: CombatTextEntry
  ): CombatTextEntry[] {
    const cap = this.maxActiveEntries();
    let next = [...list, entry];
    if (next.length > cap) {
      const dropCount = next.length - cap;
      const dropped = next.slice(0, dropCount);
      dropped.forEach(item => this.clearTimer(item.id));
      next = next.slice(dropCount);
    }
    return next;
  }

  private maxActiveEntries(): number {
    const densityScale = this.settings?.densityScale() ?? 1;
    const motionScale = this.reduceMotion ? 0.35 : 1;
    const base = 40;
    const scaled = Math.round(base * densityScale * motionScale);
    const capped = Math.min(45, Math.max(10, scaled));
    return this.reduceMotion ? Math.min(14, capped) : capped;
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }

  private randomInt(min: number, max: number): number {
    return Math.round(min + Math.random() * (max - min));
  }

  private tagWidth(text: string, fontSize: number, paddingX: number): number {
    const charWidth = fontSize * 0.6;
    return Math.round(text.length * charWidth + paddingX * 2);
  }

  private valueLabel(amount: number): string {
    const sign = amount >= 0 ? "-" : "+";
    return `${sign}${Math.abs(amount)}`;
  }

  private clampFloat(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private clampInt(value: number, min: number, max: number): number {
    if (min > max) return Math.round(min);
    return Math.round(Math.min(Math.max(value, min), max));
  }
}
