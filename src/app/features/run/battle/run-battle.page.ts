import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from "@angular/core";
import { RunStateService } from "../../../core/services/run-state.service";
import { BattleEngineService } from "../../../core/services/battle-engine.service";
import {
  UiStateService,
  FloatEvent,
  LogKind,
  UiLogEntry,
} from "../../../core/services/ui-state.service";
import { PlayerStateService } from "../../../core/services/player-state.service";
import { EnemyStateService } from "../../../core/services/enemy-state.service";
import { RunDebugPanelComponent } from "../../../shared/components";
import {
  EVOLUTION_VISUALS,
  EvolutionVisual,
  EvolutionVisualKey,
} from "../../../core/models/evolution-visual.model";

type ActorKey = "player" | "enemy";
type FxTone = "dmg" | "crit" | "dot" | "posture";
type TimelineActor = "player" | "enemy" | "system";
type LogTone = TimelineActor | LogKind;
type ImpactTone =
  | "hit-sm"
  | "hit-lg"
  | "hit-dot"
  | "hit-posture"
  | "crit-flare"
  | "break"
  | "superbreak";

interface AttackFx {
  id: string;
  from: ActorKey;
  to: ActorKey;
  tone: FxTone;
}

interface TurnLogEvent {
  id: string;
  text: string;
  icon: string;
  tone: LogTone;
  kind?: LogKind;
  target?: ActorKey;
  value?: number;
}

type SummaryTone =
  | "damage"
  | "dot"
  | "posture"
  | "break"
  | "superbreak"
  | "neutral";

interface TurnSummaryChip {
  text: string;
  tone: SummaryTone;
}

interface TurnLogGroup {
  id: string;
  number: number;
  actor: TimelineActor;
  actorLabel: string;
  events: TurnLogEvent[];
  summary: TurnSummaryChip[];
  isLatest?: boolean;
}

@Component({
  selector: "app-run-battle-page",
  standalone: true,
  imports: [CommonModule, RunDebugPanelComponent],
  templateUrl: "./run-battle.page.html",
  styleUrls: ["./run-battle.page.scss"],
})
export class RunBattlePageComponent implements OnInit, OnDestroy {
  readonly run = inject(RunStateService);
  private readonly battle = inject(BattleEngineService);
  readonly ui = inject(UiStateService);
  readonly player = inject(PlayerStateService);
  readonly enemy = inject(EnemyStateService);

  readonly attackFx = signal<AttackFx[]>([]);
  readonly visibleFloats = signal<FloatEvent[]>([]);
  readonly dotStacks = signal<Record<ActorKey, number>>({
    player: 0,
    enemy: 0,
  });
  readonly impactFlags = signal<
    Record<ActorKey, Partial<Record<ImpactTone, boolean>>>
  >({
    player: {},
    enemy: {},
  });
  readonly hitPauseActive = signal(false);
  readonly evolutionOverlay = signal<EvolutionVisual | null>(null);

  autoplay = true;
  paused = false;
  logOpen = true;
  awaitingPlayer = false;

  private readonly processedFloatIds = new Set<string>();
  private lastTurnRef = "";
  private manualActionTurn = 0;
  private autoSkillQueuedForTurn: number | null = null;
  private lastLogId: string | null = null;
  prefersReducedMotion = false;
  private prevPlayerStatus = this.player.state().status;
  private prevEnemyState = this.enemy.enemy().state;
  private lastEvolutionKey: EvolutionVisualKey | null = null;
  @ViewChild("logBody") logBody?: ElementRef<HTMLDivElement>;
  private collapsedTurns = new Set<string>();

  private readonly actorPositions: Record<
    ActorKey,
    { x: number; y: number; floatY: number }
  > = {
    player: { x: 24, y: 62, floatY: 44 },
    enemy: { x: 76, y: 62, floatY: 42 },
  };

  private readonly turnWatcher = effect(
    () => {
      const turn = this.battle.currentTurn();
      this.onTurnChange(turn);
      this.handleManualGate(turn);
      this.queueAutoSkill(turn);
    },
    { allowSignalWrites: true }
  );

  private readonly floatWatcher = effect(
    () => {
      this.processFloatEvents(this.ui.state().floatEvents);
    },
    { allowSignalWrites: true }
  );

