import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RunPhase, RunResult, RunState, RoomType } from '../models/run.model';
import { RouteKey, RouteProgress } from '../models/routes.model';
import { UpgradeOption } from '../models/upgrades.model';
import { PlayerStateService } from './player-state.service';
import { EnemyStateService } from './enemy-state.service';
import { UiStateService } from './ui-state.service';

@Injectable({ providedIn: 'root' })
export class RunStateService {
  private readonly baseRoutes: RouteProgress[] = [
    { route: 'A', title: 'Critical', level: 0, emphasis: 'Sentinel + multi-hit' },
    { route: 'B', title: 'Spiritual', level: 0, emphasis: 'Ruin + DoT' },
    { route: 'C', title: 'Impact', level: 0, emphasis: 'Resonance + burst' }
  ];

  readonly phase = signal<RunPhase>('idle');
  readonly currentRoom = signal<number>(0);
  readonly totalRooms = signal<number>(7);
  readonly roomType = signal<RoomType>('normal');
  readonly routeLevels = signal<Record<RouteKey, number>>({ A: 0, B: 0, C: 0 });
  readonly initialRouteChoice = signal<RouteKey | undefined>(undefined);
  readonly availableUpgrades = signal<UpgradeOption[]>([]);
  readonly evolutions = signal<string[]>([]);
  readonly rerollsAvailable = signal<number>(1);
  readonly potions = signal<number>(2);
  readonly result = signal<RunResult>('none');
  readonly isFinalEvolution = signal<boolean>(false);

  readonly routes = computed<RouteProgress[]>(() =>
    this.baseRoutes.map(r => ({ ...r, level: this.routeLevels()[r.route] || 0 }))
  );

  readonly state = computed<RunState>(() => ({
    phase: this.phase(),
    currentRoom: this.currentRoom(),
    totalRooms: this.totalRooms(),
    roomType: this.roomType(),
    routeLevels: this.routeLevels(),
    initialRouteChoice: this.initialRouteChoice(),
    availableUpgrades: this.availableUpgrades(),
    evolutions: this.evolutions(),
    rerollsAvailable: this.rerollsAvailable(),
    potions: this.potions(),
    result: this.result(),
    isFinalEvolution: this.isFinalEvolution()
  }));

  private readonly router = inject(Router);

  constructor(
    private readonly player: PlayerStateService,
    private readonly enemy: EnemyStateService,
    private readonly ui: UiStateService
  ) {
    effect(() => {
      const currentPhase = this.phase();
      const target = this.mapPhaseToRoute(currentPhase);
      if (!target) return;
      if (this.router.url === target) return;
      this.router.navigate([target]);
    });
  }

  startRun(initialRoute: RouteKey): void {
    this.ui.startTransition('Starting run...');
    this.routeLevels.set({ A: 0, B: 0, C: 0 });
    this.routeLevels.update(levels => ({ ...levels, [initialRoute]: levels[initialRoute] + 1 }));
    this.initialRouteChoice.set(initialRoute);
    this.currentRoom.set(1);
    this.totalRooms.set(7);
    this.roomType.set(this.calculateRoomType(1, 7));
    this.rerollsAvailable.set(1);
    this.potions.set(2);
    this.result.set('none');
    this.isFinalEvolution.set(false);
    this.evolutions.set([]);
    this.refreshUpgrades();
    this.player.resetForNewRun();
    this.enemy.reset();
    this.phase.set('start');
    this.startBattle();
    setTimeout(() => this.ui.endTransition(), 200);
  }

  startBattle(): void {
    const room = this.currentRoom();
    const type = this.calculateRoomType(room, this.totalRooms());
    this.roomType.set(type);
    this.transitionToPhase('battle', 'Entering battle');
    this.enemy.spawnForRoom(room, type);
  }

  finishBattle(result: 'victory' | 'defeat'): void {
    this.player.normalizeAfterBattle();

    if (result === 'defeat') {
      this.result.set('defeat');
      this.transitionToPhase('death', 'Defeat...');
      return;
    }

    const type = this.roomType();
    if (type === 'boss') {
      this.addPotion(1);
      this.player.smallHeal(0.2);
      this.isFinalEvolution.set(true);
      this.result.set('victory');
      this.transitionToPhase('evolution', 'Final Evolution');
    } else if (type === 'mini-boss') {
      this.addPotion(1);
      this.player.smallHeal(0.2);
      this.isFinalEvolution.set(false);
      this.transitionToPhase('evolution', 'Opening Evolution');
    } else {
      this.transitionToPhase('reward', 'Reward');
    }
  }

  goToReward(): void {
    this.transitionToPhase('reward', 'Reward');
  }

  goToPrep(): void {
    this.transitionToPhase('prep', 'Preparation');
  }

  goToEvolution(isFinal: boolean): void {
    this.isFinalEvolution.set(isFinal);
    this.transitionToPhase('evolution', isFinal ? 'Final Evolution' : 'Evolution');
  }

