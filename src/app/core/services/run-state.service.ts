import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RunLoadoutSnapshot, RunPhase, RunResult, RunState, RoomType, RunUpgrade } from '../models/run.model';
import { TrackKey, TrackProgress } from '../models/tracks.model';
import { UpgradeOption } from '../models/upgrades.model';
import { PlayerBattleStartBonuses, PlayerAttributeModifierSet, PlayerStateService } from './player-state.service';
import { EnemyStateService } from './enemy-state.service';
import { UiStateService } from './ui-state.service';
import { BattleEngineService } from './battle-engine.service';
import { EvolutionVisualKey } from '../models/evolution-visual.model';
import { ProfileStateService } from './profile-state.service';
import { RunKaelisSnapshot } from '../models/kaelis.model';
import { WeaponDefinition } from '../models/weapon.model';
import { RingDefinition } from '../models/ring.model';
import { EnemyFactoryService } from './enemy-factory.service';
import { BALANCE_CONFIG } from '../../content/balance/balance.config';
import { getUpgradesByTrack, validateUpgradeCatalog } from '../../content/upgrades';
import { UpgradeDef, UpgradeModifiers, UpgradeRarity, UpgradeTrack } from '../../content/upgrades/upgrade.types';
import { roomToStage } from '../config/balance.config';

const RUN_TUNING = BALANCE_CONFIG.run;
const POTION_CAP = RUN_TUNING.potionCap;
const POTION_DROP_CHANCE = RUN_TUNING.potionDropChance;
const TOTAL_ROOMS = RUN_TUNING.totalRooms;

const UPGRADE_TRACKS: UpgradeTrack[] = ['A', 'B', 'C'];

@Injectable({ providedIn: 'root' })
export class RunStateService {
  private readonly router = inject(Router);
  private readonly battle = inject(BattleEngineService);
  private readonly player = inject(PlayerStateService);
  private readonly enemy = inject(EnemyStateService);
  private readonly ui = inject(UiStateService);
  private readonly profile = inject(ProfileStateService);
  private readonly enemyFactory = inject(EnemyFactoryService);
  private upgradeRoll = 0;

  private readonly baseTracks: TrackProgress[] = [
    { track: 'A', title: 'Critical', level: 0, emphasis: 'Sentinel + multi-hit' },
    { track: 'B', title: 'Spiritual', level: 0, emphasis: 'Ruin + DoT' },
    { track: 'C', title: 'Impact', level: 0, emphasis: 'Resonance + burst' }
  ];

  readonly phase = signal<RunPhase>('idle');
  readonly currentRoom = signal<number>(0);
  readonly totalRooms = signal<number>(TOTAL_ROOMS);
  readonly roomType = signal<RoomType>('normal');
  readonly trackLevels = signal<Record<TrackKey, number>>({ A: 0, B: 0, C: 0 });
  readonly initialTrackChoice = signal<TrackKey | undefined>(undefined);
  readonly availableUpgrades = signal<UpgradeOption[]>([]);
  readonly evolutions = signal<string[]>([]);
  readonly rerollsAvailable = signal<number>(1);
  readonly potions = signal<number>(this.profile.potionCount());
  readonly result = signal<RunResult>('none');
  readonly isFinalEvolution = signal<boolean>(false);
  readonly battleSeed = signal<number | null>(null);
  readonly activeEvolutionVisual = signal<EvolutionVisualKey | null>(null);
  readonly currentKaelis = signal<RunKaelisSnapshot | null>(null);
  readonly potionCap = POTION_CAP;
  readonly loadoutSnapshot = signal<RunLoadoutSnapshot | null>(null);
  readonly runUpgradesSignal = signal<RunUpgrade[]>([]);

  readonly kaelis = computed(() => this.currentKaelis());

  readonly tracks = computed<TrackProgress[]>(() =>
    this.baseTracks.map(t => ({ ...t, level: this.trackLevels()[t.track] || 0 }))
  );

  readonly state = computed<RunState>(() => ({
    phase: this.phase(),
    currentRoom: this.currentRoom(),
    totalRooms: this.totalRooms(),
    roomType: this.roomType(),
    trackLevels: this.trackLevels(),
    initialTrackChoice: this.initialTrackChoice(),
    availableUpgrades: this.availableUpgrades(),
    evolutions: this.evolutions(),
    rerollsAvailable: this.rerollsAvailable(),
    potions: this.potions(),
    result: this.result(),
    isFinalEvolution: this.isFinalEvolution(),
    kaelis: this.kaelis(),
    loadout: this.loadoutSnapshot(),
    runUpgrades: this.runUpgradesSignal()
  }));

