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
} from "../models/battle-snapshot.model";
import { RunPhase } from "../models/run.model";
import { RouteKey } from "../models/routes.model";

type Turn = "player" | "enemy";

interface TurnState {
  number: number;
  actor: Turn;
}

interface DotState {
  damage: number;
  posture: number;
  ticks: number;
  originTurn: number;
}

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
  getRouteLevels: () => Record<RouteKey, number>;
  finishBattle: (result: "victory" | "defeat") => void;
}

const EP_REGEN_MIN = 8;
const EP_REGEN_MAX = 14;
const BASE_SUPERBREAK_CHANCE = 0.12;
const MAX_SUPERBREAK_CHANCE = 0.45;
const POSTURE_HEAVY_HIT_THRESHOLD = 0.35;
const PLAYER_POSTURE_HIT = 0.26;
const PLAYER_MULTI_POSTURE_HIT = 0.08;
const PLAYER_SKILL_POSTURE_HIT = 0.32;
const ENEMY_POSTURE_HIT = 0.22;
const ENEMY_STRONG_POSTURE_HIT = 0.38;

@Injectable({ providedIn: "root" })
export class BattleEngineService implements OnDestroy {
  private tickTimer?: ReturnType<typeof setTimeout>;
  private readonly loopDelay = 750;
  private queuedSkill = false;
  private enemyDot: DotState | null = null;
  private playerDot: DotState | null = null;

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
  private readonly enemy = inject(EnemyStateService);
  private readonly player = inject(PlayerStateService);
  private readonly ui = inject(UiStateService);

  constructor() {
    this.currentSeed = this.randomSeed();
    this.rng = new SeededRng(this.currentSeed);
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
    this.playerDot = null;
    this.enemyDot = null;
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
    if (!this.player.canUseSkill(40)) return;
    this.queuedSkill = true;
  }

  canUseActiveSkill(): boolean {
    return (
      this.player.canUseSkill(40) && this.player.state().status === "normal"
    );
  }

  serializePlayerState(): SerializedPlayerState {
    const player = this.player.state();
    return {
      attributes: { ...player.attributes },
      status: player.status,
      breakTurns: player.breakTurns,
      skillCooldown: player.skillCooldown,
      dot: this.playerDot ? { ...this.playerDot } : null,
      buffs: [...player.buffs],
    };
  }

