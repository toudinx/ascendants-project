import { RouteKey } from './routes.model';
import { UpgradeOption } from './upgrades.model';

export type RoomType = 'normal' | 'mini-boss' | 'boss';
export type RunPhase = 'idle' | 'start' | 'battle' | 'reward' | 'prep' | 'evolution' | 'summary' | 'finished' | 'death' | 'victory';
export type RunResult = 'none' | 'victory' | 'defeat' | 'fled';

export interface RunState {
  phase: RunPhase;
  currentRoom: number;
  totalRooms: number;
  roomType: RoomType;
  routeLevels: Record<RouteKey, number>;
  initialRouteChoice?: RouteKey;
  availableUpgrades: UpgradeOption[];
  evolutions: string[];
  rerollsAvailable: number;
  potions: number;
  result: RunResult;
  isFinalEvolution: boolean;
}
