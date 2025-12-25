import { Injectable, inject, isDevMode } from '@angular/core';
import { getEchoes, getEchoById } from '../content/echoes';
import { getResonances } from '../content/resonances';
import { getShopServices } from '../content/shop-services';
import { EchoDefinition } from '../models/echo.model';
import {
  AscensionShopEchoOffer,
  AscensionShopInventory,
  AscensionShopServiceOffer
} from '../models/ascension-shop.model';
import { AscensionRunStateService } from '../state/ascension-run-state.service';
import { AscensionRandomService } from './ascension-random.service';
import type {
  AscensionNextFightBuffs,
  AscensionRunState
} from '../state/ascension-run-state.model';

const ECHO_PRICE_BY_RARITY: Record<EchoDefinition['rarity'], number> = {
  common: 6,
  rare: 9,
  epic: 12
};
const REST_NAME = 'Rest';
const REST_DESCRIPTION = 'Heal 15% of your current HP.';

@Injectable({ providedIn: 'root' })
export class AscensionShopService {
  private readonly state = inject(AscensionRunStateService);
  private readonly random = inject(AscensionRandomService);
  private currentInventory: AscensionShopInventory | null = null;
  private currentShopKey: string | null = null;
  private echoPurchased = false;
  private healPurchased = false;
  private buffPurchases = 0;

  generateShopInventory(state: AscensionRunState): AscensionShopInventory {
    const key = `${state.runId || 'run'}:${state.floorIndex}`;
    if (this.currentInventory && this.currentShopKey === key) {
      return this.currentInventory;
    }

    const echoesForSale = this.generateEchoOffers(state);
    const servicesForSale = this.generateServiceOffers();

    this.currentShopKey = key;
    this.currentInventory = { echoesForSale, servicesForSale };
    this.echoPurchased = false;
    this.healPurchased = false;
    this.buffPurchases = 0;
    return this.currentInventory;
  }

  canBuyEcho(
    offer: AscensionShopEchoOffer,
    state: AscensionRunState
  ): boolean {
    if (offer.sold || this.echoPurchased) return false;
    return state.echoFragments >= offer.price;
  }

  canBuyService(
    offer: AscensionShopServiceOffer,
    state: AscensionRunState
  ): boolean {
    if (offer.purchased) return false;
    if (offer.service.kind === 'heal' && this.healPurchased) return false;
    if (offer.service.kind === 'buff' && this.buffPurchases >= 2) return false;
    return state.echoFragments >= offer.price;
  }

  buyEcho(offer: AscensionShopEchoOffer): boolean {
    const inventory = this.currentInventory;
    const snapshot = this.state.getSnapshot();
    if (!inventory || this.echoPurchased) return false;

    if (!inventory.echoesForSale.includes(offer)) return false;
    if (offer.sold) return false;
    if (snapshot.echoFragments < offer.price) return false;

    if (offer.kind === 'rest') {
      const healAmount = Math.ceil(snapshot.hpCurrent * 0.15);
      const hpCurrent = Math.min(snapshot.hpMax, snapshot.hpCurrent + healAmount);
      this.state.patchState({
        echoFragments: snapshot.echoFragments - offer.price,
        echoFragmentsSpentTotal: snapshot.echoFragmentsSpentTotal + offer.price,
        hpCurrent
      });
      offer.sold = true;
      this.echoPurchased = true;
      return true;
    }

    const echoId = offer.echo.id;
    const echo = getEchoById(echoId);
    if (!echo || snapshot.pickedEchoIds.includes(echoId)) return false;

    const originMatches =
      !!snapshot.originPathId && echo.pathId === snapshot.originPathId;
    const runMatches = !!snapshot.runPathId && echo.pathId === snapshot.runPathId;
    const originEchoCount = snapshot.originEchoCount + (originMatches ? 1 : 0);
    const runEchoCount = snapshot.runEchoCount + (runMatches ? 1 : 0);
    const resonanceUnlocked =
      !snapshot.resonanceActive && originEchoCount >= 3 && runEchoCount >= 2;
    const resonanceId = resonanceUnlocked
      ? snapshot.resonanceId ?? this.pickResonanceId(snapshot)
      : snapshot.resonanceId ?? null;

    this.state.patchState({
      echoFragments: snapshot.echoFragments - offer.price,
      echoFragmentsSpentTotal: snapshot.echoFragmentsSpentTotal + offer.price,
      pickedEchoIds: [...snapshot.pickedEchoIds, echoId],
      originEchoCount,
      runEchoCount,
      resonanceActive: resonanceUnlocked ? true : snapshot.resonanceActive,
      resonanceId,
      resonanceUpgradeIds: snapshot.resonanceUpgradeIds?.length
        ? snapshot.resonanceUpgradeIds
        : [],
      bargainPending:
        snapshot.bargainPending || (resonanceUnlocked ? true : false),
      bargainWindow: resonanceUnlocked ? 2 : snapshot.bargainWindow
    });

    offer.sold = true;
    this.echoPurchased = true;
    return true;
  }