  serializeEnemyState(): SerializedEnemyState {
    const enemy = this.enemy.enemy();
    return {
      attributes: { ...enemy.attributes },
      state: enemy.state,
      breakTurns: enemy.breakTurns,
      dot: this.enemyDot ? { ...this.enemyDot } : null,
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

    this.player.tickSkillCooldown();
    const regen = this.rollEnergyRegen();
    this.player.gainEnergy(regen);
    this.log(`+${regen} EP`, "player", {
      kind: "energy",
      target: "player",
      value: regen,
    });

    if (player.status === "broken" || player.status === "superbroken") {
      this.log("Velvet is broken and lost the turn.", "player");
      this.player.decrementBreak();
      this.endOfTurn("enemy");
      return;
    }

    if (this.queuedSkill && this.player.canUseSkill(40)) {
      this.useActiveSkill();
      this.queuedSkill = false;
      this.lastEvent.set("skill");
    } else {
      this.autoAttackPlayer();
    }

    this.endOfTurn("enemy");
  }

  private enemyTurn(): void {
    const enemyState = this.enemy.enemy();

    if (enemyState.state === "dead") return;

    if (enemyState.state === "broken" || enemyState.state === "superbroken") {
      this.log("Enemy is broken and loses the turn.", "enemy");
      this.enemy.decrementBreak();
      this.endOfTurn("player");
      return;
    }

    if (
      enemyState.state === "preparing" &&
      enemyState.attributes.strongAttackReady
    ) {
      this.enemyStrongAttack();
    } else {
      const roll = this.random();
      if (roll < 0.3) {
        this.enemy.prepareStrongAttack();
        this.log("Enemy is charging a heavy strike!", "enemy");
      } else {
        this.enemyAutoAttack();
      }
    }

    this.endOfTurn("player");
  }

  private autoAttackPlayer(): void {
    const attrs = this.player.state().attributes;
    const enemyAttrs = this.enemy.enemy().attributes;
    const mod = this.routeModifiers();
    const attack = Math.max(
      1,
      attrs.attack * mod.attackMult -
        enemyAttrs.defense * (1 - mod.penetrationBonus)
    );
    const baseDamage = Math.max(1, Math.round(attack * 0.8));
    const isCrit = this.random() < attrs.critChance;
    const damage = Math.max(
      1,
      Math.round(
        baseDamage * (isCrit ? attrs.critDamage * mod.critDamageMult : 1)
      )
    );
    const postureDamage = this.scaledPostureDamage(
      enemyAttrs.maxPosture,
      PLAYER_POSTURE_HIT
    );

    this.applyHitToEnemy(damage, postureDamage, isCrit ? "crit" : "dmg");
    this.log(`-${damage} HP`, "player", {
      kind: "damage",
      target: "enemy",
      value: damage,
    });

    if (this.random() < attrs.multiHitChance) {
      const mhDamage = Math.round(baseDamage * 0.4);
      const multiPosture = this.scaledPostureDamage(
        enemyAttrs.maxPosture,
        PLAYER_MULTI_POSTURE_HIT
      );
      this.applyHitToEnemy(mhDamage, multiPosture, "posture");
      this.log(`+${mhDamage} multi`, "player", {
        kind: "multihit",
        target: "enemy",
        value: mhDamage,
      });
    }

    if (this.random() < attrs.dotChance) {
      const postureDot = this.scaledPostureDamage(enemyAttrs.maxPosture, 0.05);
      this.enemyDot = {
        damage: 8,
        posture: postureDot,
        ticks: 2,
        originTurn: this.activeTurnNumber,
      };
      this.turnSummary.dotOnEnemy = true;
      this.log("DoT aplicado", "player", { kind: "dot", target: "enemy" });
    }
  }

  private useActiveSkill(): void {
    const attrs = this.player.state().attributes;
    const enemyAttrs = this.enemy.enemy().attributes;
    const mod = this.routeModifiers();
    const attack = Math.max(
      1,
      attrs.attack * mod.attackMult -
        enemyAttrs.defense * (1 - mod.penetrationBonus)
    );
    const baseDamage = Math.round(attack * 1.6);
    const postureDamage = this.scaledPostureDamage(
      enemyAttrs.maxPosture,
      PLAYER_SKILL_POSTURE_HIT
    );
    this.player.activateSkill(40);
    this.applyHitToEnemy(baseDamage, postureDamage, "dmg");
    this.log(`Skill ${baseDamage} dmg`, "player", {
      kind: "damage",
      target: "enemy",
      value: baseDamage,
    });
    for (let i = 0; i < 2; i++) {
      const extra = Math.round(baseDamage * 0.5);
      const extraPosture = this.scaledPostureDamage(
        enemyAttrs.maxPosture,
        PLAYER_MULTI_POSTURE_HIT
      );
      this.applyHitToEnemy(extra, extraPosture, "posture");
    }
  }

  private enemyAutoAttack(): void {
    const attrs = this.enemy.enemy().attributes;
    const mod = this.routeModifiers();
    const baseDamage = Math.round(attrs.attack * 0.9);
    const isCrit = this.random() < attrs.critChance;
    const damage = Math.max(
      1,
      Math.round(
        baseDamage * (isCrit ? attrs.critDamage : 1) * mod.damageMitigation
      )
    );
    const postureDamage = Math.round(
      this.scaledPostureDamage(
        this.player.state().attributes.maxPosture,
        ENEMY_POSTURE_HIT
      ) * mod.damageMitigation
    );

    this.applyHitToPlayer(damage, postureDamage, isCrit ? "crit" : "dmg");
    this.log(`-${damage} HP`, "enemy", {
      kind: "damage",
      target: "player",
      value: damage,
    });

    if (this.random() < attrs.dotChance) {
      const postureDot = this.scaledPostureDamage(
        this.player.state().attributes.maxPosture,
        0.05
      );
      this.playerDot = {
        damage: 6,
        posture: postureDot,
        ticks: 2,
        originTurn: this.activeTurnNumber,
      };
      this.turnSummary.dotOnPlayer = true;
      this.log("DoT sofrido", "enemy", { kind: "dot", target: "player" });
    }
  }

  private enemyStrongAttack(): void {
    const attrs = this.enemy.enemy().attributes;
    const mod = this.routeModifiers();
    const damage = Math.max(
      1,
      Math.round(attrs.attack * 1.6 * mod.damageMitigation)
    );
    const postureDamage = Math.round(
      this.scaledPostureDamage(
        this.player.state().attributes.maxPosture,
        ENEMY_STRONG_POSTURE_HIT
      ) * mod.damageMitigation
    );
    this.applyHitToPlayer(damage, postureDamage, "dmg");
    this.log(`Heavy ${damage} dmg`, "enemy", {
      kind: "damage",
      target: "player",
      value: damage,
    });
    this.enemy.resolveStrongAttack();
  }

  private applyHitToEnemy(
    damage: number,
    postureDamage: number,
    type: "dmg" | "crit" | "dot" | "posture"
  ): void {
    const enemy = this.enemy.enemy();
    const startPosture = enemy.attributes.posture;
    const maxPosture = enemy.attributes.maxPosture;
    this.enemy.applyDamage(damage, postureDamage);
    this.pushFloat(damage, type, "enemy");
    this.ui.triggerEnemyFlash();
    const updated = this.enemy.enemy();
    this.turnSummary.damageToEnemy += damage;
    const postureLost = Math.max(0, startPosture - updated.attributes.posture);
    this.turnSummary.postureToEnemy += postureLost;

    const brokeNow =
      updated.attributes.posture === 0 && enemy.attributes.posture !== 0;
    const heavyHit = postureLost >= maxPosture * POSTURE_HEAVY_HIT_THRESHOLD;
    const eligibleSuperbreak =
      (brokeNow || heavyHit) && updated.state !== "dead";

    if (
      eligibleSuperbreak &&
      this.shouldSuperbreak(this.player.state().attributes.penetration)
    ) {
      this.enemy.setBreak("superbroken", 2);
      this.log("Superquebra!", "player", {
        kind: "superbreak",
        target: "enemy",
      });
      this.lastEvent.set("superbreak");
    } else if (brokeNow) {
      this.enemy.setBreak("broken", 1);
      this.log("Quebra!", "player", { kind: "break", target: "enemy" });
    }
  }

  private applyHitToPlayer(
    damage: number,
    postureDamage: number,
    type: "dmg" | "crit" | "dot" | "posture"
  ): void {
    const player = this.player.state();
    const startPosture = player.attributes.posture;
    const breakReduction = this.routeModifiers().breakReduction;
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
    const heavyHit =
      postureLost >= player.attributes.maxPosture * POSTURE_HEAVY_HIT_THRESHOLD;
    const eligibleSuperbreak =
      (brokeNow || heavyHit) && updated.attributes.hp > 0;

    if (eligibleSuperbreak && this.shouldSuperbreak(0)) {
      this.player.setStatus("superbroken", 2);
      this.log("SUPERQUEBRA!", "enemy", {
        kind: "superbreak",
        target: "player",
      });
      this.lastEvent.set("superbreak");
    } else if (brokeNow) {
      this.player.setStatus("broken", Math.max(1, turns - breakReduction));
      this.log("Velvet entered BREAK!", "enemy", {
        kind: "break",
        target: "player",
      });
    }
  }

  private endOfTurn(target: "enemy" | "player"): void {
    const mod = this.routeModifiers();
    if (target === "enemy") {
      if (this.enemyDot) {
        this.applyHitToEnemy(
          this.enemyDot.damage,
          this.enemyDot.posture,
          "dot"
        );
        this.log(`Enemy DoT tick: ${this.enemyDot.damage}.`, "player", {
          turn: this.enemyDot.originTurn,
          kind: "dot",
          target: "enemy",
          value: this.enemyDot.damage,
        });
        this.enemyDot.ticks -= 1;
        if (this.enemyDot.ticks <= 0) this.enemyDot = null;
      }
      if (this.enemyDot) this.turnSummary.dotOnEnemy = true;
      const e = this.enemy.enemy();
      if (e.state === "normal") this.enemy.regenPosture(8);
    } else {
      if (this.playerDot) {
        this.applyHitToPlayer(
          this.playerDot.damage,
          this.playerDot.posture,
          "dot"
        );
        this.log(`Velvet took DoT: ${this.playerDot.damage}.`, "enemy", {
          turn: this.playerDot.originTurn,
          kind: "dot",
          target: "player",
          value: this.playerDot.damage,
        });
        this.playerDot.ticks -= 1;
        if (this.playerDot.ticks <= 0) this.playerDot = null;
      }
      if (this.playerDot) this.turnSummary.dotOnPlayer = true;
      const p = this.player.state();
      if (p.status === "normal")
        this.player.regenPosture(8 + mod.postureRegenBonus);
    }
    const acting = target === "enemy" ? "player" : "enemy";
    const summary = this.buildTurnSummary(acting);
    if (summary) {
      this.log(summary, "system", {
        kind: "summary",
        target: acting as "player" | "enemy",
      });
    }
    this.recordSnapshot(this.activeTurnNumber);
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
    this.playerDot = snapshot.playerState.dot
      ? { ...snapshot.playerState.dot }
      : null;
    this.enemyDot = snapshot.enemyState.dot
      ? { ...snapshot.enemyState.dot }
      : null;
    this.activeTurnNumber = snapshot.turnIndex;
  }

  private applySerializedPlayer(state: SerializedPlayerState): void {
    this.player.state.set({
      attributes: { ...state.attributes },
      buffs: state.buffs ?? [],
      status: state.status,
      breakTurns: state.breakTurns,
      skillCooldown: state.skillCooldown,
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

  private routeModifiers(): {
    critDamageMult: number;
    damageMitigation: number;
    postureRegenBonus: number;
    breakReduction: number;
    attackMult: number;
    penetrationBonus: number;
  } {
    const levels = this.runContext?.getRouteLevels() ?? { A: 0, B: 0, C: 0 };
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

  private random(): number {
    return DEV_COMBAT.deterministic ? this.rng.next() : Math.random();
  }

  private randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000_000);
  }

  private getRunPhase(): RunPhase {
    return this.runContext?.getPhase() ?? "idle";
  }

  private rollEnergyRegen(): number {
    return this.randomRangeInt(EP_REGEN_MIN, EP_REGEN_MAX);
  }

  private scaledPostureDamage(maxPosture: number, ratio: number): number {
    return Math.max(1, Math.round(maxPosture * ratio));
  }

  private randomRangeInt(min: number, max: number): number {
    const clampedMin = Math.ceil(min);
    const clampedMax = Math.floor(max);
    return (
      Math.floor(this.random() * (clampedMax - clampedMin + 1)) + clampedMin
    );
  }

  private shouldSuperbreak(penetrationBonus: number): boolean {
    const chance = Math.min(
      MAX_SUPERBREAK_CHANCE,
      Math.max(0, BASE_SUPERBREAK_CHANCE + (penetrationBonus || 0))
    );
    return this.random() < chance;
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

    const bullets: string[] = [];
    if (dmg) bullets.push(`${dmg} dano`);
    if (posture) bullets.push("Postura ↓");
    if (dotActive) bullets.push("DoT ativo");

    const actorLabel = actor === "player" ? "Velvet" : "Inimigo";
    const summary = bullets.map((b) => `• ${b}`).join(" ");
    return `Resumo T${this.activeTurnNumber} (${actorLabel}): ${summary}`;
  }
}
