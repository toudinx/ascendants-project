import { CommonModule } from "@angular/common";
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { BattleEngineService } from "../../../../core/services/battle-engine.service";
import {
  UiStateService,
  FloatEvent,
  LogKind,
  UiLogEntry,
} from "../../../../core/services/ui-state.service";
import {
  PlayerAttributeModifierSet,
  PlayerStateService,
} from "../../../../core/services/player-state.service";
import { EnemyStateService } from "../../../../core/services/enemy-state.service";
import { EnemyFactoryService } from "../../../../core/services/enemy-factory.service";
import { ProfileStateService } from "../../../../core/services/profile-state.service";
import type { RunPhase, RoomType } from "../../../../core/models/run.model";
import type { EvolutionVisual } from "../../../../core/models/evolution-visual.model";
import { ASCENSION_CONFIG } from "../../content/configs/ascension.config";
import { AscensionRunStateService } from "../../state/ascension-run-state.service";
import { AscensionOrchestratorService } from "../../services/ascension-orchestrator.service";
import type { AscensionNextStep } from "../../services/ascension-orchestrator.service";
import type { AscensionRunState } from "../../state/ascension-run-state.model";
import {
  AscensionRunDetailsVM,
  AscensionRunViewModelService,
} from "../../services/ascension-run-view-model.service";
import { ArenaContainerComponent } from "../../../battle/arena/arena-container.component";
import { ActorSpriteComponent } from "../../../battle/actor-sprite/actor-sprite.component";
import {
  BattleUiEventBus,
  ActorPose,
} from "../../../battle/ui/battle-ui-event-bus.service";
import { VfxLayerComponent } from "../../../battle/fx/vfx-layer.component";
import { CombatTextLayerComponent } from "../../../battle/fx/combat-text-layer.component";
import { GroundRippleLayerComponent } from "../../../battle/fx/ground-ripple-layer.component";
import {
  BattleFxAnchors,
  Point,
  AfterglowFieldKey
} from "../../../battle/fx/battle-fx.types";
import { BattleFxBusService } from "../../../battle/fx/battle-fx-bus.service";
import { BattleVfxIntensityService } from "../../../battle/fx/battle-vfx-intensity.service";
import type { EchoSignaturePath } from "../../../battle/fx/echo-signature-layer.component";
import { VfxSequencerService } from "../../../battle/fx/vfx-sequencer.service";
import { resolveActionProfile } from "../../../battle/fx/action-vfx-profiles";
import { VfxSettingsService } from "../../../battle/fx/vfx-settings.service";
import {
  HitCountContext,
  resolveActorHitCount
} from "../../../../core/utils/hit-count";
import { isResonanceActive } from "../../../../core/utils/resonance.utils";

type ActorKey = "player" | "enemy";
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
type HighlightVariant = "broken" | "superbroken";

