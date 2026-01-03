import { EnemyAttributes, EnemyState } from './enemy.model';
import { PlayerAttributes, PlayerBuff, PlayerSigilSkillBuff, PlayerState } from './player.model';
import { LogActor, LogKind, UiLogEntry } from '../services/ui-state.service';
import { HitActionKind } from './hit-count.model';
import { KaelisKitConfig } from './kaelis.model';
import { WeaponId } from './weapon.model';
import { SigilSetKey } from './sigil.model';

export type ElementType = 'burn' | 'poison' | 'bleed' | 'rune';

export interface SerializedDotStack {
  id: string;
  element: ElementType;
  sourceId: string;
  damagePerTick: number;
  remainingTurns: number;
  appliedTurn: number;
  postureDamagePerTick?: number;
}

export interface SerializedPlayerState {
  attributes: PlayerAttributes;
  status?: PlayerState['status'];
  breakTurns?: number;
  skillCooldown?: number;
  dots?: SerializedDotStack[];
  buffs?: PlayerBuff[];
  kaelisRoute?: PlayerState['kaelisRoute'];
  kaelisId?: string;
  kaelisName?: string;
  kaelisSprite?: string;
  kit?: KaelisKitConfig;
  weaponId?: WeaponId;
  sigilSetCounts?: Record<SigilSetKey, number>;
  sigilSkillBuffs?: PlayerSigilSkillBuff[];
  sigilDamageBuffPercent?: number;
  sigilDamageBuffTurns?: number;
  sigilDamageBuffSource?: SigilSetKey;
}

export interface SerializedEnemyState {
  attributes: EnemyAttributes;
  state: EnemyState;
  breakTurns?: number;
  dots?: SerializedDotStack[];
}

export interface BattleEvent {
  id: string;
  actor: LogActor;
  text: string;
  turn: number;
  kind?: LogKind;
  value?: number;
  target?: 'player' | 'enemy';
  hitCount?: number;
  hitIndex?: number;
  actionKind?: HitActionKind;
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
        target: evt.target,
        hitCount: evt.hitCount,
        hitIndex: evt.hitIndex,
        actionKind: evt.actionKind
      });
    });
  });
  return entries;
}


