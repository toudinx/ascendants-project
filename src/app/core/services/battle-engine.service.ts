import { Injectable, OnDestroy, inject, signal } from "@angular/core";
import { EnemyStateService } from "./enemy-state.service";
import { PlayerStateService } from "./player-state.service";
import { UiStateService, LogKind } from "./ui-state.service";
import { SeededRng } from "../utils/seeded-rng";
import { DEV_COMBAT } from "../config/dev-combat.config";
import {
  BattleEvent,
  BattleSnapshot,
  SerializedEnemyState,
  SerializedPlayerState,
  buildLogFromSnapshots,
  SerializedDotStack,
} from "../models/battle-snapshot.model";
import { RunPhase } from "../models/run.model";
import { TrackKey } from "../models/tracks.model";
import { SIGIL_SETS } from "../../content/equipment/sigils";
import { RingSetKey } from "../models/ring.model";
import { BALANCE_CONFIG } from "../../content/balance/balance.config";
import { getPlayerPowerMultiplier } from "../config/balance.config";
import { EnemyBehaviorProfile } from "./enemy-factory.service";

type Turn = "player" | "enemy";

interface TurnState {
  number: number;
  actor: Turn;
}

type DotStack = SerializedDotStack;
type DotSource = DotStack["source"];

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

interface RunContext {
  getPhase: () => RunPhase;
  getTrackLevels: () => Record<TrackKey, number>;
  getCurrentRoom: () => number;
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

  private rng: SeededRng;
  private currentSeed: number;
  private eventCounter = 0;
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

  constructor() {
    this.currentSeed = this.randomSeed();
    this.rng = new SeededRng(this.currentSeed);
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
    this.rng = new SeededRng(this.currentSeed);
    this.eventCounter = 0;
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
    this.rng = new SeededRng(this.currentSeed);
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
      ringSetCounts: player.ringSetCounts ? { ...player.ringSetCounts } : undefined,
      ringSkillBuffs: player.ringSkillBuffs ? [...player.ringSkillBuffs] : undefined,
      ringDamageBuffPercent: player.ringDamageBuffPercent,
      ringDamageBuffTurns: player.ringDamageBuffTurns,
      ringDamageBuffSource: player.ringDamageBuffSource,
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
      1 + ((attrs.damageBonusPercent ?? 0) + this.player.getRingDamageBuffPercent()) / 100;
    const isCrit = this.random() < attrs.critChance;
    const damage = Math.max(
      1,
      Math.floor(
        baseDamage *
          damageBonus *
          (isCrit ? attrs.critDamage * mod.critDamageMult : 1)
      )
    );
    const postureDamage = this.applyPostureBonus(
      this.scaledPostureDamage(enemyAttrs.maxPosture, PLAYER_COMBAT.autoPostureRatio)
    );

    const appliedDamage = this.applyHitToEnemy(damage, postureDamage, isCrit ? "crit" : "dmg");
    this.log(`-${appliedDamage} HP`, "player", {
      kind: "damage",
      target: "enemy",
      value: appliedDamage,
    });

    const multiChance = Math.min(
      1,
      attrs.multiHitChance + (kit.multihitBonus ?? 0)
    );
    if (this.random() < multiChance) {
      const mhDamage = Math.max(1, Math.floor(baseDamage * 0.4 * damageBonus));
      const multiRatio = PLAYER_COMBAT.multiPostureRatio ?? PLAYER_COMBAT.autoPostureRatio;
      const multiPosture = this.applyPostureBonus(
        this.scaledPostureDamage(enemyAttrs.maxPosture, multiRatio)
      );
      const appliedMultiDamage = this.applyHitToEnemy(mhDamage, multiPosture, "posture");
      this.log(`+${appliedMultiDamage} multi`, "player", {
        kind: "multihit",
        target: "enemy",
        value: appliedMultiDamage,
      });
    }

    if (this.random() < attrs.dotChance) {
      const postureDot = this.applyPostureBonus(
        this.scaledPostureDamage(enemyAttrs.maxPosture, PLAYER_COMBAT.dot.postureRatio)
      );
      this.addDotStack("enemy", {
        source: "player",
        ticksRemaining: PLAYER_COMBAT.dot.duration,
        tickHp: PLAYER_COMBAT.dot.damage,
        tickPosture: postureDot,
      });
      this.log("DoT aplicado", "player", { kind: "dot", target: "enemy" });
    }
  }

