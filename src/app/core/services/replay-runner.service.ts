import { Injectable, computed, inject, signal } from "@angular/core";
import { ReplayLogService } from "./replay-log.service";
import {
  ReplayEvent,
  RunStartPayload,
  DraftPickPayload,
  ShopBuyPayload,
  BargainPickPayload,
  ServiceUsePayload,
  BattleEndPayload,
  EnterRoomPayload
} from "../models/replay.model";
import { AscensionRunStateService } from "../../features/echoes-of-ascension/state/ascension-run-state.service";
import { AscensionEchoDraftService } from "../../features/echoes-of-ascension/services/ascension-echo-draft.service";
import { AscensionShopService } from "../../features/echoes-of-ascension/services/ascension-shop.service";
import { AscensionBargainService } from "../../features/echoes-of-ascension/services/ascension-bargain.service";
import { AscensionOrchestratorService } from "../../features/echoes-of-ascension/services/ascension-orchestrator.service";
import {
  AscensionDraftOption,
  AscensionEchoDraftOption
} from "../../features/echoes-of-ascension/models/ascension-draft-option.model";
import { AscensionShopInventory } from "../../features/echoes-of-ascension/models/ascension-shop.model";
import { ResonanceUpgradeOption } from "../../features/echoes-of-ascension/models/resonance.model";
import { ASCENSION_CONFIG } from "../../features/echoes-of-ascension/content/configs/ascension.config";
import { ASCENSION_PATHS } from "../../features/echoes-of-ascension/content/configs/ascension-paths";
import type { AscensionRoomType } from "../../features/echoes-of-ascension/state/ascension-run-state.model";
import {
  ASCENSION_POTIONS,
  getAscensionPotionById
} from "../../features/echoes-of-ascension/content/configs/ascension-potions";
import { ProfileStateService } from "./profile-state.service";
import { PlayerStateService } from "./player-state.service";

@Injectable({ providedIn: "root" })
export class ReplayRunnerService {
  private readonly replayLog = inject(ReplayLogService);
  private readonly runState = inject(AscensionRunStateService);
  private readonly draftService = inject(AscensionEchoDraftService);
  private readonly shopService = inject(AscensionShopService);
  private readonly bargainService = inject(AscensionBargainService);
  private readonly orchestrator = inject(AscensionOrchestratorService);
  private readonly profile = inject(ProfileStateService);
  private readonly player = inject(PlayerStateService);

  private events: ReplayEvent[] = [];
  private readonly index = signal(0);
  private readonly lastEvent = signal<ReplayEvent | null>(null);
  private readonly error = signal<string | null>(null);
  private started = false;

  private currentDraftOffer: AscensionDraftOption[] | null = null;
  private currentShop: AscensionShopInventory | null = null;
  private currentBargainOptions: ResonanceUpgradeOption[] | null = null;

  private readonly roomTypes: AscensionRoomType[] = [
    "start",
    "battle",
    "draft",
    "shop",
    "bargain",
    "summary"
  ];

  readonly position = computed(() => this.index());
  readonly total = computed(() => this.events.length);
  readonly last = computed(() => this.lastEvent());
  readonly failure = computed(() => this.error());

  load(events: ReplayEvent[]): void {
    this.reset();
    this.events = [...events];
  }

  start(): void {
    if (!this.events.length) {
      this.fail("Replay has no events.");
      return;
    }
    const first = this.events[0];
    if (first.t !== "runStart") {
      this.fail("Replay must begin with runStart.");
      return;
    }
    this.replayLog.setEnabled(false);
    this.started = true;
    this.applyRunStart(first.payload as RunStartPayload);
    if (this.error()) return;
    this.lastEvent.set(first);
    this.index.set(1);
  }

