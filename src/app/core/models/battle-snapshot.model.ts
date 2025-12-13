import { EnemyAttributes, EnemyState } from './enemy.model';
import { PlayerAttributes, PlayerBuff, PlayerState } from './player.model';
import { LogActor, LogKind, UiLogEntry } from '../services/ui-state.service';

export interface SerializedDotState {
  damage: number;
  posture: number;
  ticks: number;
  originTurn: number;
}

export interface SerializedPlayerState {
  attributes: PlayerAttributes;
  status?: PlayerState['status'];
  breakTurns?: number;
  skillCooldown?: number;
  dot?: SerializedDotState | null;
  buffs?: PlayerBuff[];
}

export interface SerializedEnemyState {
  attributes: EnemyAttributes;
  state: EnemyState;
  breakTurns?: number;
  dot?: SerializedDotState | null;
}

export interface BattleEvent {
  id: string;
  actor: LogActor;
  text: string;
  turn: number;
  kind?: LogKind;
  value?: number;
  target?: 'player' | 'enemy';
}

export interface BattleSnapshot {
  seed: number;
  turnIndex: number;
  playerState: SerializedPlayerState;
  enemyState: SerializedEnemyState;
  events: BattleEvent[];
}

export function buildLogFromSnapshots(snapshots: BattleSnapshot[]): UiLogEntry[] {
  const entries: UiLogEntry[] = [];
  snapshots.forEach(snap => {
    snap.events.forEach(evt => {
      entries.push({
        id: evt.id,
        actor: evt.actor,
        text: evt.text,
        turn: evt.turn,
        kind: evt.kind,
        value: evt.value,
        target: evt.target
      });
    });
  });
  return entries;
}