  private useActiveSkill(): void {
    const attrs = this.player.state().attributes;
    const enemyAttrs = this.enemy.enemy().attributes;
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
      1 + ((attrs.damageBonusPercent ?? 0) + this.player.getRingDamageBuffPercent()) / 100;
    const finalDamage = Math.max(1, Math.floor(baseDamage * damageBonus));
    const skillPostureRatio = PLAYER_COMBAT.skillPostureRatio ?? PLAYER_COMBAT.autoPostureRatio;
    const postureDamage = this.applyPostureBonus(
      this.scaledPostureDamage(enemyAttrs.maxPosture, skillPostureRatio)
    );
    this.player.activateSkill(
      kit.skillEnergyCost,
      kit.skillCooldownTurns
    );
    const appliedDamage = this.applyHitToEnemy(finalDamage, postureDamage, "dmg");
    this.log(`Skill ${appliedDamage} dmg`, "player", {
      kind: "damage",
      target: "enemy",
      value: appliedDamage,
    });
    const extraHits = Math.max(0, (kit.skillHits ?? 1) - 1);
    for (let i = 0; i < extraHits; i++) {
      const extra = Math.max(1, Math.floor(finalDamage * 0.5));
      const extraPosture = this.applyPostureBonus(
        this.scaledPostureDamage(
          enemyAttrs.maxPosture,
          PLAYER_COMBAT.multiPostureRatio ?? PLAYER_COMBAT.autoPostureRatio
        )
      );
      this.applyHitToEnemy(extra, extraPosture, "posture");
    }

    if (kit.dotStacksPerSkill) {
      const postureDot = this.applyPostureBonus(
        this.scaledPostureDamage(enemyAttrs.maxPosture, PLAYER_COMBAT.dot.postureRatio)
      );
      for (let i = 0; i < kit.dotStacksPerSkill; i++) {
        this.addDotStack("enemy", {
          source: "player",
          ticksRemaining: PLAYER_COMBAT.dot.duration,
          tickHp: PLAYER_COMBAT.dot.damage,
          tickPosture: postureDot,
        });
      }
      this.log("DoT aplicado", "player", { kind: "dot", target: "enemy" });
    }
    this.tryTriggerRingSkillBuff("skill");
  }

  private enemyAutoAttack(): void {
    const attrs = this.enemy.enemy().attributes;
    const mod = this.trackModifiers();
    const behavior = this.enemyBehavior;
    const auto = behavior?.auto;
    const baseDamage = Math.floor(attrs.attack * (auto?.multiplier ?? 0.9));
    const isCrit = this.random() < attrs.critChance;
    const damage = Math.max(
      1,
      Math.floor(
        baseDamage * (isCrit ? attrs.critDamage : 1) * mod.damageMitigation
      )
    );
    const postureRatio = auto?.postureRatio ?? ENEMY_COMBAT.autoPostureRatio;

    const postureDamage = Math.floor(
      this.scaledPostureDamage(this.player.state().attributes.maxPosture, postureRatio) *
        mod.damageMitigation
    );

    this.applyHitToPlayer(damage, postureDamage, isCrit ? "crit" : "dmg");
    this.log(`-${damage} HP`, "enemy", {
      kind: "damage",
      target: "player",
      value: damage,
    });

    const dot = behavior?.dot;
    const dotChance = dot?.chance ?? attrs.dotChance;
    if (dotChance && this.random() < dotChance) {
      const postureDot = this.scaledPostureDamage(
        this.player.state().attributes.maxPosture,
        dot?.postureRatio ?? ENEMY_COMBAT.dot.postureRatio
      );
      this.addDotStack("player", {
        source: "enemy",
        ticksRemaining: dot?.duration ?? ENEMY_COMBAT.dot.duration,
        tickHp: dot?.damage ?? ENEMY_COMBAT.dot.damage,
        tickPosture: postureDot,
      });
      this.log("DoT sofrido", "enemy", { kind: "dot", target: "player" });
    }
  }