  private readonly logWatcher = effect(
    () => {
      this.trackDotFromLog(this.ui.state().logs);
      this.scrollLogToLatest();
      this.ensureLatestTurnExpanded();
    },
    { allowSignalWrites: true }
  );

  private readonly breakWatcher = effect(
    () => {
      this.detectBreakChanges();
    },
    { allowSignalWrites: true }
  );

  private readonly evolutionWatcher = effect(
    () => {
      this.handleEvolutionChange(this.run.activeEvolutionVisual());
    },
    { allowSignalWrites: true }
  );

  ngOnInit(): void {
    this.awaitingPlayer = !this.autoplay;
    this.prefersReducedMotion = this.getPrefersReducedMotion();
    this.ensureLoop();
  }

  ngOnDestroy(): void {
    this.battle.stopLoop();
    this.turnWatcher.destroy();
    this.floatWatcher.destroy();
    this.logWatcher.destroy();
    this.breakWatcher.destroy();
    this.evolutionWatcher.destroy();
  }

  get currentRoom(): number {
    return this.run.currentRoom() || 1;
  }

  get totalRooms(): number {
    return this.run.totalRooms() || 7;
  }

  get playerState() {
    return this.player.state();
  }

  get enemyState() {
    return this.enemy.enemy();
  }

  get turnTimeline(): TurnLogGroup[] {
    const map = new Map<number, TurnLogGroup>();
    const logs = this.ui.state().logs;

    for (const entry of logs) {
      if (entry.turn <= 0) continue;
      if (!map.has(entry.turn)) {
        map.set(entry.turn, {
          id: `turn-${entry.turn}`,
          number: entry.turn,
          actor: entry.actor,
          actorLabel: this.actorLabel(entry.actor),
          events: [],
          summary: [],
        });
      }
      const group = map.get(entry.turn)!;
      group.events.push(this.formatLogEvent(entry));
      group.actor = entry.actor;
      group.actorLabel = this.actorLabel(entry.actor);
    }

    const groups = Array.from(map.values()).sort((a, b) => b.number - a.number);
    groups.forEach((group, index) => {
      group.summary = this.buildTurnSummary(group.events);
      group.isLatest = index === 0;
    });
    return groups;
  }

  get isPlayerBroken(): boolean {
    return this.playerState.status === "broken";
  }

  get isPlayerSuperBroken(): boolean {
    return this.playerState.status === "superbroken";
  }

  get isEnemyBroken(): boolean {
    return this.enemyState.state === "broken";
  }

  get isEnemySuperBroken(): boolean {
    return this.enemyState.state === "superbroken";
  }

  get enemyPreparing(): boolean {
    return (
      this.enemyState.state === "preparing" ||
      !!this.enemyState.attributes.strongAttackReady
    );
  }

  get playerName(): string {
    return this.playerState.kaelisName || "Kaelis";
  }

  get playerSprite(): string {
    return (
      this.playerState.kaelisSprite ||
      "assets/battle/characters/velvet/velvet_battle_default.png"
    );
  }

  get skillCooldown(): number {
    return this.playerState.skillCooldown ?? 0;
  }

  get skillCost(): number {
    return this.player.state().kit.skillEnergyCost;
  }

  get cooldownMaxTurns(): number {
    return this.player.state().kit.skillCooldownTurns;
  }

  get skillOnCooldown(): boolean {
    return this.skillCooldown > 0;
  }

  get skillEnergyBlocked(): boolean {
    return this.playerState.attributes.energy < this.skillCost;
  }

  get skillReady(): boolean {
    return this.battle.canUseActiveSkill() && !this.paused;
  }

  get skillCooldownRatio(): number {
    if (!this.skillOnCooldown) return 0;
    const maxTurns = Math.max(1, this.cooldownMaxTurns);
    return Math.min(1, this.skillCooldown / maxTurns);
  }

  get skillButtonEnabled(): boolean {
    if (this.paused || this.run.phase() !== "battle") return false;
    if (!this.autoplay && !this.awaitingPlayer) return false;
    return this.skillReady;
  }

  get activeEvolutionKey(): EvolutionVisualKey | null {
    return this.run.activeEvolutionVisual();
  }

  get activeEvolution(): EvolutionVisual | null {
    const key = this.activeEvolutionKey;
    return key ? EVOLUTION_VISUALS[key] : null;
  }

