import { TrackKey } from './tracks.model';
import { UpgradeOption } from './upgrades.model';
import { RunKaelisSnapshot } from './kaelis.model';
import { WeaponDefinition } from './weapon.model';
import { RingDefinition } from './ring.model';
import { UpgradeDuration, UpgradeEffectLine, UpgradeModifiers, UpgradeRarity, UpgradeTrack } from '../../content/upgrades/upgrade.types';

export type RoomType = 'normal' | 'mini-boss' | 'boss';
export type RunPhase = 'idle' | 'start' | 'battle' | 'intermission' | 'reward' | 'prep' | 'evolution' | 'summary' | 'finished' | 'death' | 'victory';
export type RunResult = 'none' | 'victory' | 'defeat' | 'fled';

export interface RunState {
  phase: RunPhase;
  currentRoom: number;
  totalRooms: number;
  roomType: RoomType;
  trackLevels: Record<TrackKey, number>;
  initialTrackChoice?: TrackKey;
  availableUpgrades: UpgradeOption[];
  evolutions: string[];
  rerollsAvailable: number;
  potions: number;
  result: RunResult;
  isFinalEvolution: boolean;
  kaelis: RunKaelisSnapshot | null;
  loadout: RunLoadoutSnapshot | null;
  runUpgrades: RunUpgrade[];
}

export interface RunLoadoutSnapshot {
  weapon: WeaponDefinition;
  sigils: RingDefinition[];
}

export interface RunUpgrade {
  id: string;
  defId: string;
  track: UpgradeTrack;
  name: string;
  rarity: UpgradeRarity;
  duration: UpgradeDuration;
  effects: UpgradeEffectLine[];
  modifiers: UpgradeModifiers;
  remainingTurns?: number;
}

export interface RunBattleBonuses {
  energy?: number;
  postureShield?: number;
}