  buyService(serviceId: string): boolean {
    const inventory = this.currentInventory;
    const snapshot = this.state.getSnapshot();
    if (!inventory) return false;

    const offer = inventory.servicesForSale.find(
      entry => entry.service.id === serviceId
    );
    if (!offer || offer.purchased) return false;
    if (snapshot.echoFragments < offer.price) return false;

    if (offer.service.kind === 'heal') {
      if (this.healPurchased) return false;
      const healPercent = offer.service.healPercent ?? 0;
      const healAmount = Math.round(snapshot.hpMax * healPercent);
      const hpCurrent = Math.min(snapshot.hpMax, snapshot.hpCurrent + healAmount);
      this.state.patchState({
        echoFragments: snapshot.echoFragments - offer.price,
        echoFragmentsSpentTotal: snapshot.echoFragmentsSpentTotal + offer.price,
        hpCurrent
      });
      this.healPurchased = true;
    } else {
      if (this.buffPurchases >= 2) return false;
      const buffs = offer.service.nextFightBuffs ?? {};
      this.state.patchState({
        echoFragments: snapshot.echoFragments - offer.price,
        echoFragmentsSpentTotal: snapshot.echoFragmentsSpentTotal + offer.price,
        nextFightBuffs: this.mergeBuffs(snapshot.nextFightBuffs, buffs)
      });
      this.buffPurchases += 1;
    }

    offer.purchased = true;
    return true;
  }

  clearShop(): void {
    this.currentInventory = null;
    this.currentShopKey = null;
    this.echoPurchased = false;
    this.healPurchased = false;
    this.buffPurchases = 0;
  }

  private generateEchoOffers(state: AscensionRunState): AscensionShopEchoOffer[] {
    const available = getEchoes().filter(
      echo => !state.pickedEchoIds.includes(echo.id)
    );
    const poolByPath = this.groupByPath(available);
    const originAvailableCount = state.originPathId
      ? poolByPath.get(state.originPathId)?.length ?? 0
      : 0;
    const runAvailableCount = state.runPathId
      ? poolByPath.get(state.runPathId)?.length ?? 0
      : 0;
    const resonanceUnlocked =
      state.resonanceActive ||
      (state.originEchoCount >= 3 && state.runEchoCount >= 2);

    if (
      !resonanceUnlocked &&
      ((state.originPathId && originAvailableCount === 0) ||
        (state.runPathId && runAvailableCount === 0))
    ) {
      this.logDiagnostics('shop-path-exhausted', state, poolByPath, []);
    }
    if (!available.length) {
      const restOffer = this.createRestOffer(1);
      this.logDiagnostics('shop-rest-fallback', state, poolByPath, [restOffer]);
      return [restOffer, this.createRestOffer(2), this.createRestOffer(3)];
    }

    const originPathId = state.originPathId;
    const runPathId = state.runPathId;
    const needOrigin = Math.max(0, 3 - state.originEchoCount);
    const needRun = Math.max(0, 2 - state.runEchoCount);

    const picked = new Set<string>();
    const offers: AscensionShopEchoOffer[] = [];

    const assistPath = this.pickAssistPath(
      originPathId,
      runPathId,
      needOrigin,
      needRun
    );
    const firstPick = this.pickEchoFromPath(assistPath, available, picked);
    if (firstPick) {
      offers.push({
        kind: 'echo',
        echo: firstPick,
        price: this.priceForEcho(firstPick)
      });
    }

    for (let i = 0; i < 2; i += 1) {
      const pathChoice = resonanceUnlocked
        ? null
        : this.pickWeightedPath(originPathId, runPathId);
      const nextPick = this.pickEchoFromPath(pathChoice, available, picked);
      if (nextPick) {
        offers.push({
          kind: 'echo',
          echo: nextPick,
          price: this.priceForEcho(nextPick)
        });
      }
    }

    while (offers.length < 3) {
      const fallback = this.pickEchoFromPool(available, picked);
      if (!fallback) break;
      offers.push({
        kind: 'echo',
        echo: fallback,
        price: this.priceForEcho(fallback)
      });
    }

    if (offers.length < 3) {
      const restNeeded = 3 - offers.length;
      for (let i = 0; i < restNeeded; i += 1) {
        offers.push(this.createRestOffer(offers.length + 1));
      }
      this.logDiagnostics('shop-rest-fallback', state, poolByPath, offers);
    }

    return offers;
  }

  private generateServiceOffers(): AscensionShopServiceOffer[] {
    const services = getShopServices();
    const healServices = services.filter(service => service.kind === 'heal');
    const buffServices = services.filter(service => service.kind === 'buff');

    const offers: AscensionShopServiceOffer[] = [];
    const healPick = this.pickRandom(healServices);
    if (healPick) {
      offers.push({ service: healPick, price: healPick.cost });
    }

    const buffPicks = this.pickRandomMany(buffServices, 2);
    buffPicks.forEach(buff => {
      offers.push({ service: buff, price: buff.cost });
    });

    return offers.slice(0, 3);
  }