  get hasBattleActors(): boolean {
    return (
      !!this.player.state()?.attributes && !!this.enemy.enemy()?.attributes
    );
  }

  get manualActionReady(): boolean {
    return (
      !this.autoplay &&
      !this.paused &&
      this.awaitingPlayer &&
      this.run.phase() === "battle"
    );
  }

  togglePause(): void {
    if (this.paused) {
      this.paused = false;
      this.ensureLoop();
    } else {
      this.paused = true;
      this.battle.stopLoop();
    }
  }

  toggleAutoplay(): void {
    this.autoplay = !this.autoplay;
    const turn = this.battle.currentTurn();
    this.manualActionTurn = turn.number;
    this.awaitingPlayer = !this.autoplay ? turn.actor === "player" : false;
    if (this.paused) return;
    if (this.autoplay) {
      this.ensureLoop();
    } else if (!this.awaitingPlayer) {
      this.ensureLoop();
    } else {
      this.battle.stopLoop();
    }
  }

  toggleLog(): void {
    this.logOpen = !this.logOpen;
  }

  toggleTurnCollapse(id: string): void {
    if (this.collapsedTurns.has(id)) {
      this.collapsedTurns.delete(id);
    } else {
      this.collapsedTurns.add(id);
    }
  }

  isTurnCollapsed(id: string): boolean {
    return this.collapsedTurns.has(id);
  }

  handleAutoAttack(): void {
    if (!this.manualActionReady) return;
    this.awaitingPlayer = false;
    this.manualActionTurn = this.battle.currentTurn().number;
    this.ensureLoop();
  }

  handleActiveSkill(): void {
    if (!this.skillButtonEnabled) return;
    this.battle.triggerActiveSkill();
    if (!this.autoplay) {
      this.awaitingPlayer = false;
      this.manualActionTurn = this.battle.currentTurn().number;
    }
    this.ensureLoop();
  }

  abandonRun(): void {
    this.battle.stopLoop();
    this.paused = false;
    this.run.fleeRun();
  }

  hasDot(target: ActorKey): boolean {
    return (this.dotStacks()[target] ?? 0) > 0;
  }

  meterWidth(current: number, max: number): string {
    if (max <= 0) return "0%";
    return `${Math.max(0, Math.min(100, Math.round((current / max) * 100)))}%`;
  }

  isHpLow(current: number, max: number): boolean {
    if (max <= 0) return false;
    return current / max <= 0.25;
  }

  isPostureLow(current: number, max: number): boolean {
    if (max <= 0) return false;
    return current / max <= 0.2;
  }

  hasImpact(actor: ActorKey, tone: ImpactTone): boolean {
    return !!this.impactFlags()[actor]?.[tone];
  }

  onImpactAnimationEnd(actor: ActorKey, event: AnimationEvent): void {
    if (event.target !== event.currentTarget) return;
    const tone = this.animationToneFor(event.animationName);
    if (!tone) return;
    this.clearImpactTone(actor, tone);
  }

  trackFloat(_: number, item: FloatEvent): string {
    return item.id;
  }

  trackFx(_: number, item: AttackFx): string {
    return item.id;
  }

  trackTurn(_: number, item: TurnLogGroup): string {
    return item.id;
  }

  trackTurnEvent(_: number, item: TurnLogEvent): string {
    return item.id;
  }

  positionFor(actor: ActorKey): { x: string; y: string } {
    const pos = this.actorPositions[actor];
    return { x: `${pos.x}%`, y: `${pos.y}%` };
  }

  floatTone(event: FloatEvent): string {
    if (this.isHeal(event)) return "heal";
    if (event.type === "crit") return "crit";
    if (event.type === "dot") return "dot";
    if (event.type === "posture") return "posture";
    return "dmg";
  }

  floatPosition(event: FloatEvent): { x: string; y: string } {
    const target: ActorKey = event.target === "player" ? "player" : "enemy";
    const pos = this.actorPositions[target];
    const offset = this.floatOffset(event, target);
    const jitter = this.floatJitter(event.id);
    return {
      x: `calc(${pos.x}% + ${offset.x}px)`,
      y: `calc(${pos.floatY + jitter}% + ${offset.y}px)`,
    };
  }

  removeFloat(id: string): void {
    this.visibleFloats.update((list) => list.filter((item) => item.id !== id));
  }

