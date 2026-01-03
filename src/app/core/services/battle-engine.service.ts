import { Injectable, OnDestroy, inject, signal } from "@angular/core";
import { EnemyStateService } from "./enemy-state.service";
import { PlayerStateService } from "./player-state.service";
import { UiStateService, LogActor, LogKind } from "./ui-state.service";
import { DEV_COMBAT } from "../config/dev-combat.config";
import {
  BattleEvent,
  BattleSnapshot,
  SerializedEnemyState,
  SerializedPlayerState,
  buildLogFromSnapshots,
  SerializedDotStack,
  ElementType,
} from "../models/battle-snapshot.model";
import { RunPhase } from "../models/run.model";
import { TrackKey } from "../models/tracks.model";
import { SIGIL_SETS } from "../../content/equipment/sigils";
import { SigilSetKey } from "../models/sigil.model";
import {
  BALANCE_CONFIG,
  getPlayerPowerMultiplier,
  POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION
} from "../../content/balance/balance.config";
import { EnemyBehaviorProfile } from "./enemy-factory.service";
import { HitActionKind } from "../models/hit-count.model";
import { HitCountContext, resolveActorHitCount } from "../utils/hit-count";
import {
  applyMultiHitHpScalar,
  applyMultiHitPostureScalar,
  computeDamageTaken
} from "../domain/battle/damage";
import { createPostureOverkillTracker } from "../domain/battle/posture";
import {
  applyDotTickToEnemy,
  applyDotTickToPlayer,
  resolveDotStacks,
} from "../domain/battle/dots";
import { RngService, RngStream } from "./rng.service";

type Turn = "player" | "enemy";

interface TurnState {
  number: number;
  actor: Turn;
}

type DotStack = SerializedDotStack;
type DotTarget = "player" | "enemy";

const PLAYER_COMBAT = BALANCE_CONFIG.playerCombat;
const ENEMY_COMBAT = BALANCE_CONFIG.enemyCombat;

interface TurnSummary {
  damageToEnemy: number;
  damageToPlayer: number;
  postureToEnemy: number;
  postureToPlayer: number;
  dotOnEnemy: boolean;
  dotOnPlayer: boolean;
}

interface DamageInstanceEvent {
  sourceId: string;
  targetId: string;
  actionKind: "auto" | "skill" | "enemyAttack" | "enemySkill" | "dot";
  hitIndex: number;
  hitCount: number;
  amountHp: number;
  amountPosture: number;
  isCrit: boolean;
  timestamp: number;
}

interface RunContext {
  getPhase: () => RunPhase;
  getTrackLevels: () => Record<TrackKey, number>;
  getCurrentRoom: () => number;
  getHitCountContext?: () => HitCountContext | undefined;
  tickTurnUpgrades?: (actor: "player" | "enemy") => void;
  finishBattle: (result: "victory" | "defeat") => void;
}

@Injectable({ providedIn: "root" })
export class BattleEngineService implements OnDestroy {
  private tickTimer?: ReturnType<typeof setTimeout>;
  private readonly loopDelay = 750;
  private queuedSkill = false;
  private enemyDots: DotStack[] = [];
  private playerDots: DotStack[] = [];

  readonly isRunning = signal(false);
  readonly currentTurn = signal<TurnState>({ number: 1, actor: "player" });
  readonly lastEvent = signal<string | null>(null);
  readonly snapshots = signal<BattleSnapshot[]>([]);
  private activeTurnNumber = 1;

  private battleRng: RngStream;
  private currentSeed: number;
  private eventCounter = 0;
  private dotCounter = 0;
  private turnEvents: BattleEvent[] = [];
  private runContext?: RunContext;
  private turnSummary: TurnSummary = {
    damageToEnemy: 0,
    damageToPlayer: 0,
    postureToEnemy: 0,
    postureToPlayer: 0,
    dotOnEnemy: false,
    dotOnPlayer: false,
  };
  private enemyPostureFullAtActionStart = false;
  private playerPostureFullAtActionStart = false;
  private enemyBehavior?: EnemyBehaviorProfile;
  private enemyHeavyBonusConsumed = false;
  private enemyCycleTurn = 0;
  private enemyHeavyActivations = 0;
  private readonly enemy = inject(EnemyStateService);
  private readonly player = inject(PlayerStateService);
  private readonly ui = inject(UiStateService);
  private readonly rng = inject(RngService);

  constructor() {
    this.currentSeed = this.randomSeed();
    this.battleRng = this.rng.fork("battle", this.currentSeed);
  }

  setEnemyBehavior(behavior: EnemyBehaviorProfile | undefined): void {
    this.enemyBehavior = behavior;
    this.enemyHeavyBonusConsumed = false;
    this.enemyCycleTurn = 0;
    this.enemyHeavyActivations = 0;
  }

  setRunContext(context: RunContext): void {
    this.runContext = context;
  }

  ngOnDestroy(): void {
    this.stopLoop();
  }

  startBattle(options?: { seed?: number }): number {
    this.stopLoop();
    this.currentSeed =
      typeof options?.seed === "number" ? options.seed : this.randomSeed();
    this.battleRng = this.rng.fork("battle", this.currentSeed);
    this.eventCounter = 0;
    this.dotCounter = 0;
    this.turnEvents = [];
    this.snapshots.set([]);
    this.currentTurn.set({ number: 1, actor: "player" });
    this.lastEvent.set(null);
    this.playerDots = [];
    this.enemyDots = [];
    this.queuedSkill = false;
    this.ui.resetBattleUi(this.currentSeed);
    this.ui.setBattleSeed(this.currentSeed);
    if (DEV_COMBAT.exposeSeed) {
      console.debug("Battle seed", this.currentSeed);
    }
    return this.currentSeed;
  }

  replayBattle(snapshots: BattleSnapshot[]): void {
    this.stopLoop();
    if (!snapshots?.length) return;
    this.currentSeed = snapshots[0].seed;
    this.battleRng = this.rng.fork("battle", this.currentSeed);
    this.snapshots.set([...snapshots]);
    this.ui.setBattleSeed(this.currentSeed);
    this.ui.setLogs(buildLogFromSnapshots(snapshots));
    snapshots.forEach((snap) => this.applySnapshot(snap));
    const last = snapshots[snapshots.length - 1];
    this.currentTurn.set({ number: last.turnIndex + 1, actor: "player" });
  }