  constructor() {
    this.battle.setRunContext({
      getPhase: () => this.phase(),
      getTrackLevels: () => this.trackLevels(),
      getCurrentRoom: () => this.currentRoom(),
      tickTurnUpgrades: actor => this.tickTurnUpgrades(actor),
      finishBattle: result => this.finishBattle(result)
    });

    effect(() => {
      const currentPhase = this.phase();
      const target = this.mapPhaseToRoute(currentPhase);
      if (!target) return;
      if (this.router.url === target) return;
      this.router.navigate([target]);
    });
  }

  readonly runSeed = signal<number | null>(null);

  getLoadout(): RunLoadoutSnapshot | null {
    return this.loadoutSnapshot();
  }

  isLoadoutLocked(): boolean {
    return this.loadoutSnapshot() !== null;
  }

  getRunUpgrades(): RunUpgrade[] {
    return this.runUpgradesSignal();
  }

  getPendingBattleBonuses(): PlayerBattleStartBonuses {
    return this.collectNextFightBonuses();
  }

  startRun(initialTrack: TrackKey, seed?: number): void {
    this.ui.startTransition('Starting run...');
    const baseSeed = typeof seed === 'number' ? seed : this.randomSeed();
    this.runSeed.set(baseSeed);
    this.trackLevels.set({ A: 0, B: 0, C: 0 });
    this.trackLevels.update(levels => ({ ...levels, [initialTrack]: levels[initialTrack] + 1 }));
    this.initialTrackChoice.set(initialTrack);
    this.currentRoom.set(1);
    this.totalRooms.set(TOTAL_ROOMS);
    this.roomType.set(this.calculateRoomType(1, TOTAL_ROOMS));
    this.rerollsAvailable.set(1);
    this.syncPotionsFromProfile();
    this.result.set('none');
    this.isFinalEvolution.set(false);
    this.activeEvolutionVisual.set(null);
    this.evolutions.set([]);
    const kaelis = this.profile.getActiveSnapshot();
    this.currentKaelis.set(kaelis);
    const weapon = this.profile.getEquippedWeapon(kaelis.id);
    const rings = this.profile.getEquippedRings(kaelis.id);
    const loadout = this.buildLoadoutSnapshot(weapon, rings);
    this.loadoutSnapshot.set(loadout);
    this.runUpgradesSignal.set([]);
    this.upgradeRoll = 0;
    const persistentModifiers = this.aggregatePersistentModifiers();
    this.refreshUpgrades();
    this.player.resetForNewRun(kaelis, loadout.weapon, loadout.sigils, persistentModifiers);
    this.player.lockLoadout();
    this.enemy.reset();
    this.phase.set('start');
    this.startBattle();
    setTimeout(() => this.ui.endTransition(), 200);
  }

  startBattle(seed?: number): void {
    const room = this.currentRoom();
    const type = this.calculateRoomType(room, this.totalRooms());
    this.roomType.set(type);
    this.transitionToPhase('battle', 'Entering battle');
    const bonuses = this.consumeNextFightBonuses();
    if (bonuses.energy || bonuses.postureShield) {
      this.player.applyBattleStartBonuses(bonuses);
    }
    const encounter = this.enemyFactory.createEncounter(room, type);
    this.enemy.spawnEncounter(encounter.enemy);
    this.battle.setEnemyBehavior(encounter.behavior);
    const derivedSeed = this.deriveBattleSeed(seed);
    const battleSeed = this.battle.startBattle({ seed: derivedSeed });
    this.battleSeed.set(battleSeed);
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
      this.applyEvolutionVisual(true);
      this.result.set('victory');
      this.transitionToPhase('evolution', 'Final Evolution');
    } else if (type === 'mini-boss') {
      this.addPotion(1);
      this.player.smallHeal(0.2);
      this.isFinalEvolution.set(false);
      this.applyEvolutionVisual(false);
      this.transitionToPhase('evolution', 'Opening Evolution');
    } else {
      this.refreshUpgrades();
      this.transitionToPhase('intermission', 'Intermission');
    }