  removeFx(id: string): void {
    this.attackFx.update((list) => list.filter((item) => item.id !== id));
  }

  private scrollLogToLatest(): void {
    if (!this.logBody) return;
    const latestId = this.latestTurnGroupId();
    if (!latestId) return;
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (fn: FrameRequestCallback) => fn(0);
    raf(() => {
      const container = this.logBody?.nativeElement;
      if (!container) return;
      const target = container.querySelector<HTMLElement>(
        `[data-turn-id="${latestId}"]`
      );
      if (!target) {
        container.scrollTop = 0;
        return;
      }
      container.scrollTop = Math.max(target.offsetTop - 8, 0);
    });
  }

  private onTurnChange(turn: { number: number; actor: TimelineActor }): void {
    const key = `${turn.number}-${turn.actor}`;
    if (this.lastTurnRef === key) {
      return;
    }
    this.lastTurnRef = key;
    if (turn.actor !== "player") {
      this.autoSkillQueuedForTurn = null;
    }
  }

  private handleManualGate(turn: {
    number: number;
    actor: TimelineActor;
  }): void {
    if (this.autoplay || this.paused) {
      return;
    }
    if (this.awaitingPlayer) {
      this.battle.stopLoop();
      return;
    }
    if (turn.actor === "player" && turn.number > this.manualActionTurn) {
      this.awaitingPlayer = true;
      this.battle.stopLoop();
    }
  }

  private queueAutoSkill(turn: { number: number; actor: TimelineActor }): void {
    if (!this.autoplay || this.paused || this.run.phase() !== "battle") return;
    if (turn.actor !== "player") return;
    if (!this.battle.canUseActiveSkill()) return;
    if (this.autoSkillQueuedForTurn === turn.number) return;
    this.autoSkillQueuedForTurn = turn.number;
    this.battle.triggerActiveSkill();
  }

  private ensureLoop(): void {
    if (this.paused || this.run.phase() !== "battle") {
      return;
    }
    if (this.autoplay || (!this.autoplay && !this.awaitingPlayer)) {
      this.battle.startLoop();
    }
  }

  private processFloatEvents(floats: FloatEvent[]): void {
    if (!floats?.length) return;
    for (const event of floats) {
      if (!event?.id || !event.target) continue;
      const target = event.target as ActorKey;
      if (this.processedFloatIds.has(event.id)) continue;
      this.processedFloatIds.add(event.id);
      this.spawnAttackFx(event);
      this.visibleFloats.update((list) => [...list, event].slice(-10));
      this.enqueueImpactFromFloat(event);
      if (event.type === "dot") {
        this.dotStacks.update((state) => ({
          ...state,
          [target]: Math.max(0, (state[target] ?? 0) - 1),
        }));
      }
    }
  }

  private spawnAttackFx(event: FloatEvent): void {
    const to: ActorKey = event.target === "player" ? "player" : "enemy";
    const from: ActorKey = to === "enemy" ? "player" : "enemy";
    const tone = this.fxTone(event);
    const entry: AttackFx = {
      id: `${event.id}-fx`,
      from,
      to,
      tone,
    };
    this.attackFx.update((list) => [...list, entry].slice(-12));
  }

  private fxTone(event: FloatEvent): FxTone {
    if (event.type === "crit") return "crit";
    if (event.type === "dot") return "dot";
    if (event.type === "posture") return "posture";
    return "dmg";
  }

  private trackDotFromLog(logs: UiLogEntry[]): void {
    const latest = logs.length ? logs[0] : undefined;
    if (!latest || latest.id === this.lastLogId) return;
    this.lastLogId = latest.id;
    const lower = latest.text.toLowerCase();
    if (lower.includes("dot applied")) {
      this.dotStacks.update((state) => ({ ...state, enemy: 2 }));
    }
    if (lower.includes("suffered dot")) {
      this.dotStacks.update((state) => ({ ...state, player: 2 }));
    }
  }

  private enqueueImpactFromFloat(event: FloatEvent): void {
    const actor: ActorKey = event.target === "player" ? "player" : "enemy";
    if (event.type === "crit") {
      this.triggerImpact(actor, "hit-lg");
      this.triggerImpact(actor, "crit-flare");
      this.triggerHitPause(2);
    } else if (event.type === "dmg") {
      this.triggerImpact(actor, "hit-sm");
    } else if (event.type === "dot") {
      this.triggerImpact(actor, "hit-dot");
    } else if (event.type === "posture") {
      this.triggerImpact(actor, "hit-posture");
    }
  }

