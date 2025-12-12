import { Injectable, OnDestroy, signal } from '@angular/core';
import { EnemyStateService } from './enemy-state.service';
import { PlayerStateService } from './player-state.service';
import { UiStateService } from './ui-state.service';
import { RunStateService } from './run-state.service';

type Turn = 'player' | 'enemy';

interface DotState {
  damage: number;
  posture: number;
  ticks: number;
}

@Injectable({ providedIn: 'root' })
export class BattleEngineService implements OnDestroy {
  private tickTimer?: ReturnType<typeof setTimeout>;
  private readonly loopDelay = 750;
  private queuedSkill = false;
  private enemyDot: DotState | null = null;
  private playerDot: DotState | null = null;

  readonly isRunning = signal(false);
  readonly currentTurn = signal<Turn>('player');
  readonly lastEvent = signal<string | null>(null);

  constructor(
    private readonly enemy: EnemyStateService,
    private readonly player: PlayerStateService,
    private readonly ui: UiStateService,
    private readonly run: RunStateService
  ) {}

  ngOnDestroy(): void {
    this.stopLoop();
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
    if (this.run.phase() !== 'battle') return;
    if (!this.player.canUseSkill(40)) return;
    this.queuedSkill = true;
  }

  canUseActiveSkill(): boolean {
    return this.player.canUseSkill(40) && this.player.state().status === 'normal';
  }