  private pickAssistPath(
    originPathId: string | null,
    runPathId: string | null,
    needOrigin: number,
    needRun: number
  ): string | null {
    if (originPathId && runPathId) {
      if (needOrigin > needRun) return originPathId;
      if (needRun > needOrigin) return runPathId;
      return this.random.nextFloat() < 0.5 ? originPathId : runPathId;
    }
    return originPathId ?? runPathId ?? null;
  }

  private pickWeightedPath(
    originPathId: string | null,
    runPathId: string | null
  ): string | null {
    const roll = this.random.nextFloat();
    if (originPathId && roll < 0.5) return originPathId;
    if (runPathId && roll < 0.9) return runPathId;
    return null;
  }

  private pickEchoFromPath(
    pathId: string | null,
    pool: EchoDefinition[],
    picked: Set<string>
  ): EchoDefinition | null {
    const candidates = pool.filter(def => !picked.has(def.id));
    if (!candidates.length) return null;

    let filtered = candidates;
    if (pathId) {
      const pathMatches = candidates.filter(def => def.pathId === pathId);
      filtered = pathMatches.length ? pathMatches : candidates;
    } else {
      filtered = this.preferFlex(candidates);
    }

    const pick = this.pickRandom(filtered);
    if (pick) {
      picked.add(pick.id);
    }
    return pick;
  }

  private pickEchoFromPool(
    pool: EchoDefinition[],
    picked: Set<string>
  ): EchoDefinition | null {
    const available = pool.filter(def => !picked.has(def.id));
    const pick = this.pickRandom(available);
    if (pick) {
      picked.add(pick.id);
    }
    return pick;
  }

  private preferFlex(pool: EchoDefinition[]): EchoDefinition[] {
    const snapshot = this.state.getSnapshot();
    const originPathId = snapshot.originPathId;
    const runPathId = snapshot.runPathId;
    const flexPool = pool.filter(
      def => def.pathId !== originPathId && def.pathId !== runPathId
    );
    return flexPool.length ? flexPool : pool;
  }

  private priceForEcho(echo: EchoDefinition): number {
    return ECHO_PRICE_BY_RARITY[echo.rarity] ?? 6;
  }

  private mergeBuffs(
    current: AscensionNextFightBuffs | undefined,
    next: AscensionNextFightBuffs
  ): AscensionNextFightBuffs {
    const merged: AscensionNextFightBuffs = { ...(current ?? {}) };
    Object.entries(next).forEach(([key, value]) => {
      const numericValue = typeof value === 'number' ? value : 0;
      const existing = merged[key as keyof AscensionNextFightBuffs];
      if (typeof existing === 'number') {
        merged[key as keyof AscensionNextFightBuffs] = existing + numericValue;
      } else {
        merged[key as keyof AscensionNextFightBuffs] = numericValue;
      }
    });
    return merged;
  }

  private pickRandom<T>(pool: T[]): T | null {
    if (!pool.length) return null;
    return pool[this.random.nextInt(pool.length)];
  }

  private pickRandomMany<T>(pool: T[], count: number): T[] {
    if (!pool.length || count <= 0) return [];
    const copy = [...pool];
    const picks: T[] = [];
    while (copy.length && picks.length < count) {
      const index = this.random.nextInt(copy.length);
      picks.push(copy.splice(index, 1)[0]);
    }
    return picks;
  }

  private pickResonanceId(state: AscensionRunState): string | null {
    const resonances = getResonances();
    if (!resonances.length) return null;
    const pick = resonances[this.random.nextInt(resonances.length)];
    return pick?.id ?? null;
  }

  private createRestOffer(index: number): AscensionShopEchoOffer {
    return {
      kind: 'rest',
      id: `rest-${index}`,
      name: REST_NAME,
      description: REST_DESCRIPTION,
      price: 0
    };
  }

  private groupByPath(pool: EchoDefinition[]): Map<string, EchoDefinition[]> {
    const map = new Map<string, EchoDefinition[]>();
    pool.forEach(def => {
      const list = map.get(def.pathId) ?? [];
      list.push(def);
      map.set(def.pathId, list);
    });
    return map;
  }

  private logDiagnostics(
    reason: string,
    state: AscensionRunState,
    poolByPath: Map<string, EchoDefinition[]>,
    offers: AscensionShopEchoOffer[]
  ): void {
    if (!isDevMode()) return;
    const availableByPath: Record<string, number> = {};
    poolByPath.forEach((pool, pathId) => {
      availableByPath[pathId] = pool.length;
    });
    const offerPaths = offers.map(offer =>
      offer.kind === 'echo' ? offer.echo.pathId : 'REST'
    );
    console.warn('[AscensionShop]', reason, {
      seed: state.seed,
      floorIndex: state.floorIndex,
      originPathId: state.originPathId,
      runPathId: state.runPathId,
      availableByPath,
      offerPaths,
      pickedEchoCount: state.pickedEchoIds.length
    });
  }
}
