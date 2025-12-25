export type AscensionRoomType = 'start' | 'battle' | 'draft' | 'shop' | 'bargain' | 'summary';

export interface AscensionNextFightBuffs {
  hpShield?: number;
  damageBoost?: number;
  energyBoost?: number;
  postureDamageBoost?: number;
}

export interface AscensionDraftHistoryEntry {
  originOptions: number;
  runOptions: number;
}

export interface AscensionRunModifiers {
  maxHpPercent?: number;
  damagePercent?: number;
  fragmentsPerVictory?: number;
}

export interface AscensionRunState {
  runId: string;
  seed: number;
  randomCounter: number;
  floorIndex: number;
  roomType: AscensionRoomType;
  originPathId: string | null;
  runPathId: string | null;
  hpCurrent: number;
  hpMax: number;
  potionUsed: boolean;
  selectedPotionId: string | null;
  activePotionId: string | null;
  runModifiers: AscensionRunModifiers;
  echoFragments: number;
  pickedEchoIds: string[];
  originEchoCount: number;
  runEchoCount: number;
  resonanceActive: boolean;
  resonanceId?: string | null;
  resonanceUpgradeIds: string[];
  bargainPending: boolean;
  bargainWindow: number;
  bargainsTaken: number;
  bargainTakenForResonance: boolean;
  lastBargainFloor: number | null;
  shopVisited: boolean;
  draftHistory: AscensionDraftHistoryEntry[];
  nextFightBuffs?: AscensionNextFightBuffs;
  runOutcome: 'victory' | 'defeat' | null;
  floorsCleared: number;
  echoFragmentsEarnedTotal: number;
  echoFragmentsSpentTotal: number;
  endTimestamp?: number | null;
}