  private scheduleNextTick(): void {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
    }
    this.tickTimer = setTimeout(() => this.tick(), this.loopDelay);
  }

  private tick(): void {
    if (!this.isRunning()) return;
    if (this.run.phase() !== 'battle') {
      this.stopLoop();
      return;
    }
    if (this.checkOutcome()) {
      this.stopLoop();
      return;
    }

    const turn = this.currentTurn();
    if (turn === 'player') {
      this.playerTurn();
      this.currentTurn.set('enemy');
    } else {
      this.enemyTurn();
      this.currentTurn.set('player');
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

    if (player.status === 'broken' || player.status === 'superbroken') {
      this.ui.pushLog('Velvet is broken and lost the turn.');
      this.player.decrementBreak();
      this.endOfTurn('enemy');
      return;
    }

    if (this.queuedSkill && this.player.canUseSkill(40)) {
      this.useActiveSkill();
      this.queuedSkill = false;
      this.lastEvent.set('skill');
    } else {
      this.autoAttackPlayer();
    }

    this.endOfTurn('enemy');
  }

  private enemyTurn(): void {
    const enemyState = this.enemy.enemy();

    if (enemyState.state === 'dead') return;

    if (enemyState.state === 'broken' || enemyState.state === 'superbroken') {
      this.ui.pushLog('Enemy is broken and loses the turn.');
      this.enemy.decrementBreak();
      this.endOfTurn('player');
      return;
    }

    if (enemyState.state === 'preparing' && enemyState.attributes.strongAttackReady) {
      this.enemyStrongAttack();
    } else {
      const roll = Math.random();
      if (roll < 0.3) {
        this.enemy.prepareStrongAttack();
        this.ui.pushLog('Enemy is charging a heavy strike!');
      } else {
        this.enemyAutoAttack();
      }
    }

    this.endOfTurn('player');
  }

  private autoAttackPlayer(): void {
    const attrs = this.player.state().attributes;
    const enemyAttrs = this.enemy.enemy().attributes;
    const mod = this.routeModifiers();
    const attack = Math.max(1, attrs.attack * mod.attackMult - enemyAttrs.defense * (1 - mod.penetrationBonus));
    const baseDamage = Math.max(1, Math.round(attack * 0.8));
    const isCrit = Math.random() < attrs.critChance;
    const damage = Math.max(
      1,
      Math.round(baseDamage * (isCrit ? attrs.critDamage * mod.critDamageMult : 1))
    );
    const postureDamage = 25;

    this.applyHitToEnemy(damage, postureDamage, isCrit ? 'crit' : 'dmg');
    this.ui.pushLog(`Velvet dealt ${damage} damage.`);

    if (Math.random() < attrs.multiHitChance) {
      const mhDamage = Math.round(baseDamage * 0.4);
      this.applyHitToEnemy(mhDamage, 10, 'posture');
      this.ui.pushLog(`Multi-hit: +${mhDamage} damage.`);
    }

    if (Math.random() < attrs.dotChance) {
      this.enemyDot = { damage: 8, posture: 3, ticks: 2 };
      this.ui.pushLog('DoT applied to the enemy.');
    }
  }

  private useActiveSkill(): void {
    const attrs = this.player.state().attributes;
    const enemyAttrs = this.enemy.enemy().attributes;
    const mod = this.routeModifiers();
    const attack = Math.max(1, attrs.attack * mod.attackMult - enemyAttrs.defense * (1 - mod.penetrationBonus));
    const baseDamage = Math.round(attack * 1.6);
    const postureDamage = 35;
    this.player.activateSkill(40);
    this.applyHitToEnemy(baseDamage, postureDamage, 'dmg');
    this.ui.pushLog(`Velvet unleashed Arcane Impact: ${baseDamage} damage.`);
    for (let i = 0; i < 2; i++) {
      const extra = Math.round(baseDamage * 0.5);
      this.applyHitToEnemy(extra, 12, 'posture');
    }
  }

  private enemyAutoAttack(): void {
    const attrs = this.enemy.enemy().attributes;
    const mod = this.routeModifiers();
    const baseDamage = Math.round(attrs.attack * 0.9);
    const isCrit = Math.random() < attrs.critChance;
    const damage = Math.max(1, Math.round(baseDamage * (isCrit ? attrs.critDamage : 1) * mod.damageMitigation));
    const postureDamage = Math.round(18 * mod.damageMitigation);

    this.applyHitToPlayer(damage, postureDamage, isCrit ? 'crit' : 'dmg');
    this.ui.pushLog(`Enemy dealt ${damage} damage.`);

    if (Math.random() < attrs.dotChance) {
      this.playerDot = { damage: 6, posture: 2, ticks: 2 };
      this.ui.pushLog('Velvet suffered DoT.');
    }
  }

  private enemyStrongAttack(): void {
    const attrs = this.enemy.enemy().attributes;
    const mod = this.routeModifiers();
    const damage = Math.max(1, Math.round(attrs.attack * 1.6 * mod.damageMitigation));
    const postureDamage = Math.round(32 * mod.damageMitigation);
    this.applyHitToPlayer(damage, postureDamage, 'dmg');
    this.ui.pushLog(`Enemy heavy strike: ${damage} damage.`);
    this.enemy.resolveStrongAttack();
  }

  private applyHitToEnemy(damage: number, postureDamage: number, type: 'dmg' | 'crit' | 'dot' | 'posture'): void {
    const enemy = this.enemy.enemy();
    const startPosture = enemy.attributes.posture;
    this.enemy.applyDamage(damage, postureDamage);
    this.pushFloat(damage, type);
    this.ui.triggerEnemyFlash();
    const updated = this.enemy.enemy();

    if (startPosture === enemy.attributes.maxPosture && updated.attributes.posture === 0) {
      this.enemy.setBreak('superbroken', 2);
      this.ui.pushLog('Enemy entered SUPER BREAK!');
      this.lastEvent.set('superbreak');
    } else if (updated.attributes.posture === 0 && enemy.attributes.posture !== 0) {
      this.enemy.setBreak('broken', 1);
      this.ui.pushLog('Enemy entered BREAK!');
    }
  }

  private applyHitToPlayer(damage: number, postureDamage: number, type: 'dmg' | 'crit' | 'dot' | 'posture'): void {
    const player = this.player.state();
    const startPosture = player.attributes.posture;
    const breakReduction = this.routeModifiers().breakReduction;
    const turns = type === 'dmg' || type === 'crit' ? 2 : 1;

    this.player.applyDamage(damage, postureDamage);
    this.pushFloat(damage, type);
    this.ui.triggerPlayerFlash();
    const updated = this.player.state();

    if (startPosture === player.attributes.maxPosture && updated.attributes.posture === 0) {
      this.player.setStatus('superbroken', Math.max(1, turns - breakReduction));
      this.ui.pushLog('Velvet entered SUPER BREAK!');
      this.lastEvent.set('superbreak');
    } else if (updated.attributes.posture === 0 && player.attributes.posture !== 0) {
      this.player.setStatus('broken', Math.max(1, turns - breakReduction));
      this.ui.pushLog('Velvet entered BREAK!');
    }
  }

  private endOfTurn(target: 'enemy' | 'player'): void {
    const mod = this.routeModifiers();
    if (target === 'enemy') {
      if (this.enemyDot) {
        this.applyHitToEnemy(this.enemyDot.damage, this.enemyDot.posture, 'dot');
        this.ui.pushLog(`Enemy DoT tick: ${this.enemyDot.damage}.`);
        this.enemyDot.ticks -= 1;
        if (this.enemyDot.ticks <= 0) this.enemyDot = null;
      }
      const e = this.enemy.enemy();
      if (e.state === 'normal') this.enemy.regenPosture(8);
    } else {
      if (this.playerDot) {
        this.applyHitToPlayer(this.playerDot.damage, this.playerDot.posture, 'dot');
        this.ui.pushLog(`Velvet took DoT: ${this.playerDot.damage}.`);
        this.playerDot.ticks -= 1;
        if (this.playerDot.ticks <= 0) this.playerDot = null;
      }
      const p = this.player.state();
      if (p.status === 'normal') this.player.regenPosture(8 + mod.postureRegenBonus);
    }
  }

  private pushFloat(value: number, type: 'dmg' | 'crit' | 'dot' | 'posture'): void {
    this.ui.pushFloatEvent({ value: `-${value}`, type });
  }

  private checkOutcome(): boolean {
    const enemyState = this.enemy.enemy();
    const playerState = this.player.state();
    if (enemyState.state === 'dead') {
      this.run.finishBattle('victory');
      return true;
    }
    if (playerState.attributes.hp <= 0) {
      this.run.finishBattle('defeat');
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
    const levels = this.run.routeLevels();
    const critDamageMult = 1 + 0.05 * levels.A;
    const damageMitigation = 1 - Math.min(0.35, 0.05 * levels.B);
    const postureRegenBonus = Math.min(12, 3 * levels.B);
    const breakReduction = Math.min(2, levels.B);
    const attackMult = 1 + 0.05 * levels.C;
    const penetrationBonus = Math.min(0.4, 0.04 * levels.C);
    return { critDamageMult, damageMitigation, postureRegenBonus, breakReduction, attackMult, penetrationBonus };
  }
}