  step(): void {
    if (this.error()) return;
    if (!this.started) {
      this.start();
      return;
    }
    const currentIndex = this.index();
    if (currentIndex >= this.events.length) return;
    const event = this.events[currentIndex];
    try {
      this.applyEvent(event);
      if (this.error()) return;
      this.lastEvent.set(event);
      this.index.set(currentIndex + 1);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "Replay step failed.");
    }
  }

  runAll(): void {
    while (this.index() < this.events.length && !this.error()) {
      this.step();
    }
  }

  reset(): void {
    this.replayLog.setEnabled(true);
    this.events = [];
    this.index.set(0);
    this.lastEvent.set(null);
    this.error.set(null);
    this.started = false;
    this.currentDraftOffer = null;
    this.currentShop = null;
    this.currentBargainOptions = null;
    this.shopService.clearShop();
    this.runState.resetRun();
  }

  private applyEvent(event: ReplayEvent): void {
    switch (event.t) {
      case "enterRoom":
        this.applyEnterRoom(event.payload as EnterRoomPayload);
        return;
      case "draftPick":
        this.applyDraftPick(event.payload as DraftPickPayload);
        return;
      case "shopBuy":
        this.applyShopBuy(event.payload as ShopBuyPayload);
        return;
      case "serviceUse":
        this.applyServiceUse(event.payload as ServiceUsePayload);
        return;
      case "bargainPick":
        this.applyBargainPick(event.payload as BargainPickPayload);
        return;
      case "battleStart":
        return;
      case "battleEnd":
        this.applyBattleEnd(event.payload as BattleEndPayload);
        return;
      case "runStart":
        this.applyRunStart(event.payload as RunStartPayload);
        return;
    }
  }

  private applyRunStart(payload: RunStartPayload): void {
    if (payload.mode && payload.mode !== "ascension") {
      this.fail("Replay mode is not supported in this runner.");
      return;
    }
    if (typeof payload.seed !== "number") {
      this.fail("runStart seed is missing.");
      return;
    }

    const originPathId =
      payload.originPathId ?? this.profile.activeKaelis()?.routeType ?? null;
    const runPathId = payload.runPathId ?? null;
    const selectedPotionId = payload.selectedPotionId ?? null;

    if (!originPathId) {
      this.fail("runStart originPathId is missing.");
      return;
    }
    if (!ASCENSION_PATHS.some((path) => path.id === originPathId)) {
      this.fail(`runStart originPathId "${originPathId}" is invalid.`);
      return;
    }
    if (!runPathId) {
      this.fail("runStart runPathId is missing.");
      return;
    }
    if (!selectedPotionId) {
      this.fail("runStart selectedPotionId is missing.");
      return;
    }
    if (!ASCENSION_PATHS.some((path) => path.id === runPathId)) {
      this.fail(`runStart runPathId "${runPathId}" is invalid.`);
      return;
    }
    if (!ASCENSION_POTIONS.some((potion) => potion.id === selectedPotionId)) {
      this.fail(`runStart selectedPotionId "${selectedPotionId}" is invalid.`);
      return;
    }

    const runModifiers =
      payload.runModifiers ?? this.buildRunModifiers(selectedPotionId);
    const hpMax = payload.hpMax ?? this.applyMaxHpModifier(runModifiers);
    const hpCurrent = payload.hpCurrent ?? hpMax;
    const floorIndex = payload.floorIndex ?? 1;
    const roomType = payload.roomType ?? "battle";
    if (!this.roomTypes.includes(roomType as AscensionRoomType)) {
      this.fail(`runStart roomType "${roomType}" is invalid.`);
      return;
    }

    this.runState.createNewRun({
      seed: payload.seed,
      floorIndex,
      roomType: roomType as AscensionRoomType,
      originPathId,
      runPathId,
      selectedPotionId,
      hpMax,
      hpCurrent
    });
    this.runState.patchState({
      echoFragments: 0,
      potionUsed: true,
      activePotionId: selectedPotionId,
      runModifiers
    });
  }

  private applyEnterRoom(payload: EnterRoomPayload): void {
    if (!Number.isFinite(payload.roomIndex)) {
      this.fail("enterRoom roomIndex is invalid.");
      return;
    }
    if (!payload.roomType) {
      this.fail("enterRoom roomType is missing.");
      return;
    }
    if (!this.roomTypes.includes(payload.roomType as AscensionRoomType)) {
      this.fail(`enterRoom roomType "${payload.roomType}" is invalid.`);
      return;
    }
    this.runState.patchState({
      floorIndex: payload.roomIndex,
      roomType: payload.roomType as AscensionRoomType
    });

    this.currentDraftOffer = null;
    this.currentShop = null;
    this.currentBargainOptions = null;

    if (payload.roomType === "draft") {
      this.currentDraftOffer = this.draftService.generateOffer();
    } else if (payload.roomType === "shop") {
      this.currentShop = this.shopService.generateShopInventory(
        this.runState.getSnapshot()
      );
    } else if (payload.roomType === "bargain") {
      this.currentBargainOptions = this.bargainService.generateBargainOptions(
        this.runState.getSnapshot()
      );
    }
  }

  private applyDraftPick(payload: DraftPickPayload): void {
    const offer = this.currentDraftOffer ?? this.draftService.generateOffer();
    const option = offer[payload.optionIndex];
    if (!option) {
      this.fail("draftPick optionIndex is out of range.");
      return;
    }
    if (this.isEchoOption(option)) {
      if (option.echo.id !== payload.pickedId) {
        this.fail("draftPick pickedId does not match offered echo.");
        return;
      }
      this.draftService.applyEchoPick(option.echo.id);
    } else {
      if (option.id !== payload.pickedId) {
        this.fail("draftPick pickedId does not match rest option.");
        return;
      }
      this.draftService.applyRestPick();
    }
    this.currentDraftOffer = null;
  }

  private applyShopBuy(payload: ShopBuyPayload): void {
    const inventory =
      this.currentShop ??
      this.shopService.generateShopInventory(this.runState.getSnapshot());
    const offer = inventory.echoesForSale[payload.optionIndex];
    if (!offer) {
      this.fail("shopBuy optionIndex is out of range.");
      return;
    }
    const boughtId = offer.kind === "echo" ? offer.echo.id : offer.id;
    if (boughtId !== payload.boughtId) {
      this.fail("shopBuy boughtId does not match offered item.");
      return;
    }
    this.shopService.buyEcho(offer);
  }

  private applyServiceUse(payload: ServiceUsePayload): void {
    const inventory =
      this.currentShop ??
      this.shopService.generateShopInventory(this.runState.getSnapshot());
    const index = this.serviceIndexForKey(payload.key);
    if (index === null) {
      this.fail("serviceUse key must be q, w, or e.");
      return;
    }
    const offer = inventory.servicesForSale[index];
    if (!offer) {
      this.fail("serviceUse optionIndex is out of range.");
      return;
    }
    if (payload.serviceId && offer.service.id !== payload.serviceId) {
      this.fail("serviceUse serviceId does not match offered service.");
      return;
    }
    this.shopService.buyService(offer.service.id);
  }

  private applyBargainPick(payload: BargainPickPayload): void {
    const options =
      this.currentBargainOptions ??
      this.bargainService.generateBargainOptions(this.runState.getSnapshot());
    if (payload.optionIndex < 0) {
      this.bargainService.declineBargain();
      return;
    }
    const option = options[payload.optionIndex];
    if (!option) {
      this.fail("bargainPick optionIndex is out of range.");
      return;
    }
    if (payload.pickedId && option.id !== payload.pickedId) {
      this.fail("bargainPick pickedId does not match offer.");
      return;
    }
    this.bargainService.applyBargainOption(option.id);
  }

  private applyBattleEnd(payload: BattleEndPayload): void {
    const snapshot = this.runState.getSnapshot();
    if (payload.result === "victory") {
      if (snapshot.floorIndex >= ASCENSION_CONFIG.totalFloors) {
        this.finalizeRun("victory");
        return;
      }
      this.orchestrator.onBattleWin();
      return;
    }
    this.finalizeRun("defeat");
  }

  private finalizeRun(outcome: "victory" | "defeat"): void {
    const snapshot = this.runState.getSnapshot();
    const fragmentsAwarded =
      outcome === "victory" && snapshot.floorIndex >= ASCENSION_CONFIG.totalFloors
        ? this.awardFragments(snapshot.floorIndex) +
          this.bonusFragmentsPerVictory(snapshot)
        : 0;
    const nextFragments = snapshot.echoFragments + fragmentsAwarded;
    const nextEarnedTotal =
      snapshot.echoFragmentsEarnedTotal + fragmentsAwarded;
    const floorsCleared =
      outcome === "victory"
        ? ASCENSION_CONFIG.totalFloors
        : Math.max(0, snapshot.floorIndex - 1);
    this.player.unlockLoadout();
    this.runState.patchState({
      runOutcome: outcome,
      floorsCleared,
      echoFragments: nextFragments,
      echoFragmentsEarnedTotal: nextEarnedTotal,
      roomType: "summary",
      endTimestamp: Date.now()
    });
  }

  private awardFragments(floorIndex: number): number {
    const base = 4;
    const bonus = Math.min(4, Math.floor(floorIndex / 2));
    return base + bonus;
  }

  private bonusFragmentsPerVictory(snapshot: { runModifiers?: { fragmentsPerVictory?: number } }): number {
    return snapshot.runModifiers?.fragmentsPerVictory ?? 0;
  }

  private buildRunModifiers(potionId: string): Record<string, number> {
    const potion = getAscensionPotionById(potionId);
    return { ...(potion?.runEffects ?? {}) };
  }

  private applyMaxHpModifier(modifiers: Record<string, number>): number {
    const baseHp = ASCENSION_CONFIG.baseHp;
    const bonus = modifiers.maxHpPercent ?? 0;
    if (!bonus) return baseHp;
    return Math.round(baseHp * (1 + bonus / 100));
  }

  private isEchoOption(
    option: AscensionDraftOption
  ): option is AscensionEchoDraftOption {
    return option.kind === "echo";
  }

  private serviceIndexForKey(key: string): number | null {
    const lower = key.toLowerCase();
    if (lower === "q") return 0;
    if (lower === "w") return 1;
    if (lower === "e") return 2;
    return null;
  }

  private fail(message: string): void {
    this.error.set(message);
  }
}