  startLoop(): void {
    if (this.isRunning()) {
      return;
    }
    this.isRunning.set(true);
    this.scheduleNextTick();
  }

  stopLoop(): void {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = undefined;
    }
    this.isRunning.set(false);
  }

  triggerActiveSkill(): void {
    if (this.getRunPhase() !== "battle") return;
    const cost = this.player.state().kit.skillEnergyCost;
    if (!this.player.canUseSkill(cost)) return;
    this.queuedSkill = true;
  }

  canUseActiveSkill(): boolean {
    return (
      this.player.canUseSkill(this.player.state().kit.skillEnergyCost) &&
      this.player.state().status === "normal"
    );
  }

  serializePlayerState(): SerializedPlayerState {
    const player = this.player.state();
    return {
      attributes: { ...player.attributes },
      status: player.status,
      breakTurns: player.breakTurns,
      skillCooldown: player.skillCooldown,
      dots: this.playerDots.map(dot => ({ ...dot })),
      buffs: [...player.buffs],
      kaelisRoute: player.kaelisRoute,
      kaelisId: player.kaelisId,
      kaelisName: player.kaelisName,
      kaelisSprite: player.kaelisSprite,
      kit: { ...player.kit },
      weaponId: player.weaponId,
      sigilSetCounts: player.sigilSetCounts ? { ...player.sigilSetCounts } : undefined,
      sigilSkillBuffs: player.sigilSkillBuffs ? [...player.sigilSkillBuffs] : undefined,
      sigilDamageBuffPercent: player.sigilDamageBuffPercent,
      sigilDamageBuffTurns: player.sigilDamageBuffTurns,
      sigilDamageBuffSource: player.sigilDamageBuffSource,
    };
  }

  serializeEnemyState(): SerializedEnemyState {
    const enemy = this.enemy.enemy();
    return {
      attributes: { ...enemy.attributes },
      state: enemy.state,
      breakTurns: enemy.breakTurns,
      dots: this.enemyDots.map(dot => ({ ...dot })),
    };
  }

  private scheduleNextTick(): void {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
    }
    this.tickTimer = setTimeout(() => this.tick(), this.loopDelay);
  }

  private tick(): void {
    if (!this.isRunning()) return;
    if (this.getRunPhase() !== "battle") {
      this.stopLoop();
      return;
    }
    if (this.checkOutcome()) {
      this.stopLoop();
      return;
    }

    const turn = this.currentTurn();
    this.activeTurnNumber = turn.number;
    this.resetTurnSummary();
    if (turn.actor === "player") {
      this.playerTurn();
      this.currentTurn.set({ number: turn.number + 1, actor: "enemy" });
    } else {
      this.enemyTurn();
      this.currentTurn.set({ number: turn.number + 1, actor: "player" });
    }

    if (this.checkOutcome()) {
      this.stopLoop();
      return;
    }

    this.scheduleNextTick();
  }

  private playerTurn(): void {
    const player = this.player.state();
    const enemyState = this.enemy.enemy();
    this.enemyPostureFullAtActionStart =
      enemyState.attributes.posture === enemyState.attributes.maxPosture;

    if (player.status === "broken" || player.status === "superbroken") {
      this.log(`${this.playerName} is broken and lost the turn.`, "player");
      const endedNow = this.player.decrementBreak();
      if (endedNow) {
        this.log("Posture restored (100%).", "system");
      }
      this.endOfTurn("player");
      return;
    }

    const skillCost = this.player.state().kit.skillEnergyCost;
    if (this.queuedSkill && this.player.canUseSkill(skillCost)) {
      this.useActiveSkill();
      this.queuedSkill = false;
      this.lastEvent.set("skill");
    } else {
      this.autoAttackPlayer();
    }

    this.endOfTurn("player");
  }

  private enemyTurn(): void {
    const enemyState = this.enemy.enemy();
    const playerState = this.player.state();
    this.playerPostureFullAtActionStart =
      playerState.attributes.posture === playerState.attributes.maxPosture;

    if (enemyState.state === "dead") return;

    if (enemyState.state === "broken" || enemyState.state === "superbroken") {
      this.log("Enemy is broken and loses the turn.", "enemy");
      const endedNow = this.enemy.decrementBreak();
      if (endedNow) {
        this.log("Posture restored (100%).", "system");
      }
      this.endOfTurn("enemy");
      return;
    }

    const heavy = this.enemyBehavior?.heavy;
    const cycle = this.enemyBehavior?.cycle?.pattern;

    if (cycle && cycle.length) {
      const action = cycle[this.enemyCycleTurn % cycle.length];
      this.enemyCycleTurn += 1;
      this.executeCycleAction(action);
      this.endOfTurn("enemy");
      return;
    }

    if (
      enemyState.state === "preparing" &&
      enemyState.attributes.strongAttackReady
    ) {
      this.enemyStrongAttack();
    } else {
      if (heavy && this.shouldStartHeavyAttack(heavy)) {
        this.enemy.prepareStrongAttack();
        const label = heavy.name ?? "a heavy strike";
        this.log(`${enemyState.attributes.name} is charging ${label}!`, "enemy");
      } else {
        this.enemyAutoAttack();
      }
    }

    this.enemyCycleTurn += 1;
    this.endOfTurn("enemy");
  }

  private autoAttackPlayer(): void {
    const attrs = this.player.state().attributes;
    const enemyAttrs = this.enemy.enemy().attributes;
    const sourceId = this.player.state().kaelisId ?? "player";
    const targetId = enemyAttrs.id ?? enemyAttrs.name ?? "enemy";
    const mod = this.trackModifiers();
    const kit = this.player.state().kit;
    const attack = Math.max(
      1,
      attrs.attack * mod.attackMult -
        enemyAttrs.defense * (1 - mod.penetrationBonus)
    );
    const autoMultiplier = kit.autoMultiplier ?? 0.8;
    const baseDamage = Math.max(1, Math.floor(attack * autoMultiplier));
    const damageBonus =
      1 + ((attrs.damageBonusPercent ?? 0) + this.player.getSigilDamageBuffPercent()) / 100;
    const hitCountContext = this.currentHitCountContext();
    const totalHits = resolveActorHitCount(this.player.state(), hitCountContext);
    const hitTrace: { hitIndex: number; amount: number }[] | null =
      DEV_COMBAT.traceHitCount ? [] : null;
    const mainPosture = this.applyPostureBonus(
      this.scaledPostureDamage(enemyAttrs.maxPosture, PLAYER_COMBAT.autoPostureRatio)
    );
    const multiRatio = PLAYER_COMBAT.multiPostureRatio ?? PLAYER_COMBAT.autoPostureRatio;
    const multiPosture = this.applyPostureBonus(
      this.scaledPostureDamage(enemyAttrs.maxPosture, multiRatio)
    );
    const actionCrit = this.random() < attrs.critChance;
    const critMultiplier = actionCrit ? attrs.critDamage * mod.critDamageMult : 1;
    const baseHitDamage = Math.max(
      1,
      Math.floor(baseDamage * damageBonus * critMultiplier)
    );
    const postureTracker = createPostureOverkillTracker(
      enemyAttrs.maxPosture,
      enemyAttrs.posture,
      POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION
    );

    for (let hitIndex = 0; hitIndex < totalHits; hitIndex += 1) {
      const isCrit = actionCrit;
      const damage = applyMultiHitHpScalar(baseHitDamage, hitIndex);
      const postureBase = hitIndex === 0 ? mainPosture : multiPosture;
      const postureAfterCrit = this.applyCritToPosture(
        postureBase,
        isCrit,
        critMultiplier
      );
      const postureScaled = applyMultiHitPostureScalar(
        postureAfterCrit,
        hitIndex
      );
      const postureDamage = postureTracker.apply(postureScaled);
      const instance: DamageInstanceEvent = {
        sourceId,
        targetId,
        actionKind: "auto",
        hitIndex,
        hitCount: totalHits,
        amountHp: damage,
        amountPosture: postureDamage,
        isCrit,
        timestamp: Date.now()
      };
      const appliedDamage = this.applyHitToEnemy(
        instance.amountHp,
        instance.amountPosture,
        instance.isCrit ? "crit" : "dmg",
        {
          hitCount: instance.hitCount,
          hitIndex: instance.hitIndex,
          actionKind: instance.actionKind
        }
      );
      if (hitTrace) {
        hitTrace.push({ hitIndex: instance.hitIndex, amount: appliedDamage });
      }
      this.log(`-${appliedDamage} HP`, "player", {
        kind: "damage",
        target: "enemy",
        value: appliedDamage,
        hitCount: instance.hitCount,
        hitIndex: instance.hitIndex,
        actionKind: instance.actionKind
      });
    }
    if (hitTrace) {
      this.traceHitCount(
        sourceId,
        this.playerName,
        "auto",
        totalHits,
        hitTrace
      );
    }

    if (this.random() < attrs.dotChance) {
      const postureDot = this.applyPostureBonus(
        this.scaledPostureDamage(enemyAttrs.maxPosture, PLAYER_COMBAT.dot.postureRatio)
      );
      this.addDotStack("enemy", {
        element: this.dotElementForSource("player"),
        sourceId,
        damagePerTick: PLAYER_COMBAT.dot.damage,
        postureDamagePerTick: postureDot,
        remainingTurns: PLAYER_COMBAT.dot.duration,
        appliedTurn: this.activeTurnNumber,
      });
      this.log("DoT aplicado", "player", {
        kind: "dot",
        target: "enemy",
        actionKind: "dot"
      });
    }
  }

  private useActiveSkill(): void {
    const attrs = this.player.state().attributes;
    const enemyAttrs = this.enemy.enemy().attributes;
    const sourceId = this.player.state().kaelisId ?? "player";
    const targetId = enemyAttrs.id ?? enemyAttrs.name ?? "enemy";
    const mod = this.trackModifiers();
    const kit = this.player.state().kit;
    const attack = Math.max(
      1,
      attrs.attack * mod.attackMult -
        enemyAttrs.defense * (1 - mod.penetrationBonus)
    );
    const baseDamage = Math.max(
      1,
      Math.floor(attack * (kit.skillMultiplier || 1.6))
    );
    const damageBonus =
      1 + ((attrs.damageBonusPercent ?? 0) + this.player.getSigilDamageBuffPercent()) / 100;
    const skillPostureRatio = PLAYER_COMBAT.skillPostureRatio ?? PLAYER_COMBAT.autoPostureRatio;
    const mainPosture = this.applyPostureBonus(
      this.scaledPostureDamage(enemyAttrs.maxPosture, skillPostureRatio)
    );
    const multiRatio = PLAYER_COMBAT.multiPostureRatio ?? PLAYER_COMBAT.autoPostureRatio;
    const multiPosture = this.applyPostureBonus(
      this.scaledPostureDamage(enemyAttrs.maxPosture, multiRatio)
    );
    this.player.activateSkill(
      kit.skillEnergyCost,
      kit.skillCooldownTurns
    );
    const hitCountContext = this.currentHitCountContext();
    const totalHits = resolveActorHitCount(this.player.state(), hitCountContext);
    const hitTrace: { hitIndex: number; amount: number }[] | null =
      DEV_COMBAT.traceHitCount ? [] : null;
    const actionCrit = this.random() < attrs.critChance;
    const critMultiplier = actionCrit ? attrs.critDamage * mod.critDamageMult : 1;
    const baseHitDamage = Math.max(
      1,
      Math.floor(baseDamage * damageBonus * critMultiplier)
    );
    const postureTracker = createPostureOverkillTracker(
      enemyAttrs.maxPosture,
      enemyAttrs.posture,
      POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION
    );
    for (let hitIndex = 0; hitIndex < totalHits; hitIndex += 1) {
      const isCrit = actionCrit;
      const damage = applyMultiHitHpScalar(baseHitDamage, hitIndex);
      const postureBase = hitIndex === 0 ? mainPosture : multiPosture;
      const postureAfterCrit = this.applyCritToPosture(
        postureBase,
        isCrit,
        critMultiplier
      );
      const postureScaled = applyMultiHitPostureScalar(
        postureAfterCrit,
        hitIndex
      );
      const postureDamage = postureTracker.apply(postureScaled);
      const instance: DamageInstanceEvent = {
        sourceId,
        targetId,
        actionKind: "skill",
        hitIndex,
        hitCount: totalHits,
        amountHp: damage,
        amountPosture: postureDamage,
        isCrit,
        timestamp: Date.now()
      };
      const appliedDamage = this.applyHitToEnemy(
        instance.amountHp,
        instance.amountPosture,
        instance.isCrit ? "crit" : "dmg",
        {
          hitCount: instance.hitCount,
          hitIndex: instance.hitIndex,
          actionKind: instance.actionKind
        }
      );
      if (hitTrace) {
        hitTrace.push({ hitIndex: instance.hitIndex, amount: appliedDamage });
      }
      this.log(`-${appliedDamage} HP`, "player", {
        kind: "damage",
        target: "enemy",
        value: appliedDamage,
        hitCount: instance.hitCount,
        hitIndex: instance.hitIndex,
        actionKind: instance.actionKind
      });
    }
    if (hitTrace) {
      this.traceHitCount(
        sourceId,
        this.playerName,
        "skill",
        totalHits,
        hitTrace
      );
    }

    if (kit.dotStacksPerSkill) {
      const postureDot = this.applyPostureBonus(
        this.scaledPostureDamage(enemyAttrs.maxPosture, PLAYER_COMBAT.dot.postureRatio)
      );
      for (let i = 0; i < kit.dotStacksPerSkill; i++) {
        this.addDotStack("enemy", {
          element: this.dotElementForSource("player"),
          sourceId,
          damagePerTick: PLAYER_COMBAT.dot.damage,
          postureDamagePerTick: postureDot,
          remainingTurns: PLAYER_COMBAT.dot.duration,
          appliedTurn: this.activeTurnNumber,
        });
      }
      this.log("DoT aplicado", "player", {
        kind: "dot",
        target: "enemy",
        actionKind: "dot"
      });
    }
    this.tryTriggerSigilSkillBuff("skill");
  }

  private enemyAutoAttack(): void {
    const attrs = this.enemy.enemy().attributes;
    const sourceId = attrs.id ?? attrs.name ?? "enemy";
    const targetId = this.player.state().kaelisId ?? "player";
    const mod = this.trackModifiers();
    const behavior = this.enemyBehavior;
    const auto = behavior?.auto;
    const baseDamage = Math.floor(attrs.attack * (auto?.multiplier ?? 0.9));
    const postureRatio = auto?.postureRatio ?? ENEMY_COMBAT.autoPostureRatio;
    const multiRatio = ENEMY_COMBAT.multiPostureRatio ?? postureRatio;
    const mainPosture = Math.floor(
      this.scaledPostureDamage(this.player.state().attributes.maxPosture, postureRatio) *
        mod.damageMitigation
    );
    const multiPosture = Math.floor(
      this.scaledPostureDamage(this.player.state().attributes.maxPosture, multiRatio) *
        mod.damageMitigation
    );
    const hitCountContext = this.currentHitCountContext();
    const totalHits = resolveActorHitCount(this.enemy.enemy(), hitCountContext);
    const hitTrace: { hitIndex: number; amount: number }[] | null =
      DEV_COMBAT.traceHitCount ? [] : null;
    const actionCrit = this.random() < attrs.critChance;
    const critMultiplier = actionCrit ? attrs.critDamage : 1;
    const baseHitDamage = Math.max(
      1,
      Math.floor(baseDamage * critMultiplier * mod.damageMitigation)
    );
    const postureTracker = createPostureOverkillTracker(
      this.player.state().attributes.maxPosture,
      this.player.state().attributes.posture,
      POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION
    );

    for (let hitIndex = 0; hitIndex < totalHits; hitIndex += 1) {
      const isCrit = actionCrit;
      const damage = applyMultiHitHpScalar(baseHitDamage, hitIndex);
      const postureBase = hitIndex === 0 ? mainPosture : multiPosture;
      const postureAfterCrit = this.applyCritToPosture(
        postureBase,
        isCrit,
        critMultiplier
      );
      const postureScaled = applyMultiHitPostureScalar(
        postureAfterCrit,
        hitIndex
      );
      const postureDamage = postureTracker.apply(postureScaled);
      const instance: DamageInstanceEvent = {
        sourceId,
        targetId,
        actionKind: "enemyAttack",
        hitIndex,
        hitCount: totalHits,
        amountHp: damage,
        amountPosture: postureDamage,
        isCrit,
        timestamp: Date.now()
      };

      const damageTaken = this.applyHitToPlayer(
        instance.amountHp,
        instance.amountPosture,
        instance.isCrit ? "crit" : "dmg",
        {
          hitCount: instance.hitCount,
          hitIndex: instance.hitIndex,
          actionKind: instance.actionKind
        }
      );
      this.log(`-${damageTaken} HP`, "enemy", {
        kind: "damage",
        target: "player",
        value: damageTaken,
        hitCount: instance.hitCount,
        hitIndex: instance.hitIndex,
        actionKind: instance.actionKind
      });
      if (hitTrace) {
        hitTrace.push({ hitIndex: instance.hitIndex, amount: damageTaken });
      }
    }
    if (hitTrace) {
      this.traceHitCount(
        sourceId,
        attrs.name ?? sourceId,
        "enemyAttack",
        totalHits,
        hitTrace
      );
    }

    const dot = behavior?.dot;
    const dotChance = dot?.chance ?? attrs.dotChance;
    if (dotChance && this.random() < dotChance) {
      const postureDot = this.scaledPostureDamage(
        this.player.state().attributes.maxPosture,
        dot?.postureRatio ?? ENEMY_COMBAT.dot.postureRatio
      );
      this.addDotStack("player", {
        element: this.dotElementForSource("enemy"),
        sourceId,
        damagePerTick: dot?.damage ?? ENEMY_COMBAT.dot.damage,
        postureDamagePerTick: postureDot,
        remainingTurns: dot?.duration ?? ENEMY_COMBAT.dot.duration,
        appliedTurn: this.activeTurnNumber,
      });
      this.log("DoT sofrido", "enemy", {
        kind: "dot",
        target: "player",
        actionKind: "dot"
      });
    }
  }

  private enemyStrongAttack(): void {
    const attrs = this.enemy.enemy().attributes;
    const sourceId = attrs.id ?? attrs.name ?? "enemy";
    const targetId = this.player.state().kaelisId ?? "player";
    const mod = this.trackModifiers();
    const heavy = this.enemyBehavior?.heavy;
    const multiplier = heavy?.multiplier ?? 1.6;
    const baseDamage = Math.max(1, Math.floor(attrs.attack * multiplier));
    const bonusDamage =
      heavy?.onceBonusAttack && !this.enemyHeavyBonusConsumed
        ? heavy.onceBonusAttack
        : 0;
    if (bonusDamage > 0) {
      this.enemyHeavyBonusConsumed = true;
    }
    const postureRatio =
      heavy?.postureRatio ?? ENEMY_COMBAT.multiPostureRatio ?? ENEMY_COMBAT.autoPostureRatio;
    const multiRatio = ENEMY_COMBAT.multiPostureRatio ?? postureRatio;
    const mainPosture = Math.floor(
      this.scaledPostureDamage(this.player.state().attributes.maxPosture, postureRatio) *
        mod.damageMitigation
    );
    const multiPosture = Math.floor(
      this.scaledPostureDamage(this.player.state().attributes.maxPosture, multiRatio) *
        mod.damageMitigation
    );
    const hitCountContext = this.currentHitCountContext();
    const totalHits = resolveActorHitCount(this.enemy.enemy(), hitCountContext);
    const hitTrace: { hitIndex: number; amount: number }[] | null =
      DEV_COMBAT.traceHitCount ? [] : null;
    const label = heavy?.name ?? "Heavy";
    const actionCrit = this.random() < attrs.critChance;
    const critMultiplier = actionCrit ? attrs.critDamage : 1;
    const postureTracker = createPostureOverkillTracker(
      this.player.state().attributes.maxPosture,
      this.player.state().attributes.posture,
      POSTURE_OVERKILL_CAP_FRACTION_PER_ACTION
    );

    for (let hitIndex = 0; hitIndex < totalHits; hitIndex += 1) {
      const isCrit = actionCrit;
      const hitBase = hitIndex === 0 ? baseDamage + bonusDamage : baseDamage;
      const baseHitDamage = Math.max(
        1,
        Math.floor(hitBase * critMultiplier * mod.damageMitigation)
      );
      const damage = applyMultiHitHpScalar(baseHitDamage, hitIndex);
      const postureBase = hitIndex === 0 ? mainPosture : multiPosture;
      const postureAfterCrit = this.applyCritToPosture(
        postureBase,
        isCrit,
        critMultiplier
      );
      const postureScaled = applyMultiHitPostureScalar(
        postureAfterCrit,
        hitIndex
      );
      const postureDamage = postureTracker.apply(postureScaled);
      const instance: DamageInstanceEvent = {
        sourceId,
        targetId,
        actionKind: "enemySkill",
        hitIndex,
        hitCount: totalHits,
        amountHp: damage,
        amountPosture: postureDamage,
        isCrit,
        timestamp: Date.now()
      };
      const damageTaken = this.applyHitToPlayer(
        instance.amountHp,
        instance.amountPosture,
        instance.isCrit ? "crit" : "dmg",
        {
          hitCount: instance.hitCount,
          hitIndex: instance.hitIndex,
          actionKind: instance.actionKind
        }
      );
      this.log(`${label} -${damageTaken} HP`, "enemy", {
        kind: "damage",
        target: "player",
        value: damageTaken,
        hitCount: instance.hitCount,
        hitIndex: instance.hitIndex,
        actionKind: instance.actionKind
      });
      if (hitTrace) {
        hitTrace.push({ hitIndex: instance.hitIndex, amount: damageTaken });
      }
    }
    if (hitTrace) {
      this.traceHitCount(
        sourceId,
        attrs.name ?? sourceId,
        "enemySkill",
        totalHits,
        hitTrace
      );
    }
    this.enemyHeavyActivations += 1;
    this.enemy.resolveStrongAttack();
  }

  private executeCycleAction(action: "charge" | "slam" | "auto"): void {
    const state = this.enemy.enemy();
    if (action === "charge") {
      if (!state.attributes.strongAttackReady) {
        this.enemy.prepareStrongAttack();
        this.log(`${state.attributes.name} gathers power!`, "enemy");
      }
      return;
    }
    if (action === "slam") {
      if (state.attributes.strongAttackReady) {
        this.enemyStrongAttack();
      } else if (this.enemyBehavior?.heavy) {
        this.enemy.prepareStrongAttack();
      } else {
        this.enemyAutoAttack();
      }
      return;
    }
    this.enemyAutoAttack();
  }

  private applyHitToEnemy(
    damage: number,
    postureDamage: number,
    type: "dmg" | "crit" | "dot" | "posture",
    hitMeta?: { hitCount?: number; hitIndex?: number; actionKind?: HitActionKind }
  ): number {
    const enemy = this.enemy.enemy();
    const startPosture = enemy.attributes.posture;
    const scaledDamage = this.scalePlayerDamage(damage);
    this.enemy.applyDamage(scaledDamage, postureDamage);
    this.pushFloat(scaledDamage, type, "enemy", hitMeta);
    this.ui.triggerEnemyFlash();
    const updated = this.enemy.enemy();
    this.turnSummary.damageToEnemy += scaledDamage;
    const postureLost = Math.max(0, startPosture - updated.attributes.posture);
    this.turnSummary.postureToEnemy += postureLost;

    const brokeNow =
      updated.attributes.posture === 0 && enemy.attributes.posture !== 0;
    if (brokeNow && updated.state !== "dead") {
      if (this.enemyPostureFullAtActionStart) {
        this.enemy.setBreak("superbroken", 2);
        this.log("Superquebra!", "player", {
          kind: "superbreak",
          target: "enemy",
          actionKind: "break"
        });
        this.lastEvent.set("superbreak");
      } else {
        this.enemy.setBreak("broken", 1);
        this.log("Quebra!", "player", {
          kind: "break",
          target: "enemy",
          actionKind: "break"
        });
      }
      this.enemyPostureFullAtActionStart = false;
    }
    return scaledDamage;
  }

  private applyHitToPlayer(
    damage: number,
    postureDamage: number,
    type: "dmg" | "crit" | "dot" | "posture",
    hitMeta?: { hitCount?: number; hitIndex?: number; actionKind?: HitActionKind }
  ): number {
    const player = this.player.state();
    const startPosture = player.attributes.posture;
    const breakReduction = this.trackModifiers().breakReduction;
    const turns = type === "dmg" || type === "crit" ? 2 : 1;
    const damageTaken = computeDamageTaken(
      damage,
      player.attributes.damageReductionPercent
    );

    this.player.applyDamage(damageTaken, postureDamage);
    this.pushFloat(damageTaken, type, "player", hitMeta);
    this.ui.triggerPlayerFlash();
    const updated = this.player.state();
    this.turnSummary.damageToPlayer += damageTaken;
    const postureLost = Math.max(0, startPosture - updated.attributes.posture);
    this.turnSummary.postureToPlayer += postureLost;

    const brokeNow =
      updated.attributes.posture === 0 && player.attributes.posture !== 0;
    if (brokeNow && updated.attributes.hp > 0) {
      if (this.playerPostureFullAtActionStart) {
        this.player.setStatus("superbroken", 2);
        this.log("SUPERQUEBRA!", "enemy", {
          kind: "superbreak",
          target: "player",
          actionKind: "break"
        });
        this.lastEvent.set("superbreak");
      } else {
        this.player.setStatus("broken", Math.max(1, turns - breakReduction));
        this.log(`${this.playerName} entered BREAK!`, "enemy", {
          kind: "break",
          target: "player",
          actionKind: "break"
        });
      }
      this.playerPostureFullAtActionStart = false;
    }
    return damageTaken;
  }

  private endOfTurn(actor: "player" | "enemy"): void {
    if (actor === "player") {
      this.resolveDotStacksForTarget("enemy");
      this.regenPostureForActor("player");
      this.finishPlayerTurn();
    } else {
      this.resolveDotStacksForTarget("player");
      this.regenPostureForActor("enemy");
      this.finishEnemyTurn();
    }
    this.runContext?.tickTurnUpgrades?.(actor);
    const summary = this.buildTurnSummary(actor);
    if (summary) {
      this.log(summary, "system", {
        kind: "summary",
        target: actor,
      });
    }
    this.recordSnapshot(this.activeTurnNumber);
  }

  private addDotStack(
    target: DotTarget,
    stack: Omit<DotStack, "id">
  ): void {
    const entry: DotStack = {
      ...stack,
      id: this.nextDotId()
    };
    if (target === "enemy") {
      this.enemyDots = [...this.enemyDots, entry];
    } else {
      this.playerDots = [...this.playerDots, entry];
    }
  }

  private resolveDotStacksForTarget(target: DotTarget): void {
    const stacks = target === "enemy" ? this.enemyDots : this.playerDots;
    if (!stacks.length) return;
    const resolution = resolveDotStacks(stacks);
    const stackCount = resolution.stackCount;
    const totalHp = resolution.totalHpDamage;
    const totalPosture = resolution.totalPostureDamage;
    const source: LogActor = target === "enemy" ? "player" : "enemy";
    const targetLabel = target === "enemy" ? "Enemy" : this.playerName;

    if (totalHp > 0 || totalPosture > 0) {
      const { hpApplied, postureLoss } = this.applyDotTick(
        target,
        totalHp,
        totalPosture
      );
      if (hpApplied > 0 || postureLoss > 0) {
        const postureInfo =
          postureLoss > 0 ? ` / -${postureLoss} posture` : "";
        const stackInfo = stackCount > 1 ? ` (x${stackCount})` : "";
        this.log(
          `${targetLabel} suffers DoT${stackInfo}: -${hpApplied} HP${postureInfo}`,
          source,
          {
            kind: "dot",
            target,
            value: hpApplied > 0 ? hpApplied : undefined,
            actionKind: "dot"
          }
        );
        if (hpApplied > 0) {
          this.pushFloat(hpApplied, "dot", target, {
            actionKind: "dot"
          });
        }
        if (target === "enemy") {
          this.turnSummary.dotOnEnemy = true;
        } else {
          this.turnSummary.dotOnPlayer = true;
        }
      }
    }

    if (target === "enemy") {
      this.enemyDots = resolution.nextStacks;
    } else {
      this.playerDots = resolution.nextStacks;
    }
  }

  private applyDotTick(
    target: "player" | "enemy",
    hpDamage: number,
    postureDamage: number
  ): { hpApplied: number; postureLoss: number } {
    if (target === "enemy") {
      const before = this.enemy.enemy();
      const outcome = applyDotTickToEnemy({
        hpDamage,
        postureDamage,
        hp: before.attributes.hp,
        posture: before.attributes.posture,
        state: before.state
      });
      if (outcome.hpApplied <= 0 && outcome.postureLoss <= 0) {
        return { hpApplied: 0, postureLoss: 0 };
      }
      this.enemy.enemy.set({
        ...before,
        attributes: {
          ...before.attributes,
          hp: outcome.nextHp,
          posture: outcome.nextPosture,
        },
        state: outcome.nextState
      });
      this.turnSummary.damageToEnemy += outcome.hpApplied;
      this.turnSummary.postureToEnemy += outcome.postureLoss;
      return { hpApplied: outcome.hpApplied, postureLoss: outcome.postureLoss };
    }

    const before = this.player.state();
    const outcome = applyDotTickToPlayer({
      hpDamage,
      postureDamage,
      hp: before.attributes.hp,
      posture: before.attributes.posture,
      status: before.status,
      damageReductionPercent: before.attributes.damageReductionPercent
    });
    if (outcome.hpApplied <= 0 && outcome.postureLoss <= 0) {
      return { hpApplied: 0, postureLoss: 0 };
    }
    this.player.state.set({
      ...before,
      attributes: {
        ...before.attributes,
        hp: outcome.nextHp,
        posture: outcome.nextPosture,
      },
    });
    this.turnSummary.damageToPlayer += outcome.hpApplied;
    this.turnSummary.postureToPlayer += outcome.postureLoss;
    return { hpApplied: outcome.hpApplied, postureLoss: outcome.postureLoss };
  }

  private regenPostureForActor(actor: "player" | "enemy"): void {
    if (actor === "player") {
      const player = this.player.state();
      if (player.status === "normal") {
        const bonus = this.trackModifiers().postureRegenBonus;
        const amount = (PLAYER_COMBAT.postureRegen ?? 0) + bonus;
        if (amount > 0) {
          this.player.regenPosture(amount);
        }
      }
      return;
    }

    const enemy = this.enemy.enemy();
    if (enemy.state === "normal") {
      this.enemy.regenPosture(ENEMY_COMBAT.postureRegen ?? 0);
    }
  }

  private finishPlayerTurn(): void {
    this.player.tickSkillCooldown();
    const buffSource = this.player.getSigilDamageBuffSource();
    const buffStatus = this.player.tickSigilDamageBuff();
    if (buffStatus === 'expired' && buffSource) {
      this.logSigilBuffExpiry(buffSource);
    }
    const attrs = this.player.state().attributes;
    const regenPercent =
      typeof attrs.energyRegenPercent === "number"
        ? attrs.energyRegenPercent
        : 100;
    const regen = Math.max(
      0,
      Math.floor(((PLAYER_COMBAT.baseEnergyRegen ?? 12) * regenPercent) / 100)
    );
    if (regen > 0) {
      this.player.gainEnergy(regen);
      this.log(`+${regen} EP`, "player", {
        kind: "energy",
        target: "player",
        value: regen,
      });
    }
  }

  private finishEnemyTurn(): void {
    // Placeholder for future enemy end-of-turn effects.
  }

  private pushFloat(
    value: number,
    type: "dmg" | "crit" | "dot" | "posture",
    target: "player" | "enemy",
    hitMeta?: { hitCount?: number; hitIndex?: number; actionKind?: HitActionKind }
  ): void {
    this.ui.pushFloatEvent({
      value: `-${value}`,
      type,
      target,
      hitCount: hitMeta?.hitCount,
      hitIndex: hitMeta?.hitIndex,
      actionKind: hitMeta?.actionKind
    });
  }

  private log(
    text: string,
    actor: "player" | "enemy" | "system",
    meta?: {
      turn?: number;
      kind?: LogKind;
      value?: number;
      target?: "player" | "enemy";
      hitCount?: number;
      hitIndex?: number;
      actionKind?: HitActionKind;
    }
  ): void {
    const turnNumber =
      typeof meta?.turn === "number" ? meta.turn : this.activeTurnNumber;
    const decorated = DEV_COMBAT.showTurnIndex
      ? `[T${turnNumber}] ${text}`
      : text;
    const id = `evt-${++this.eventCounter}`;
    this.turnEvents.push({
      id,
      text: decorated,
      actor,
      turn: turnNumber,
      kind: meta?.kind,
      value: meta?.value,
      target: meta?.target,
      hitCount: meta?.hitCount,
      hitIndex: meta?.hitIndex,
      actionKind: meta?.actionKind,
    });
    this.ui.pushLog(decorated, actor, turnNumber, id, {
      kind: meta?.kind ?? "system",
      value: meta?.value,
      target: meta?.target,
      hitCount: meta?.hitCount,
      hitIndex: meta?.hitIndex,
      actionKind: meta?.actionKind,
    });
  }

  private recordSnapshot(turnIndex: number): void {
    const snapshot: BattleSnapshot = {
      seed: this.currentSeed,
      turnIndex,
      playerState: this.serializePlayerState(),
      enemyState: this.serializeEnemyState(),
      events: this.turnEvents.map((evt) => ({ ...evt })),
    };
    this.turnEvents = [];
    this.snapshots.update((list) => [...list, snapshot]);
  }

  private applySnapshot(snapshot: BattleSnapshot): void {
    this.applySerializedPlayer(snapshot.playerState);
    this.applySerializedEnemy(snapshot.enemyState);
    this.playerDots = (snapshot.playerState.dots ?? []).map((dot) => ({
      ...dot,
    }));
    this.enemyDots = (snapshot.enemyState.dots ?? []).map((dot) => ({
      ...dot,
    }));
    this.activeTurnNumber = snapshot.turnIndex;
  }

  private applySerializedPlayer(state: SerializedPlayerState): void {
    const current = this.player.state();
    this.player.state.set({
      attributes: { ...state.attributes },
      buffs: state.buffs ?? [],
      status: state.status,
      breakTurns: state.breakTurns,
      skillCooldown: state.skillCooldown,
      kaelisRoute: state.kaelisRoute ?? current.kaelisRoute,
      kaelisId: state.kaelisId ?? current.kaelisId,
      kaelisName: state.kaelisName ?? current.kaelisName,
      kaelisSprite: state.kaelisSprite ?? current.kaelisSprite,
      kit: state.kit ?? current.kit,
      weaponId: state.weaponId ?? current.weaponId,
      sigilSetCounts: state.sigilSetCounts ?? current.sigilSetCounts,
      sigilSkillBuffs: state.sigilSkillBuffs ?? current.sigilSkillBuffs,
      sigilDamageBuffPercent: state.sigilDamageBuffPercent ?? 0,
      sigilDamageBuffTurns: state.sigilDamageBuffTurns ?? 0,
      sigilDamageBuffSource: state.sigilDamageBuffSource ?? undefined,
    });
  }

  private applySerializedEnemy(state: SerializedEnemyState): void {
    this.enemy.enemy.set({
      attributes: { ...state.attributes },
      state: state.state,
      breakTurns: state.breakTurns,
    });
  }

  private checkOutcome(): boolean {
    const enemyState = this.enemy.enemy();
    const playerState = this.player.state();
    if (enemyState.state === "dead") {
      this.runContext?.finishBattle("victory");
      return true;
    }
    if (playerState.attributes.hp <= 0) {
      this.runContext?.finishBattle("defeat");
      return true;
    }
    return false;
  }

  private trackModifiers(): {
    critDamageMult: number;
    damageMitigation: number;
    postureRegenBonus: number;
    breakReduction: number;
    attackMult: number;
    penetrationBonus: number;
  } {
    const levels = this.runContext?.getTrackLevels() ?? { A: 0, B: 0, C: 0 };
    const critDamageMult = 1 + 0.05 * levels.A;
    const damageMitigation = 1 - Math.min(0.35, 0.05 * levels.B);
    const postureRegenBonus = Math.min(12, 3 * levels.B);
    const breakReduction = Math.min(2, levels.B);
    const attackMult = 1 + 0.05 * levels.C;
    const penetrationBonus = Math.min(0.4, 0.04 * levels.C);
    return {
      critDamageMult,
      damageMitigation,
      postureRegenBonus,
      breakReduction,
      attackMult,
      penetrationBonus,
    };
  }

  private getPlayerPowerMultiplier(): number {
    const room = this.runContext?.getCurrentRoom?.() ?? 1;
    return getPlayerPowerMultiplier(room);
  }

  private scalePlayerDamage(amount: number): number {
    if (amount <= 0) return 0;
    const multiplier = this.getPlayerPowerMultiplier();
    return Math.max(1, Math.floor(amount * multiplier));
  }

  private random(): number {
    return this.battleRng.nextFloat();
  }

  private randomSeed(): number {
    return this.rng.nextInt(0, 1_000_000_000);
  }

  private nextDotId(): string {
    return `dot-${++this.dotCounter}`;
  }

  private dotElementForSource(source: DotTarget): ElementType {
    return source === "enemy" ? "poison" : "burn";
  }

  private getRunPhase(): RunPhase {
    return this.runContext?.getPhase() ?? "idle";
  }

  private currentHitCountContext(): HitCountContext | undefined {
    return this.runContext?.getHitCountContext?.();
  }

  private scaledPostureDamage(maxPosture: number, ratio: number): number {
    return Math.max(1, Math.floor(maxPosture * ratio));
  }

  private resetTurnSummary(): void {
    this.turnSummary = {
      damageToEnemy: 0,
      damageToPlayer: 0,
      postureToEnemy: 0,
      postureToPlayer: 0,
      dotOnEnemy: false,
      dotOnPlayer: false,
    };
  }

  private buildTurnSummary(actor: "player" | "enemy"): string | null {
    const dmg =
      actor === "player"
        ? this.turnSummary.damageToEnemy
        : this.turnSummary.damageToPlayer;
    const posture =
      actor === "player"
        ? this.turnSummary.postureToEnemy
        : this.turnSummary.postureToPlayer;
    const dotActive =
      actor === "player"
        ? this.turnSummary.dotOnEnemy
        : this.turnSummary.dotOnPlayer;

    if (!dmg && !posture && !dotActive) return null;

    const parts: string[] = [];
    if (dmg) parts.push(`${dmg} dmg`);
    if (posture) parts.push(`${posture} posture`);
    if (dotActive) parts.push("DoT applied");

    const actorLabel = actor === "player" ? this.playerName : "Enemy";
    return `Turn ${this.activeTurnNumber} summary (${actorLabel}): ${parts.join(
      " | "
    )}`;
  }

  private tryTriggerSigilSkillBuff(trigger: "skill"): void {
    const buffs = this.player
      .getSigilSkillBuffs()
      .filter(buff => buff.trigger === trigger);
    if (!buffs.length) return;
    buffs.forEach(buff => {
      const outcome = this.player.activateSigilDamageBuff(
        buff.setKey,
        buff.damagePercent,
        buff.durationTurns
      );
      if (outcome === "none") return;
      this.logSigilBuffActivation(buff.setKey, buff.damagePercent, buff.durationTurns, outcome);
    });
  }

  private logSigilBuffActivation(
    setKey: SigilSetKey,
    percent: number,
    turns: number,
    outcome: "activated" | "refreshed"
  ): void {
    const label = this.sigilSetLabel(setKey);
    const action = outcome === "activated" ? "activates" : "refreshes";
    this.log(`${label} surge ${action}: +${percent}% damage for ${turns} turns.`, "player");
  }

  private logSigilBuffExpiry(setKey: SigilSetKey): void {
    const label = this.sigilSetLabel(setKey);
    this.log(`${label} surge fades.`, "player");
  }

  private sigilSetLabel(key: SigilSetKey | undefined): string {
    if (!key) return "Sigil";
    return SIGIL_SETS[key]?.name ?? "Sigil";
  }

  private applyPostureBonus(base: number): number {
    if (base <= 0) {
      return 0;
    }
    const bonusPercent =
      this.player.state().attributes.postureDamageBonusPercent ?? 0;
    const multiplier = 1 + bonusPercent / 100;
    return Math.max(1, Math.floor(base * multiplier));
  }

  private applyCritToPosture(
    base: number,
    isCrit: boolean,
    critMultiplier: number
  ): number {
    if (base <= 0) return 0;
    if (!isCrit) return base;
    return Math.max(1, Math.floor(base * critMultiplier));
  }

  private traceHitCount(
    attackerId: string,
    attackerName: string,
    actionKind: HitActionKind,
    hitCount: number,
    hits: { hitIndex: number; amount: number }[]
  ): void {
    if (!DEV_COMBAT.traceHitCount) return;
    console.debug("[hitCount]", {
      attackerId,
      attackerName,
      actionKind,
      hitCount,
      hits
    });
  }

  private get playerName(): string {
    return this.player.state().kaelisName || "Kaelis";
  }

  private shouldStartHeavyAttack(heavy: EnemyBehaviorProfile["heavy"]): boolean {
    if (!heavy) return false;
    if (typeof heavy.maxActivations === "number" && this.enemyHeavyActivations >= heavy.maxActivations) {
      return false;
    }
    if (heavy.trigger === "cycle") {
      const interval = heavy.cycleTurns ?? 3;
      if (interval <= 0) return false;
      return (this.enemyCycleTurn + 1) % interval === 0;
    }
    const probability = heavy.probability ?? 0.3;
    return this.random() < probability;
  }
}