interface HighlightBox {
  left: number;
  top: number;
  size: number;
  variant: HighlightVariant;
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
  selector: "app-ascension-battle-page",
  standalone: true,
  imports: [
    CommonModule,
    ArenaContainerComponent,
    ActorSpriteComponent,
    VfxLayerComponent,
    CombatTextLayerComponent,
    GroundRippleLayerComponent,
  ],
  templateUrl: "./ascension-battle.page.html",
  styleUrls: [
    "../../../run/battle/run-battle.page.scss",
    "./ascension-battle.page.scss",
  ],
  providers: [
    BattleEngineService,
    BattleVfxIntensityService,
    BattleFxBusService,
    VfxSequencerService
  ],
})
export class AscensionBattlePageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly runState = inject(AscensionRunStateService);
  private readonly orchestrator = inject(AscensionOrchestratorService);
  private readonly runDetails = inject(AscensionRunViewModelService);
  private readonly profile = inject(ProfileStateService);
  private readonly enemyFactory = inject(EnemyFactoryService);
  private readonly battle = inject(BattleEngineService);
  private readonly actorUi = inject(BattleUiEventBus);
  private readonly vfxSequencer = inject(VfxSequencerService);
  private readonly vfxIntensity = inject(BattleVfxIntensityService);
  readonly vfxSettings = inject(VfxSettingsService);
  private readonly router = inject(Router);
  readonly ui = inject(UiStateService);
  readonly player = inject(PlayerStateService);
  readonly enemy = inject(EnemyStateService);
  readonly vfxIntensity$ = this.vfxIntensity.intensity$;

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
  protected ascensionState = this.runState.getSnapshot();
  protected runDetailsVm: AscensionRunDetailsVM =
    this.runDetails.buildRunDetails(this.ascensionState);

  autoplay = true;
  paused = false;
  logOpen = true;
  awaitingPlayer = false;

  private readonly baseTracks: Record<"A" | "B" | "C", number> = {
    A: 0,
    B: 0,
    C: 0,
  };
  private battlePhase: RunPhase = "battle";
  private stateSub?: Subscription;

  private readonly processedFloatIds = new Set<string>();
  private readonly hitTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly maxExpandedLogs = 300;
  private lastTurnRef = "";
  private manualActionTurn = 0;
  private autoSkillQueuedForTurn: number | null = null;
  private lastLogId: string | null = null;
  private skillFxWindowUntil = 0;
  prefersReducedMotion = false;
  private prevPlayerStatus = this.player.state().status;
  private prevEnemyState = this.enemy.enemy().state;
  @ViewChild("logBody") logBody?: ElementRef<HTMLDivElement>;
  @ViewChild("arenaRoot", { read: ElementRef }) arenaRoot?: ElementRef<HTMLElement>;
  @ViewChild("playerActor", { read: ElementRef })
  playerActor?: ElementRef<HTMLElement>;
  @ViewChild("enemyActor", { read: ElementRef })
  enemyActor?: ElementRef<HTMLElement>;
  private collapsedTurns = new Set<string>();
  private arenaFrame?: HTMLElement;
  private readonly resizeHandler = () => this.updateFxAnchorsFromRects();

  private readonly actorPositions: Record<
    ActorKey,
    { x: number; y: number; floatY: number }
  > = {
    player: { x: 24, y: 62, floatY: 44 },
    enemy: { x: 76, y: 62, floatY: 42 },
  };
  fxAnchors: BattleFxAnchors = this.createFxAnchors();
  readonly highlightBoxes = signal<Record<ActorKey, HighlightBox | null>>({
    player: null,
    enemy: null,
  });

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
      this.updateHighlightBoxes();
    },
    { allowSignalWrites: true }
  );

  private readonly vfxIntensityWatcher = effect(
    () => {
      const dotCount =
        (this.dotStacks().player ?? 0) + (this.dotStacks().enemy ?? 0);
      this.vfxIntensity.setContext({ dotCount });
    },
    { allowSignalWrites: true }
  );

  ngOnInit(): void {
    this.stateSub = this.runState.getState().subscribe((state) => {
      this.ascensionState = state;
      this.runDetailsVm = this.runDetails.buildRunDetails(state);
      this.updateVfxContext(state);
    });
    this.actorUi.reset();
    this.runState.patchState({ roomType: "battle" });
    this.configureBattleContext();
    this.initializeBattle();
    this.awaitingPlayer = !this.autoplay;
    this.prefersReducedMotion = this.getPrefersReducedMotion();
    this.ensureLoop();
  }

  ngAfterViewInit(): void {
    this.arenaFrame = this.findArenaFrame();
    this.updateFxAnchorsFromRects();
    this.updateHighlightBoxes();
    window.addEventListener("resize", this.resizeHandler);
  }

  ngOnDestroy(): void {
    this.battle.stopLoop();
    this.actorUi.reset();
    this.stateSub?.unsubscribe();
    this.turnWatcher.destroy();
    this.floatWatcher.destroy();
    this.logWatcher.destroy();
    this.breakWatcher.destroy();
    this.vfxIntensityWatcher.destroy();
    this.hitTimers.forEach(timer => clearTimeout(timer));
    this.hitTimers.clear();
    window.removeEventListener("resize", this.resizeHandler);
  }

  get currentRoom(): number {
    return this.ascensionState.floorIndex || 1;
  }

  get totalRooms(): number {
    return ASCENSION_CONFIG.totalFloors;
  }

  get echoFragments(): number {
    return this.ascensionState.echoFragments;
  }

  get originEchoCount(): number {
    return this.ascensionState.originEchoCount;
  }

  get runEchoCount(): number {
    return this.ascensionState.runEchoCount;
  }

  get resonanceActive(): boolean {
    return isResonanceActive(this.ascensionState);
  }

  get playerState() {
    return this.player.state();
  }

  get enemyState() {
    return this.enemy.enemy();
  }

  get turnTimeline(): TurnLogGroup[] {
    const map = new Map<number, TurnLogGroup>();
    const logs = this.expandLogEntries(this.ui.state().logs);

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

  get playerHitCount(): number {
    return resolveActorHitCount(
      this.player.state(),
      this.currentHitCountContext()
    );
  }

  get playerSprite(): string {
    return this.playerState.kaelisSprite;
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
    if (this.paused || this.battlePhase !== "battle") return false;
    if (!this.autoplay && !this.awaitingPlayer) return false;
    return this.skillReady;
  }

  private expandLogEntries(entries: UiLogEntry[]): UiLogEntry[] {
    if (!entries?.length) return [];
    return entries.slice(0, this.maxExpandedLogs);
  }

  get activeEvolution(): EvolutionVisual | null {
    return null;
  }

  get hasBattleActors(): boolean {
    return (
      !!this.player.state()?.attributes && !!this.enemy.enemy()?.attributes
    );
  }

  get echoSignaturePaths(): EchoSignaturePath[] {
    return this.runDetailsVm.echoGroups.map((group) => ({
      id: group.pathId,
      count: group.echoes.length,
      kind: group.kind,
    }));
  }

  get enemySprite(): string {
    return "assets/battle/creatures/enemy_generic_idle.png";
  }

  actorPose(side: ActorKey): ActorPose {
    return this.actorUi.actorState()[side].pose;
  }

  actorHitToken(side: ActorKey): number {
    return this.actorUi.actorState()[side].hitToken;
  }

  actorCritToken(side: ActorKey): number {
    return this.actorUi.actorState()[side].critToken;
  }

  actorDotToken(side: ActorKey): number {
    return this.actorUi.actorState()[side].dotToken;
  }

  impactFlagsFor(side: ActorKey): Partial<Record<ImpactTone, boolean>> {
    return this.impactFlags()[side] ?? {};
  }

  echoCountFor(side: ActorKey): number {
    if (!this.runDetailsVm.echoGroups?.length) return 0;
    return this.runDetailsVm.echoGroups.reduce((sum, group) => {
      const isEnemyPath = group.pathId === "Ruin";
      if (side === "enemy" ? isEnemyPath : !isEnemyPath) {
        return sum + group.echoes.length;
      }
      return sum;
    }, 0);
  }

  resonanceActiveFor(side: ActorKey): boolean {
    return side === "player" && isResonanceActive(this.ascensionState);
  }

  hasBuff(side: ActorKey): boolean {
    if (side !== "player") return false;
    return this.playerState.buffs?.some((buff) => buff.type === "buff") ?? false;
  }

  energyFull(side: ActorKey): boolean {
    if (side !== "player") return false;
    const attrs = this.playerState.attributes;
    return attrs.energy >= attrs.maxEnergy;
  }

  get manualActionReady(): boolean {
    return (
      !this.autoplay &&
      !this.paused &&
      this.awaitingPlayer &&
      this.battlePhase === "battle"
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
    this.armSkillFxWindow();
    if (!this.autoplay) {
      this.awaitingPlayer = false;
      this.manualActionTurn = this.battle.currentTurn().number;
    }
    this.ensureLoop();
  }

  abandonRun(): void {
    this.battle.stopLoop();
    this.battlePhase = "idle";
    this.paused = false;
    this.finalizeRun("defeat");
  }

  private configureBattleContext(): void {
    this.battle.setRunContext({
      getPhase: () => this.battlePhase,
      getTrackLevels: () => this.baseTracks,
      getCurrentRoom: () => this.currentRoom,
      getHitCountContext: () => this.currentHitCountContext(),
      finishBattle: (result) => this.handleBattleResult(result),
    });
  }

  private initializeBattle(): void {
    const snapshot = this.runState.getSnapshot();
    this.battlePhase = "battle";
    const kaelis = this.profile.getActiveSnapshot();
    const weapon = this.profile.getEquippedWeapon(kaelis.id);
    const rings = this.profile.getEquippedRings(kaelis.id);
    const modifiers = this.buildRunAttributeModifiers(snapshot);
    this.player.resetForNewRun(kaelis, weapon, rings, modifiers);
    this.applyPotionMaxHp(snapshot);
    this.player.lockLoadout();
    const roomType = this.mapFloorToRoomType(snapshot.floorIndex || 1);
    const encounter = this.enemyFactory.createEncounter(
      snapshot.floorIndex || 1,
      roomType
    );
    this.enemy.spawnEncounter(encounter.enemy);
    this.battle.setEnemyBehavior(encounter.behavior);
    this.battle.startBattle({
      seed: this.deriveBattleSeed(snapshot.seed, snapshot.floorIndex || 1),
    });
  }

  private handleBattleResult(result: "victory" | "defeat"): void {
    this.battlePhase = "idle";
    this.battle.stopLoop();
    if (result === "victory") {
      if (this.currentRoom >= ASCENSION_CONFIG.totalFloors) {
        this.finalizeRun("victory");
        return;
      }
      const next = this.orchestrator.onBattleWin();
      this.router.navigateByUrl(this.routeForStep(next));
      return;
    }
    this.finalizeRun("defeat");
  }

  private finalizeRun(outcome: "victory" | "defeat"): void {
    const snapshot = this.runState.getSnapshot();
    const fragmentsAwarded =
      outcome === "victory" && this.currentRoom >= ASCENSION_CONFIG.totalFloors
        ? this.awardFragments(snapshot.floorIndex) +
          this.bonusFragmentsPerVictory(snapshot)
        : 0;
    const nextFragments = snapshot.echoFragments + fragmentsAwarded;
    const nextEarnedTotal =
      snapshot.echoFragmentsEarnedTotal + fragmentsAwarded;
    this.player.unlockLoadout();
    const floorsCleared =
      outcome === "victory"
        ? ASCENSION_CONFIG.totalFloors
        : Math.max(0, snapshot.floorIndex - 1);
    this.runState.patchState({
      runOutcome: outcome,
      floorsCleared,
      echoFragments: nextFragments,
      echoFragmentsEarnedTotal: nextEarnedTotal,
      roomType: "summary",
      endTimestamp: Date.now(),
    });
    this.router.navigateByUrl("/ascension/summary");
  }

  private awardFragments(floorIndex: number): number {
    const base = 4;
    const bonus = Math.min(4, Math.floor(floorIndex / 2));
    return base + bonus;
  }

  private bonusFragmentsPerVictory(snapshot: AscensionRunState): number {
    return snapshot.runModifiers?.fragmentsPerVictory ?? 0;
  }

  private routeForStep(step: AscensionNextStep): string {
    if (step === "shop") return "/ascension/shop";
    if (step === "bargain") return "/ascension/bargain";
    return "/ascension/draft";
  }

  private mapFloorToRoomType(floor: number): RoomType {
    if (floor >= ASCENSION_CONFIG.totalFloors) return "boss";
    const mid = Math.ceil(ASCENSION_CONFIG.totalFloors / 2);
    if (floor === mid) return "mini-boss";
    return "normal";
  }

  private deriveBattleSeed(baseSeed: number, floor: number): number {
    const seed = typeof baseSeed === "number" ? baseSeed : 0;
    return seed + floor * 9973;
  }

  private buildRunAttributeModifiers(
    snapshot: AscensionRunState
  ): PlayerAttributeModifierSet {
    const modifiers: PlayerAttributeModifierSet = {};
    const damageBonus = snapshot.runModifiers?.damagePercent ?? 0;
    if (damageBonus) {
      modifiers.damagePercent = damageBonus;
    }
    return modifiers;
  }

  private applyPotionMaxHp(snapshot: AscensionRunState): void {
    const bonusPercent = snapshot.runModifiers?.maxHpPercent ?? 0;
    if (!bonusPercent) return;
    const multiplier = 1 + bonusPercent / 100;
    this.player.state.update((current) => {
      const attrs = current.attributes;
      const maxHp = Math.floor(attrs.maxHp * multiplier);
      const hp = Math.min(maxHp, Math.floor(attrs.hp * multiplier));
      return {
        ...current,
        attributes: { ...attrs, maxHp, hp },
      };
    });
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

  trackTurn(_: number, item: TurnLogGroup): string {
    return item.id;
  }

  trackTurnEvent(_: number, item: TurnLogEvent): string {
    return item.id;
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
    if (!this.autoplay || this.paused || this.battlePhase !== "battle") return;
    if (turn.actor !== "player") return;
    if (!this.battle.canUseActiveSkill()) return;
    if (this.autoSkillQueuedForTurn === turn.number) return;
    this.autoSkillQueuedForTurn = turn.number;
    this.battle.triggerActiveSkill();
    this.armSkillFxWindow();
  }

  private ensureLoop(): void {
    if (this.paused || this.battlePhase !== "battle") {
      return;
    }
    if (this.autoplay || (!this.autoplay && !this.awaitingPlayer)) {
      this.battle.startLoop();
    }
  }

  private processFloatEvents(floats: FloatEvent[]): void {
    if (!floats?.length) return;
    this.updateFxAnchorsFromRects();
    for (const event of floats) {
      if (!event?.id || !event.target) continue;
      const target = event.target as ActorKey;
      if (this.processedFloatIds.has(event.id)) continue;
      this.processedFloatIds.add(event.id);
      const amount = this.floatAmount(event.value);
      const hitCount = Number.isFinite(event.hitCount)
        ? Math.max(1, Math.floor(event.hitCount as number))
        : 1;
      const hitIndex = Number.isFinite(event.hitIndex)
        ? Math.max(0, Math.floor(event.hitIndex as number))
        : 0;
      this.scheduleAtomicFloat(event, amount, hitIndex, hitCount);
      if (event.type === "dot") {
        this.dotStacks.update((state) => ({
          ...state,
          [target]: Math.max(0, (state[target] ?? 0) - 1),
        }));
      }
    }
  }

  private scheduleAtomicFloat(
    baseEvent: FloatEvent,
    amount: number,
    hitIndex: number,
    hitCount: number,
    intervalMs?: number
  ): void {
    const index = Math.max(0, Math.floor(hitIndex));
    const total = Math.max(1, Math.floor(hitCount));
    const step = intervalMs ?? this.hitIntervalMs(baseEvent);
    const delay = total > 1 ? Math.max(0, index * step) : 0;
    const value = `-${Math.max(0, Math.round(amount))}`;
    const event: FloatEvent = {
      ...baseEvent,
      value,
      hitCount: total,
      hitIndex: index
    };
    if (delay <= 0) {
      this.emitFxForFloat(event);
      this.queueActorPresentation(event);
      this.enqueueImpactFromFloat(event);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    timer = setTimeout(() => {
      if (timer) this.hitTimers.delete(timer);
      this.emitFxForFloat(event);
      this.queueActorPresentation(event);
      this.enqueueImpactFromFloat(event);
    }, delay);
    this.hitTimers.add(timer);
  }

  private hitIntervalMs(event?: FloatEvent): number {
    if (this.prefersReducedMotion) {
      return 50;
    }
    const actionKind = event?.actionKind;
    if (actionKind === "dot") {
      return 110;
    }
    if (actionKind === "enemyAttack" || actionKind === "enemySkill") {
      return 90;
    }
    if (event?.target === "player") {
      return 90;
    }
    return 70;
  }

  private queueActorPresentation(event: FloatEvent): void {
    const target: ActorKey = event.target === "player" ? "player" : "enemy";
    if (event.type === "dot") {
      this.actorUi.triggerDotPulse(target);
      return;
    }
  }

  private emitFxForFloat(event: FloatEvent): void {
    if (!event.target) return;
    const target: ActorKey = event.target === "player" ? "player" : "enemy";
    const attacker: ActorKey = target === "enemy" ? "player" : "enemy";
    const impactPoint = this.impactPointFor(target);
    const originPoint = this.originPointFor(attacker);
    const amount = this.floatAmount(event.value);
    const dot = event.type === "dot";
    const crit = event.type === "crit";
    const skillActive = this.isSkillFxActive(attacker);
    const actionKind =
      event.actionKind ??
      (dot ? "dot" : skillActive ? "skill" : "auto");
    const kind =
      actionKind === "dot"
        ? "dotTick"
        : actionKind === "enemySkill"
          ? "enemySkill"
          : actionKind === "skill"
            ? "skill"
            : attacker === "enemy"
              ? "enemy"
              : "normal";
    const style =
      kind === "skill"
        ? "cast"
        : kind === "enemySkill"
          ? "cast"
          : "melee";
    const profile = resolveActionProfile(kind, style);
    const fieldKey = dot ? this.resolveDotFieldKey() : undefined;

    this.vfxSequencer.run({
      attacker,
      target,
      origin: originPoint,
      impact: impactPoint,
      amount,
      crit,
      dot,
      profile,
      fieldKey,
      hitIndex: event.hitIndex,
      hitCount: event.hitCount,
      reduceMotion: this.prefersReducedMotion
    });
  }

  private armSkillFxWindow(): void {
    const windowMs = this.prefersReducedMotion ? 700 : 1200;
    this.skillFxWindowUntil = Date.now() + windowMs;
  }

  private isSkillFxActive(attacker: ActorKey): boolean {
    if (attacker !== "player") return false;
    const now = Date.now();
    if (now > this.skillFxWindowUntil) {
      this.skillFxWindowUntil = 0;
      return false;
    }
    return true;
  }

  private resolveDotFieldKey(): AfterglowFieldKey {
    const logs = this.ui.state().logs ?? [];
    const latestDot = logs.find((entry) => entry.kind === "dot");
    if (!latestDot?.text) return "burn";
    const lower = latestDot.text.toLowerCase();
    if (lower.includes("poison") || lower.includes("toxic") || lower.includes("venom")) {
      return "poison";
    }
    if (lower.includes("bleed") || lower.includes("blood")) {
      return "bleed";
    }
    if (lower.includes("rune") || lower.includes("sigil")) {
      return "rune";
    }
    return "burn";
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

  private updateVfxContext(state: AscensionRunState): void {
    const totalFloors = ASCENSION_CONFIG.totalFloors;
    const floorProgress =
      totalFloors > 0 ? state.floorIndex / totalFloors : 0;
    const originFactor = this.clamp01(state.originEchoCount / 3);
    const runFactor = this.clamp01(state.runEchoCount / 2);
    const echoFactor = (originFactor + runFactor) / 2;

    this.vfxIntensity.setContext({
      floorProgress,
      echoFactor,
      resonanceActive: isResonanceActive(state),
    });
  }

  private currentHitCountContext(): HitCountContext {
    const snapshot = this.runState.getSnapshot();
    return {
      resonanceActive: isResonanceActive(snapshot),
      originPathId: snapshot.originPathId,
      runPathId: snapshot.runPathId
    };
  }

  private clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  private floatAmount(value: string | undefined): number {
    if (!value) return 0;
    const cleaned = value.replace(/[^0-9-]/g, "");
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return 0;
    return Math.abs(Math.round(parsed));
  }

  private updateFxAnchorsFromRects(): void {
    const arenaRect = this.getArenaRect();
    if (!arenaRect) {
      this.highlightBoxes.set({ player: null, enemy: null });
      return;
    }
    const playerAnchors =
      this.anchorFromRects("player", arenaRect) ?? this.anchorFor("player");
    const enemyAnchors =
      this.anchorFromRects("enemy", arenaRect) ?? this.anchorFor("enemy");
    this.fxAnchors = {
      player: playerAnchors,
      enemy: enemyAnchors,
    };
    this.updateHighlightBoxes(arenaRect);
  }

  private updateHighlightBoxes(arenaRect?: DOMRect | null): void {
    const rect = arenaRect ?? this.getArenaRect();
    if (!rect) {
      this.highlightBoxes.set({ player: null, enemy: null });
      return;
    }
    const playerVariant = this.isPlayerSuperBroken
      ? "superbroken"
      : this.isPlayerBroken
        ? "broken"
        : null;
    const enemyVariant = this.isEnemySuperBroken
      ? "superbroken"
      : this.isEnemyBroken
        ? "broken"
        : null;
    this.highlightBoxes.set({
      player: this.buildHighlightBox("player", rect, playerVariant),
      enemy: this.buildHighlightBox("enemy", rect, enemyVariant),
    });
  }

  private buildHighlightBox(
    side: ActorKey,
    arenaRect: DOMRect,
    variant: HighlightVariant | null
  ): HighlightBox | null {
    if (!variant) return null;
    const actorRect = this.getActorRect(side);
    if (!actorRect) return null;
    const baseSide = Math.max(actorRect.width, actorRect.height);
    const pad = this.clampNumber(baseSide * 0.06, 8, 18);
    const size = Math.round(baseSide + pad * 2);
    const centerX = actorRect.left + actorRect.width / 2;
    const centerY = actorRect.top + actorRect.height / 2;
    const left = Math.round(centerX - size / 2 - arenaRect.left);
    const top = Math.round(centerY - size / 2 - arenaRect.top);
    return {
      left,
      top,
      size,
      variant,
    };
  }

  private originPointFor(side: ActorKey): Point {
    const arenaRect = this.getArenaRect();
    const actorRect = this.getActorRect(side);
    if (arenaRect && actorRect) {
      return this.pointFromRect(actorRect, side, "origin", arenaRect);
    }
    return this.pointFromAnchor(side, "origin", arenaRect);
  }

  private impactPointFor(side: ActorKey): Point {
    const arenaRect = this.getArenaRect();
    const actorRect = this.getActorRect(side);
    if (arenaRect && actorRect) {
      return this.pointFromRect(actorRect, side, "impact", arenaRect);
    }
    return this.pointFromAnchor(side, "impact", arenaRect);
  }

  private pointFromRect(
    actorRect: DOMRect,
    side: ActorKey,
    kind: "origin" | "impact" | "foot",
    arenaRect: DOMRect
  ): Point {
    const xFactor =
      kind === "origin" ? (side === "player" ? 0.65 : 0.35) : 0.5;
    const x = actorRect.left + actorRect.width * xFactor;
    const y =
      kind === "foot"
        ? actorRect.bottom - actorRect.height * 0.06
        : actorRect.top + actorRect.height * 0.45;
    return {
      x: Math.round(x - arenaRect.left),
      y: Math.round(y - arenaRect.top),
    };
  }

  private pointFromAnchor(
    side: ActorKey,
    kind: "origin" | "impact" | "foot",
    arenaRect?: DOMRect | null
  ): Point {
    if (!arenaRect) return { x: 50, y: 50 };
    const anchor = this.fxAnchors?.[side]?.[kind] ?? { x: 50, y: 50 };
    const x = Math.round((anchor.x / 100) * arenaRect.width);
    const y = Math.round((anchor.y / 100) * arenaRect.height);
    return { x, y };
  }

  private anchorFromRects(
    side: ActorKey,
    arenaRect: DOMRect
  ): { origin: Point; impact: Point; foot: Point } | null {
    const actorRect = this.getActorRect(side);
    if (!actorRect) return null;
    const origin = this.pointFromRect(actorRect, side, "origin", arenaRect);
    const impact = this.pointFromRect(actorRect, side, "impact", arenaRect);
    const foot = this.pointFromRect(actorRect, side, "foot", arenaRect);
    return {
      origin: this.pointToAnchor(origin, arenaRect),
      impact: this.pointToAnchor(impact, arenaRect),
      foot: this.pointToAnchor(foot, arenaRect),
    };
  }

  private pointToAnchor(point: Point, arenaRect: DOMRect): Point {
    const x = arenaRect.width ? (point.x / arenaRect.width) * 100 : 50;
    const y = arenaRect.height ? (point.y / arenaRect.height) * 100 : 50;
    return {
      x: this.clampPercent(x),
      y: this.clampPercent(y),
    };
  }

  private createFxAnchors(): BattleFxAnchors {
    return {
      player: this.anchorFor("player"),
      enemy: this.anchorFor("enemy"),
    };
  }

  private anchorFor(side: ActorKey) {
    const pos = this.actorPositions[side];
    const direction = side === "player" ? 1 : -1;
    return {
      origin: {
        x: this.clampPercent(pos.x + direction * 6),
        y: this.clampPercent(pos.y - 14),
      },
      impact: {
        x: this.clampPercent(pos.x + direction * 2),
        y: this.clampPercent(pos.y - 12),
      },
      foot: {
        x: this.clampPercent(pos.x),
        y: this.clampPercent(pos.y),
      },
    };
  }

  private clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private findArenaFrame(): HTMLElement | undefined {
    const host = this.arenaRoot?.nativeElement;
    if (!(host instanceof HTMLElement)) return undefined;
    const frame = host.querySelector(".arena-frame");
    return frame instanceof HTMLElement ? frame : host;
  }

  private getArenaRect(): DOMRect | null {
    if (!this.arenaFrame) {
      this.arenaFrame = this.findArenaFrame();
    }
    return this.arenaFrame?.getBoundingClientRect() ?? null;
  }

  private getActorRect(side: ActorKey): DOMRect | null {
    const ref = side === "player" ? this.playerActor : this.enemyActor;
    return ref?.nativeElement.getBoundingClientRect() ?? null;
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
          text: applied
            ? "DoT applied"
            : value !== undefined
              ? `-${value} HP`
              : "DoT tick",
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
