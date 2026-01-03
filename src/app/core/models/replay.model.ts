export type ReplayEventVersion = 1;

export type ReplayEventType =
  | "runStart"
  | "enterRoom"
  | "draftPick"
  | "shopBuy"
  | "bargainPick"
  | "serviceUse"
  | "battleStart"
  | "battleEnd";

export type ReplayRunMode = "ascension" | "run";

export interface RunStartPayload {
  seed: number;
  mode?: ReplayRunMode;
  originPathId?: string | null;
  runPathId?: string | null;
  selectedPotionId?: string | null;
  hpMax?: number;
  hpCurrent?: number;
  runModifiers?: Record<string, number>;
  floorIndex?: number;
  roomType?: string;
}

export interface EnterRoomPayload {
  roomIndex: number;
  roomType: string;
  stage: string;
}

export interface DraftPickPayload {
  optionIndex: number;
  pickedId: string;
}

export interface ShopBuyPayload {
  optionIndex: number;
  boughtId: string;
}

export interface BargainPickPayload {
  optionIndex: number;
  pickedId?: string | null;
}

export interface ServiceUsePayload {
  key: "q" | "w" | "e";
  serviceId?: string;
  optionIndex?: number;
}

export interface BattleStartPayload {
  enemyId?: string;
  encounterId?: string;
  roomIndex?: number;
  roomType?: string;
}

export interface BattleEndPayload {
  result: "victory" | "defeat";
}

export interface ReplayEventBase<T extends ReplayEventType, P> {
  v: ReplayEventVersion;
  t: T;
  payload: P;
}

export type ReplayEvent =
  | ReplayEventBase<"runStart", RunStartPayload>
  | ReplayEventBase<"enterRoom", EnterRoomPayload>
  | ReplayEventBase<"draftPick", DraftPickPayload>
  | ReplayEventBase<"shopBuy", ShopBuyPayload>
  | ReplayEventBase<"bargainPick", BargainPickPayload>
  | ReplayEventBase<"serviceUse", ServiceUsePayload>
  | ReplayEventBase<"battleStart", BattleStartPayload>
  | ReplayEventBase<"battleEnd", BattleEndPayload>;