  private detectBreakChanges(): void {
    const playerStatus = this.player.state().status;
    const enemyState = this.enemy.enemy().state;

    if (playerStatus !== this.prevPlayerStatus && playerStatus) {
      this.handleBreakCue("player", playerStatus);
      this.prevPlayerStatus = playerStatus;
    }

    if (enemyState !== this.prevEnemyState && enemyState) {
      this.handleBreakCue("enemy", enemyState);
      this.prevEnemyState = enemyState;
    }
  }

  private handleBreakCue(actor: ActorKey, status: unknown): void {
    if (status === "superbroken") {
      this.triggerImpact(actor, "superbreak");
      this.triggerHitPause(4);
    } else if (status === "broken") {
      this.triggerImpact(actor, "break");
      this.triggerHitPause(3);
    }
  }

  private triggerImpact(actor: ActorKey, tone: ImpactTone): void {
    if (this.prefersReducedMotion) return;
    const snapshot = this.impactFlags();
    const actorFlags = { ...(snapshot[actor] ?? {}) };
    actorFlags[tone] = false;
    this.impactFlags.set({ ...snapshot, [actor]: actorFlags });
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (fn: FrameRequestCallback) => fn(0);
    raf(() => {
      const next = this.impactFlags();
      const flags = { ...(next[actor] ?? {}) };
      flags[tone] = true;
      this.impactFlags.set({ ...next, [actor]: flags });
    });
  }

  private clearImpactTone(actor: ActorKey, tone: ImpactTone): void {
    const snapshot = this.impactFlags();
    const flags = { ...(snapshot[actor] ?? {}) };
    if (!flags[tone]) return;
    delete flags[tone];
    this.impactFlags.set({ ...snapshot, [actor]: flags });
  }

  private animationToneFor(name: string): ImpactTone | null {
    switch (name) {
      case "hit-shake-sm":
        return "hit-sm";
      case "hit-shake-lg":
        return "hit-lg";
      case "hit-tick":
        return "hit-dot";
      case "hit-posture":
        return "hit-posture";
      case "crit-flare":
        return "crit-flare";
      case "break-pulse":
        return "break";
      case "superbreak-pulse":
        return "superbreak";
      default:
        return null;
    }
  }

  private triggerHitPause(frames: number): void {
    if (this.prefersReducedMotion || this.paused || frames <= 0) return;
    this.hitPauseActive.set(true);
    let remaining = frames;
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (fn: FrameRequestCallback) => fn(0);
    const step = () => {
      remaining -= 1;
      if (remaining <= 0) {
        this.hitPauseActive.set(false);
        return;
      }
      raf(step);
    };
    raf(step);
  }

