import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppHeaderComponent } from '../../../../shared/components';
import { ASCENSION_CONFIG } from '../../content/configs/ascension.config';
import { AscensionShopService } from '../../services/ascension-shop.service';
import { AscensionRunStateService } from '../../state/ascension-run-state.service';
import { ReplayLogService } from '../../../../core/services/replay-log.service';
import { roomToStage } from '../../../../content/balance/balance.config';
import {
  AscensionShopEchoOffer,
  AscensionShopInventory,
  AscensionShopServiceOffer
} from '../../models/ascension-shop.model';
import type { AscensionRunState } from '../../state/ascension-run-state.model';
import { HotkeyService } from '../../../../core/services/hotkey.service';

@Component({
  selector: 'app-ascension-shop-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './ascension-shop.page.html',
  styleUrls: ['./ascension-shop.page.scss']
})
export class AscensionShopPageComponent implements OnInit, OnDestroy {
  private readonly runState = inject(AscensionRunStateService);
  private readonly shopService = inject(AscensionShopService);
  private readonly replayLog = inject(ReplayLogService);
  private readonly router = inject(Router);
  private readonly hotkeys = inject(HotkeyService);

  protected readonly state$ = this.runState.getState();
  protected inventory: AscensionShopInventory | null = null;
  protected readonly echoHotkeys = ['1', '2', '3'];
  protected readonly serviceHotkeys = ['Q', 'W', 'E'];
  protected isTransitioning = false;

  ngOnInit(): void {
    this.inventory = this.shopService.generateShopInventory(this.runState.getSnapshot());
    this.hotkeys.register({
      '1': () => this.tryBuyEchoByIndex(0),
      '2': () => this.tryBuyEchoByIndex(1),
      '3': () => this.tryBuyEchoByIndex(2),
      q: () => this.tryBuyServiceByIndex(0),
      w: () => this.tryBuyServiceByIndex(1),
      e: () => this.tryBuyServiceByIndex(2),
      space: () => this.continue(),
      enter: () => this.continue()
    });
  }

  ngOnDestroy(): void {
    this.hotkeys.unregisterAll();
  }

  canBuyEcho(offer: AscensionShopEchoOffer, state: AscensionRunState): boolean {
    return this.shopService.canBuyEcho(offer, state);
  }

  canBuyService(offer: AscensionShopServiceOffer, state: AscensionRunState): boolean {
    return this.shopService.canBuyService(offer, state);
  }

  buyEcho(offer: AscensionShopEchoOffer, optionIndex?: number): void {
    if (offer.sold) return;
    const index =
      typeof optionIndex === 'number'
        ? optionIndex
        : this.inventory?.echoesForSale.indexOf(offer) ?? -1;
    const boughtId = offer.kind === 'echo' ? offer.echo.id : offer.id;
    if (index >= 0) {
      this.replayLog.append({
        v: 1,
        t: 'shopBuy',
        payload: {
          optionIndex: index,
          boughtId
        }
      });
    }
    this.shopService.buyEcho(offer);
  }

  buyService(offer: AscensionShopServiceOffer, optionIndex?: number): void {
    if (offer.purchased) return;
    const index =
      typeof optionIndex === 'number'
        ? optionIndex
        : this.inventory?.servicesForSale.indexOf(offer) ?? -1;
    const key = this.serviceKeyForIndex(index);
    if (key) {
      this.replayLog.append({
        v: 1,
        t: 'serviceUse',
        payload: {
          key,
          serviceId: offer.service.id,
          optionIndex: index
        }
      });
    }
    this.shopService.buyService(offer.service.id);
  }

  continue(): void {
    this.isTransitioning = true;
    const snapshot = this.runState.getSnapshot();
    const nextFloor = snapshot.floorIndex + 1;

    if (nextFloor > ASCENSION_CONFIG.totalFloors) {
      this.runState.patchState({
        floorIndex: ASCENSION_CONFIG.totalFloors,
        roomType: 'summary'
      });
      this.replayLog.append({
        v: 1,
        t: 'enterRoom',
        payload: {
          roomIndex: ASCENSION_CONFIG.totalFloors,
          roomType: 'summary',
          stage: roomToStage(ASCENSION_CONFIG.totalFloors)
        }
      });
      this.shopService.clearShop();
      this.router.navigateByUrl('/ascension/summary');
      return;
    }

    this.runState.patchState({ floorIndex: nextFloor, roomType: 'battle' });
    this.replayLog.append({
      v: 1,
      t: 'enterRoom',
      payload: {
        roomIndex: nextFloor,
        roomType: 'battle',
        stage: roomToStage(nextFloor)
      }
    });
    this.shopService.clearShop();
    this.router.navigateByUrl('/ascension/battle');
  }

  private tryBuyEchoByIndex(index: number): void {
    if (this.isTransitioning || !this.inventory) return;
    const offer = this.inventory?.echoesForSale?.[index];
    if (!offer) return;
    const snapshot = this.runState.getSnapshot();
    if (!this.canBuyEcho(offer, snapshot)) return;
    this.buyEcho(offer, index);
  }

  private tryBuyServiceByIndex(index: number): void {
    if (this.isTransitioning || !this.inventory) return;
    const offer = this.inventory?.servicesForSale?.[index];
    if (!offer) return;
    const snapshot = this.runState.getSnapshot();
    if (!this.canBuyService(offer, snapshot)) return;
    this.buyService(offer, index);
  }

  private serviceKeyForIndex(index: number): 'q' | 'w' | 'e' | null {
    if (index === 0) return 'q';
    if (index === 1) return 'w';
    if (index === 2) return 'e';
    return null;
  }

}