  private enemyStrongAttack(): void {
    const attrs = this.enemy.enemy().attributes;
    const mod = this.trackModifiers();
    const heavy = this.enemyBehavior?.heavy;
    const multiplier = heavy?.multiplier ?? 1.6;
    let damage = Math.max(1, Math.floor(attrs.attack * multiplier * mod.damageMitigation));
    if (heavy?.onceBonusAttack && !this.enemyHeavyBonusConsumed) {
      damage += heavy.onceBonusAttack;
      this.enemyHeavyBonusConsumed = true;
    }
    const postureRatio =
      heavy?.postureRatio ?? ENEMY_COMBAT.multiPostureRatio ?? ENEMY_COMBAT.autoPostureRatio;
    const postureDamage = Math.floor(
      this.scaledPostureDamage(this.player.state().attributes.maxPosture, postureRatio) *
        mod.damageMitigation
    );
    this.applyHitToPlayer(damage, postureDamage, "dmg");
    const label = heavy?.name ?? "Heavy";
    this.log(`${label} ${damage} dmg`, "enemy", {
      kind: "damage",
      target: "player",
      value: damage,
    });
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
    type: "dmg" | "crit" | "dot" | "posture"
  ): number {
    const enemy = this.enemy.enemy();
    const startPosture = enemy.attributes.posture;
    const scaledDamage = this.scalePlayerDamage(damage);
    this.enemy.applyDamage(scaledDamage, postureDamage);
    this.pushFloat(scaledDamage, type, "enemy");
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
        });
        this.lastEvent.set("superbreak");
      } else {
        this.enemy.setBreak("broken", 1);
        this.log("Quebra!", "player", { kind: "break", target: "enemy" });
      }
      this.enemyPostureFullAtActionStart = false;
    }
    return scaledDamage;
  }

  private applyHitToPlayer(
    damage: number,
    postureDamage: number,
    type: "dmg" | "crit" | "dot" | "posture"
  ): void {
    const player = this.player.state();
    const startPosture = player.attributes.posture;
    const breakReduction = this.trackModifiers().breakReduction;
    const turns = type === "dmg" || type === "crit" ? 2 : 1;

    this.player.applyDamage(damage, postureDamage);
    this.pushFloat(damage, type, "player");
    this.ui.triggerPlayerFlash();
    const updated = this.player.state();
    this.turnSummary.damageToPlayer += damage;
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
        });
        this.lastEvent.set("superbreak");
      } else {
        this.player.setStatus("broken", Math.max(1, turns - breakReduction));
        this.log(`${this.playerName} entered BREAK!`, "enemy", {
          kind: "break",
          target: "player",
        });
      }
      this.playerPostureFullAtActionStart = false;
    }
  }

  private endOfTurn(actor: "player" | "enemy"): void {
    if (actor === "player") {
      this.resolveDotStacks("player");
      this.regenPostureForActor("player");
      this.finishPlayerTurn();
    } else {
      this.resolveDotStacks("enemy");
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

  private addDotStack(target: "player" | "enemy", stack: DotStack): void {
    if (target === "enemy") {
      this.enemyDots = [...this.enemyDots, stack];
    } else {
      this.playerDots = [...this.playerDots, stack];
    }
  }

  private resolveDotStacks(source: DotSource): void {
    const target = source === "player" ? "enemy" : "player";
    const stacks = target === "enemy" ? this.enemyDots : this.playerDots;
    if (!stacks.length) return;
    const relevant = stacks.filter((stack) => stack.source === source);
    if (!relevant.length) return;

    const totalHp = relevant.reduce((sum, stack) => sum + stack.tickHp, 0);
    const totalPosture = relevant.reduce(
      (sum, stack) => sum + stack.tickPosture,
      0
    );
    const { hpApplied, postureLoss } = this.applyDotTick(
      target,
      totalHp,
      totalPosture
    );
    if (hpApplied > 0 || postureLoss > 0) {
      const stackCount = relevant.length;
      const targetLabel = target === "enemy" ? "Enemy" : this.playerName;
      const postureInfo =
        postureLoss > 0 ? ` / -${postureLoss} posture` : "";
      this.log(
        `${targetLabel} suffers DoT (${stackCount} stacks): -${hpApplied} HP${postureInfo}`,
        source,
        {
          kind: "dot",
          target,
          value: hpApplied,
        }
      );
      if (target === "enemy") {
        this.turnSummary.dotOnEnemy = true;
      } else {
        this.turnSummary.dotOnPlayer = true;
      }
    }

    relevant.forEach((stack) => (stack.ticksRemaining -= 1));
    const remaining = stacks.filter((stack) => stack.ticksRemaining > 0);
    if (target === "enemy") {
      this.enemyDots = remaining;
    } else {
      this.playerDots = remaining;
    }
  }

  private applyDotTick(
    target: "player" | "enemy",
    hpDamage: number,
    postureDamage: number
  ): { hpApplied: number; postureLoss: number } {
    const hp = Math.max(0, Math.floor(hpDamage));
    const posture = Math.max(0, Math.floor(postureDamage));
    if (hp <= 0 && posture <= 0) {
      return { hpApplied: 0, postureLoss: 0 };
    }

    if (target === "enemy") {
      const before = this.enemy.enemy();
      if (before.state === "dead") {
        return { hpApplied: 0, postureLoss: 0 };
      }
      const startHp = before.attributes.hp;
      const startPosture = before.attributes.posture;
      const nextHp = Math.max(0, startHp - hp);
      let nextPosture = startPosture;
      if (before.state === "broken" || before.state === "superbroken") {
        nextPosture = 0;
      } else if (posture > 0) {
        nextPosture = Math.max(1, startPosture - posture);
      }

      const hpApplied = startHp - nextHp;
      const postureLoss = Math.max(0, startPosture - nextPosture);
      this.enemy.enemy.set({
        ...before,
        attributes: {
          ...before.attributes,
          hp: nextHp,
          posture: nextPosture,
        },
        state: nextHp <= 0 ? "dead" : before.state,
      });
      this.turnSummary.damageToEnemy += hpApplied;
      this.turnSummary.postureToEnemy += postureLoss;
      return { hpApplied, postureLoss };
    }

    const before = this.player.state();
    const startHp = before.attributes.hp;
    const startPosture = before.attributes.posture;
    const nextHp = Math.max(0, startHp - hp);
    let nextPosture = startPosture;
    if (before.status === "broken" || before.status === "superbroken") {
      nextPosture = 0;
    } else if (posture > 0) {
      nextPosture = Math.max(1, startPosture - posture);
    }
    const hpApplied = startHp - nextHp;
    const postureLoss = Math.max(0, startPosture - nextPosture);
    this.player.state.set({
      ...before,
      attributes: {
        ...before.attributes,
        hp: nextHp,
        posture: nextPosture,
      },
    });
    this.turnSummary.damageToPlayer += hpApplied;
    this.turnSummary.postureToPlayer += postureLoss;
    return { hpApplied, postureLoss };
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
    const buffSource = this.player.getRingDamageBuffSource();
    const buffStatus = this.player.tickRingDamageBuff();
    if (buffStatus === 'expired' && buffSource) {
      this.logRingBuffExpiry(buffSource);
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
    target: "player" | "enemy"
  ): void {
    this.ui.pushFloatEvent({ value: `-${value}`, type, target });
  }

  private log(
    text: string,
    actor: "player" | "enemy" | "system",
    meta?: {
      turn?: number;
      kind?: LogKind;
      value?: number;
      target?: "player" | "enemy";
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
    });
    this.ui.pushLog(decorated, actor, turnNumber, id, {
      kind: meta?.kind ?? "system",
      value: meta?.value,
      target: meta?.target,
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
      ringSetCounts: state.ringSetCounts ?? current.ringSetCounts,
      ringSkillBuffs: state.ringSkillBuffs ?? current.ringSkillBuffs,
      ringDamageBuffPercent: state.ringDamageBuffPercent ?? 0,
      ringDamageBuffTurns: state.ringDamageBuffTurns ?? 0,
      ringDamageBuffSource: state.ringDamageBuffSource ?? undefined,
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
    return DEV_COMBAT.deterministic ? this.rng.next() : Math.random();
  }

  private randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000_000);
  }

  private getRunPhase(): RunPhase {
    return this.runContext?.getPhase() ?? "idle";
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

  private tryTriggerRingSkillBuff(trigger: "skill"): void {
    const buffs = this.player
      .getRingSkillBuffs()
      .filter(buff => buff.trigger === trigger);
    if (!buffs.length) return;
    buffs.forEach(buff => {
      const outcome = this.player.activateRingDamageBuff(
        buff.setKey,
        buff.damagePercent,
        buff.durationTurns
      );
      if (outcome === "none") return;
      this.logRingBuffActivation(buff.setKey, buff.damagePercent, buff.durationTurns, outcome);
    });
  }

  private logRingBuffActivation(
    setKey: RingSetKey,
    percent: number,
    turns: number,
    outcome: "activated" | "refreshed"
  ): void {
    const label = this.ringSetLabel(setKey);
    const action = outcome === "activated" ? "activates" : "refreshes";
    this.log(`${label} surge ${action}: +${percent}% damage for ${turns} turns.`, "player");
  }

  private logRingBuffExpiry(setKey: RingSetKey): void {
    const label = this.ringSetLabel(setKey);
    this.log(`${label} surge fades.`, "player");
  }

  private ringSetLabel(key: RingSetKey | undefined): string {
    if (!key) return "Ring";
    return SIGIL_SETS[key]?.name ?? "Ring";
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