    this.tryPotionDrop();
  }

  goToIntermission(): void {
    this.transitionToPhase('intermission', 'Intermission');
  }

  goToReward(): void {
    this.goToIntermission();
  }

  goToPrep(): void {
    this.goToIntermission();
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
    this.trackLevels.set({ A: 0, B: 0, C: 0 });
    this.availableUpgrades.set([]);
    this.evolutions.set([]);
    this.rerollsAvailable.set(1);
    this.totalRooms.set(TOTAL_ROOMS);
    this.syncPotionsFromProfile();
    this.initialTrackChoice.set(undefined);
    this.runSeed.set(null);
    this.battleSeed.set(null);
    this.activeEvolutionVisual.set(null);
    this.currentKaelis.set(null);
    this.loadoutSnapshot.set(null);
    this.runUpgradesSignal.set([]);
    this.upgradeRoll = 0;
    this.player.unlockLoadout();
    this.ui.endTransition();
  }

  finishRun(): void {
    this.phase.set('finished');
    this.runUpgradesSignal.set([]);
    this.loadoutSnapshot.set(null);
    this.player.unlockLoadout();
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

  applyUpgrade(option: UpgradeOption): void {
    if (option.disabledReason) {
      this.ui.pushLog(option.disabledReason);
      return;
    }
    const track = option.upgrade.track;
    this.trackLevels.update(levels => ({ ...levels, [track]: levels[track] + 1 }));
    this.addRunUpgrade(option);
    this.refreshUpgrades();
  }

  rerollUpgrades(): void {
    if (this.rerollsAvailable() <= 0) return;
    this.rerollsAvailable.update(v => v - 1);
    this.refreshUpgrades();
  }

  consumePotion(): boolean {
    if (this.phase() !== 'prep' && this.phase() !== 'intermission') {
      this.ui.pushLog('Potions can only be used between rooms.');
      return false;
    }
    const current = this.potions();
    if (current <= 0) return false;
    this.persistPotionCount(current - 1);
    this.player.smallHeal(0.3);
    return true;
  }

  addPotion(amount = 1): void {
    if (amount <= 0) return;
    const current = this.potions();
    const next = Math.min(POTION_CAP, current + amount);
    if (next === current) return;
    this.persistPotionCount(next);
  }

  canUpgrade(def: UpgradeDef): boolean {
    return !this.getUpgradeLockReason(def, this.trackLevels());
  }

  getRoomTypeFor(room: number): RoomType {
    return this.calculateRoomType(room, this.totalRooms());
  }

  registerEvolution(track: TrackKey, stage: 'mini' | 'final'): void {
    const label = stage === 'final' ? `Final Evolution - trilha ${track}` : `Evolution - trilha ${track}`;
    this.evolutions.update(list => [...list, label]);
  }

  private calculateRoomType(room: number, total: number): RoomType {
    if (room >= total) return 'boss';
    const miniBoss = Math.ceil(total / 2);
    if (room === miniBoss) return 'mini-boss';
    return 'normal';
  }

  private refreshUpgrades(): void {
    const errors = validateUpgradeCatalog();
    if (errors.length) {
      console.warn('Upgrade catalog errors', errors);
    }
    this.upgradeRoll += 1;
    const options = this.generateUpgrades(
      this.trackLevels(),
      this.currentRoom(),
      this.runSeed() ?? undefined,
      this.upgradeRoll
    );
    this.availableUpgrades.set(options);
  }

  private deriveBattleSeed(seed?: number): number {
    const base = typeof seed === 'number' ? seed : this.runSeed() ?? this.randomSeed();
    return base + this.currentRoom();
  }

  private applyEvolutionVisual(isFinal: boolean): void {
    const key = this.pickEvolutionKey();
    if (!key) return;
    if (isFinal || !this.activeEvolutionVisual()) {
      this.activeEvolutionVisual.set(key);
    }
  }

  private pickEvolutionKey(): EvolutionVisualKey | null {
    const choice = this.initialTrackChoice();
    if (choice === 'A') return 'critico';
    if (choice === 'B') return 'ruina';
    if (choice === 'C') return 'impacto';
    return null;
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
      case 'intermission':
        return '/run/intermission';
      case 'reward':
      case 'prep':
        return '/run/intermission';
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

  private tryPotionDrop(): void {
    if (Math.random() >= POTION_DROP_CHANCE) return;
    const current = this.potions();
    if (current >= POTION_CAP) {
      this.ui.pushLog('Potion drop wasted (cap reached).');
      return;
    }
    const next = Math.min(POTION_CAP, current + 1);
    this.persistPotionCount(next);
    this.ui.pushLog(`Potion found! (${next}/${POTION_CAP})`);
  }

  private uid(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  private randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000_000);
  }

  private syncPotionsFromProfile(): void {
    this.potions.set(Math.min(POTION_CAP, this.profile.potionCount()));
  }

  private persistPotionCount(value: number): void {
    const clamped = Math.min(POTION_CAP, Math.max(0, value));
    this.potions.set(clamped);
    this.profile.setPotionCount(clamped);
  }

  private buildLoadoutSnapshot(weapon: WeaponDefinition, rings: RingDefinition[]): RunLoadoutSnapshot {
    return {
      weapon: this.cloneWeapon(weapon),
      sigils: rings.map(ring => this.cloneRing(ring))
    };
  }

  private cloneWeapon(weapon: WeaponDefinition): WeaponDefinition {
    return {
      ...weapon,
      flatStat: { ...weapon.flatStat },
      secondaryStat: { ...weapon.secondaryStat }
    };
  }

  private cloneRing(ring: RingDefinition): RingDefinition {
    return {
      ...ring,
      mainStat: { ...ring.mainStat },
      subStats: ring.subStats.map(stat => ({ ...stat }))
    };
  }

  private addRunUpgrade(option: UpgradeOption): void {
    const def = option.upgrade;
    const upgrade: RunUpgrade = {
      id: this.uid(),
      defId: def.id,
      track: def.track,
      name: def.name,
      rarity: def.rarity,
      duration: def.duration,
      effects: def.effects.map(effect => ({ ...effect })),
      modifiers: { ...def.modifiers },
      remainingTurns: def.duration.type === 'nTurns' ? def.duration.turns : undefined
    };
    this.runUpgradesSignal.update(list => [...list, upgrade]);
    this.applyPersistentModifiers();
  }

  private applyPersistentModifiers(): void {
    const modifiers = this.aggregatePersistentModifiers();
    this.player.applyRunAttributeModifiers(modifiers);
  }

  private aggregatePersistentModifiers(): PlayerAttributeModifierSet {
    const totals: PlayerAttributeModifierSet = {};
    this.runUpgradesSignal().forEach(upgrade => {
      if (upgrade.duration.type === 'run') {
        this.applyUpgradeModifiers(totals, upgrade.modifiers);
        return;
      }
      if (upgrade.duration.type === 'nTurns' && (upgrade.remainingTurns ?? 0) > 0) {
        this.applyUpgradeModifiers(totals, upgrade.modifiers);
      }
    });
    return totals;
  }

  private applyUpgradeModifiers(totals: PlayerAttributeModifierSet, mods: UpgradeModifiers): void {
    if (mods.addHpFlat) totals.hpFlat = (totals.hpFlat ?? 0) + mods.addHpFlat;
    if (mods.addAtkFlat) totals.atkFlat = (totals.atkFlat ?? 0) + mods.addAtkFlat;
    if (mods.addCritRate) totals.critRate = (totals.critRate ?? 0) + mods.addCritRate;
    if (mods.addCritDmg) totals.critDamage = (totals.critDamage ?? 0) + mods.addCritDmg;
    if (mods.addDmgPct) totals.damagePercent = (totals.damagePercent ?? 0) + mods.addDmgPct;
    if (mods.addDrPct) totals.damageReductionPercent = (totals.damageReductionPercent ?? 0) + mods.addDrPct;
  }

  private collectNextFightBonuses(): PlayerBattleStartBonuses {
    const bonuses: PlayerBattleStartBonuses = {};
    this.runUpgradesSignal().forEach(upgrade => {
      if (upgrade.duration.type !== 'nextBattle') return;
      if (upgrade.modifiers.startNextBattleEnergy) {
        bonuses.energy = (bonuses.energy ?? 0) + upgrade.modifiers.startNextBattleEnergy;
      }
      if (upgrade.modifiers.startNextBattlePosture) {
        bonuses.postureShield = (bonuses.postureShield ?? 0) + upgrade.modifiers.startNextBattlePosture;
      }
    });
    return bonuses;
  }

  private consumeNextFightBonuses(): PlayerBattleStartBonuses {
    const bonuses = this.collectNextFightBonuses();
    if (!bonuses.energy && !bonuses.postureShield) {
      return bonuses;
    }
    this.runUpgradesSignal.update(list => list.filter(upgrade => upgrade.duration.type !== 'nextBattle'));
    this.applyPersistentModifiers();
    return bonuses;
  }

  tickTurnUpgrades(actor: 'player' | 'enemy'): void {
    let changed = false;
    this.runUpgradesSignal.update(list => {
      const next: RunUpgrade[] = [];
      list.forEach(upgrade => {
        if (upgrade.duration.type !== 'nTurns') {
          next.push(upgrade);
          return;
        }
        const shouldTick = upgrade.duration.ownerTurns ? actor === 'player' : actor === 'enemy';
        if (!shouldTick) {
          next.push(upgrade);
          return;
        }
        const remaining = (upgrade.remainingTurns ?? upgrade.duration.turns) - 1;
        changed = true;
        if (remaining > 0) {
          next.push({ ...upgrade, remainingTurns: remaining });
        }
      });
      return next;
    });
    if (changed) {
      this.applyPersistentModifiers();
    }
  }

  private generateUpgrades(
    trackLevels: Record<TrackKey, number>,
    room: number,
    seed?: number,
    rollIndex = 0
  ): UpgradeOption[] {
    const rng = this.createRng(typeof seed === 'number' ? seed + room * 9973 + rollIndex * 101 : undefined);
    return UPGRADE_TRACKS.map(track => {
      const def = this.pickUpgradeForTrack(track, trackLevels, room, rng);
      const disabledReason = this.getUpgradeLockReason(def, trackLevels);
      return {
        id: this.uid(),
        upgrade: def,
        disabledReason
      };
    });
  }

  private pickUpgradeForTrack(
    track: UpgradeTrack,
    trackLevels: Record<TrackKey, number>,
    room: number,
    rng: () => number
  ): UpgradeDef {
    const defs = getUpgradesByTrack(track);
    if (!defs.length) {
      return this.fallbackUpgrade(track);
    }
    const rarity = this.rollRarity(roomToStage(room), rng);
    const eligible = defs.filter(def => !this.getUpgradeLockReason(def, trackLevels));
    const pool = eligible.length ? eligible : defs;
    const byRarity = pool.filter(def => def.rarity === rarity);
    const finalPool = byRarity.length ? byRarity : pool;
    const index = Math.floor(rng() * finalPool.length);
    return finalPool[Math.max(0, Math.min(index, finalPool.length - 1))];
  }

  private rollRarity(stage: 'early' | 'mid' | 'late', rng: () => number): UpgradeRarity {
    const roll = rng();
    if (stage === 'early') {
      return roll < 0.85 ? 'common' : 'rare';
    }
    if (stage === 'mid') {
      if (roll < 0.6) return 'common';
      if (roll < 0.9) return 'rare';
      return 'epic';
    }
    if (roll < 0.35) return 'common';
    if (roll < 0.75) return 'rare';
    return 'epic';
  }

  private getUpgradeLockReason(def: UpgradeDef, trackLevels: Record<TrackKey, number>): string | undefined {
    const gating = def.gating;
    if (!gating) return undefined;
    if (typeof gating.minTrackLevel === 'number') {
      if (trackLevels[def.track] < gating.minTrackLevel) {
        return `Requires Track ${def.track} level ${gating.minTrackLevel}.`;
      }
    }
    if (typeof gating.requiresOtherTrackAtLeast === 'number') {
      const meets = UPGRADE_TRACKS.filter(track => track !== def.track).some(
        track => trackLevels[track] >= gating.requiresOtherTrackAtLeast!
      );
      if (!meets) {
        return `Requires another track at level ${gating.requiresOtherTrackAtLeast}.`;
      }
    }
    return undefined;
  }

  private createRng(seed?: number): () => number {
    if (typeof seed !== 'number' || Number.isNaN(seed)) {
      return Math.random;
    }
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private fallbackUpgrade(track: UpgradeTrack): UpgradeDef {
    return {
      id: `fallback-${track}`,
      name: `Track ${track} Boost`,
      track,
      rarity: 'common',
      duration: { type: 'run' },
      effects: [{ text: 'Temporary fallback upgrade.' }],
      modifiers: {}
    };
  }
}