  private getPrefersReducedMotion(): boolean {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private handleEvolutionChange(key: EvolutionVisualKey | null): void {
    if (!key) {
      this.lastEvolutionKey = null;
      this.evolutionOverlay.set(null);
      return;
    }
    if (this.lastEvolutionKey === key && this.evolutionOverlay()) {
      return;
    }
    this.lastEvolutionKey = key;
    const visual = EVOLUTION_VISUALS[key];
    if (!visual) return;
    this.evolutionOverlay.set(visual);
    this.triggerHitPause(3);
  }

  private isHeal(event: FloatEvent): boolean {
    return event.value?.trim().startsWith("+") ?? false;
  }

  private floatOffset(
    event: FloatEvent,
    target: ActorKey
  ): { x: number; y: number } {
    const heal = this.isHeal(event);
    if (target === "player") {
      return heal ? { x: 46, y: -10 } : { x: -48, y: -14 };
    }
    if (event.type === "dot" || event.type === "posture") {
      return { x: 0, y: -64 };
    }
    return heal ? { x: 48, y: -10 } : { x: 44, y: -14 };
  }

  private floatJitter(id: string | undefined): number {
    if (!id?.length) return 0;
    return (id.charCodeAt(0) % 7) - 3;
  }

  private actorLabel(actor: TimelineActor): string {
    if (actor === "player") return this.playerName;
    if (actor === "enemy") return "Enemy";
    return "System";
  }

  private formatLogEvent(entry: UiLogEntry): TurnLogEvent {
    const spec = this.logDisplaySpec(entry);
    return {
      id: entry.id,
      text: spec.text,
      icon: spec.icon,
      tone: spec.tone,
      kind: entry.kind,
      target: entry.target as ActorKey | undefined,
      value: spec.value,
    };
  }

  private logDisplaySpec(entry: UiLogEntry): {
    icon: string;
    text: string;
    tone: LogTone;
    value?: number;
  } {
    const lower = entry.text.toLowerCase();
    const value = typeof entry.value === "number" ? entry.value : undefined;

    switch (entry.kind) {
      case "damage":
        return {
          icon: "\u{1F5E1}",
          text: value !== undefined ? `-${value} HP` : "Damage dealt",
          tone: "damage",
          value,
        };
      case "multihit":
        return {
          icon: "\u{1F4A5}",
          text: value !== undefined ? `+${value} combo` : "Multi-hit bonus",
          tone: "multihit",
          value,
        };
      case "dot": {
        const applied = lower.includes("apply") || lower.includes("stack");
        return {
          icon: "\u{2620}",
          text: applied ? "DoT applied" : "DoT tick",
          tone: "dot",
        };
      }
      case "posture":
        return {
          icon: "\u{1F6E1}",
          text: value !== undefined ? `-${value} posture` : "Posture hit",
          tone: "posture",
          value,
        };
      case "break":
        return {
          icon: "\u{1F480}",
          text: "Break!",
          tone: "break",
        };
      case "superbreak":
        return {
          icon: "\u{1F480}",
          text: "Superbreak!",
          tone: "superbreak",
        };
      default:
        return {
          icon:
            entry.actor === "player"
              ? "\u{1F5E1}"
              : entry.actor === "enemy"
                ? "\u{1F6E1}"
                : "?",
          text: this.compactText(entry.text),
          tone: entry.actor,
        };
    }
  }

  private compactText(text: string): string {
    if (!text) return "";
    const trimmed = text
      .replace(/\s+/g, " ")
      .replace(/[.?!]+$/g, "")
      .trim();
    if (trimmed.length <= 48) return trimmed;
    return `${trimmed.slice(0, 45)}?`;
  }

  private buildTurnSummary(events: TurnLogEvent[]): TurnSummaryChip[] {
    let totalDamage = 0;
    let bonusDamage = 0;
    let dotActive = false;
    let postureHit = false;
    let breakFlag: SummaryTone = "neutral";

    for (const event of events) {
      if (event.kind === "damage" && typeof event.value === "number") {
        totalDamage += event.value;
      }
      if (event.kind === "multihit" && typeof event.value === "number") {
        bonusDamage += event.value;
      }
      if (event.kind === "dot") {
        dotActive = true;
      }
      if (event.kind === "posture") {
        postureHit = true;
      }
      if (event.kind === "superbreak") {
        breakFlag = "superbreak";
      } else if (event.kind === "break" && breakFlag !== "superbreak") {
        breakFlag = "break";
      }
    }

    const chips: TurnSummaryChip[] = [];
    const combinedDamage = totalDamage + bonusDamage;
    if (combinedDamage > 0) {
      chips.push({ text: `${combinedDamage} dmg`, tone: "damage" });
    }

    if (dotActive) {
      chips.push({ text: "DoT active", tone: "dot" });
    }

    if (postureHit) {
      chips.push({ text: "Posture hit", tone: "posture" });
    }

    if (breakFlag === "superbreak") {
      chips.push({ text: "Superbreak", tone: "superbreak" });
    } else if (breakFlag === "break") {
      chips.push({ text: "Break", tone: "break" });
    }

    if (!chips.length) {
      chips.push({ text: "No major changes", tone: "neutral" });
    }

    return chips;
  }

  private latestTurnGroupId(): string | null {
    const latest = this.ui
      .state()
      .logs.find((entry) => entry.turn && entry.turn > 0);
    return latest ? `turn-${latest.turn}` : null;
  }

  private ensureLatestTurnExpanded(): void {
    const latestId = this.latestTurnGroupId();
    if (!latestId) return;
    if (this.collapsedTurns.has(latestId)) {
      this.collapsedTurns.delete(latestId);
    }
  }

  onEvolutionOverlayEnd(): void {
    this.evolutionOverlay.set(null);
  }
}
