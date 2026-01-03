import { BattleSnapshot, SerializedEnemyState, SerializedPlayerState } from './battle-snapshot.model';
import { RunKaelisSnapshot } from './kaelis.model';
import { RunLoadoutSnapshot, RunPhase, RunResult, RunUpgrade, RoomType } from './run.model';
import { TrackKey } from './tracks.model';
import { UpgradeOption } from './upgrades.model';
import { EvolutionVisualKey } from './evolution-visual.model';

export const RUN_SNAPSHOT_VERSION = 1 as const;

export interface RunSnapshot {
  snapshotVersion: typeof RUN_SNAPSHOT_VERSION;
  runSeed: number | null;
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
  activeEvolutionVisual: EvolutionVisualKey | null;
  kaelis: RunKaelisSnapshot | null;
  loadout: RunLoadoutSnapshot | null;
  runUpgrades: RunUpgrade[];
  upgradeRoll: number;
  battleSeed: number | null;
  playerState: SerializedPlayerState | null;
  enemyState?: SerializedEnemyState;
  battleSnapshots?: BattleSnapshot[];
}