  goToSummary(): void {
    this.transitionToPhase('summary', 'Run Summary');
  }

  goToVictory(): void {
    if (this.result() === 'none') {
      this.result.set('victory');
    }
    this.transitionToPhase('victory', 'Victory');
  }

  finishPrepAndStartNextBattle(): void {
    const next = Math.min(this.totalRooms(), this.currentRoom() + 1);
    this.currentRoom.set(next);
    this.roomType.set(this.calculateRoomType(next, this.totalRooms()));
    this.startBattle();
  }

  advanceRoom(): void {
    const next = Math.min(this.totalRooms(), this.currentRoom() + 1);
    this.currentRoom.set(next);
    this.roomType.set(this.calculateRoomType(next, this.totalRooms()));
  }

  resetToStart(): void {
    this.phase.set('start');
    this.result.set('none');
    this.currentRoom.set(0);
    this.roomType.set('normal');
    this.routeLevels.set({ A: 0, B: 0, C: 0 });
    this.availableUpgrades.set([]);
    this.evolutions.set([]);
    this.rerollsAvailable.set(1);
    this.potions.set(2);
    this.initialRouteChoice.set(undefined);
    this.ui.endTransition();
  }

  finishRun(): void {
    this.phase.set('finished');
    this.ui.endTransition();
  }

  goToEvolutionNext(isFinal: boolean): void {
    this.isFinalEvolution.set(isFinal);
    this.transitionToPhase('evolution', isFinal ? 'Final Evolution' : 'Evolution');
  }

  fleeRun(): void {
    this.result.set('fled');
    this.transitionToPhase('summary', 'Run Summary');
  }

  applyUpgrade(route: RouteKey): void {
    if (!this.canUpgrade(route)) {
      this.ui.pushLog('Upgrade locked (gating).');
      return;
    }
    this.routeLevels.update(levels => ({ ...levels, [route]: levels[route] + 1 }));
    this.refreshUpgrades();
    this.goToPrep();
  }

  rerollUpgrades(): void {
    if (this.rerollsAvailable() <= 0) return;
    this.rerollsAvailable.update(v => v - 1);
    this.refreshUpgrades();
  }

  consumePotion(): boolean {
    let consumed = false;
    this.potions.update(p => {
      if (p <= 0) return p;
      consumed = true;
      return p - 1;
    });
    if (consumed) {
      this.player.smallHeal(0.3);
    }
    return consumed;
  }

  addPotion(amount = 1): void {
    this.potions.update(p => p + amount);
  }

  canUpgrade(route: RouteKey): boolean {
    const levels = this.routeLevels();
    const desired = levels[route] + 1;
    if (desired === 1) return true;
    const others: RouteKey[] = ['A', 'B', 'C'].filter(r => r !== route) as RouteKey[];
    return others.some(r => levels[r] >= desired - 1);
  }

  requiredLevelFor(route: RouteKey): number {
    const levels = this.routeLevels();
    return Math.max(1, levels[route] + 1);
  }

  getRoomTypeFor(room: number): RoomType {
    return this.calculateRoomType(room, this.totalRooms());
  }

  registerEvolution(route: RouteKey, stage: 'mini' | 'final'): void {
    const label = stage === 'final' ? `Final Evolution - route ${route}` : `Evolution - route ${route}`;
    this.evolutions.update(list => [...list, label]);
  }

  private calculateRoomType(room: number, total: number): RoomType {
    if (room >= total) return 'boss';
    const miniBoss = Math.ceil(total / 2);
    if (room === miniBoss) return 'mini-boss';
    return 'normal';
  }

  private refreshUpgrades(): void {
    this.availableUpgrades.set([
      { id: this.uid(), name: '+1 Route A', description: 'Empowers route A (critical / multi-hit).', route: 'A', rarity: 'common' },
      { id: this.uid(), name: '+1 Route B', description: 'Empowers route B (DoT / corrosion).', route: 'B', rarity: 'common' },
      { id: this.uid(), name: '+1 Route C', description: 'Empowers route C (stance / impact).', route: 'C', rarity: 'common' }
    ]);
  }

  private transitionToPhase(phase: RunPhase, message?: string): void {
    this.ui.startTransition(message || 'Loading...');
    this.phase.set(phase);
    setTimeout(() => this.ui.endTransition(), 300);
  }

  private mapPhaseToRoute(phase: RunPhase): string | null {
    switch (phase) {
      case 'idle':
      case 'finished':
        return '/';
      case 'start':
        return '/run/start';
      case 'battle':
        return '/run/battle';
      case 'reward':
        return '/run/reward';
      case 'prep':
        return '/run/prep';
      case 'evolution':
        return '/run/evolution';
      case 'summary':
        return '/run/summary';
      case 'death':
        return '/run/death';
      case 'victory':
        return '/run/victory';
      default:
        return '/';
    }
  }

  private uid(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
