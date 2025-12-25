import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppHeaderComponent } from '../../../../shared/components';
import { ASCENSION_CONFIG } from '../../content/configs/ascension.config';
import { AscensionShopService } from '../../services/ascension-shop.service';
import { AscensionRunStateService } from '../../state/ascension-run-state.service';
import {
  AscensionShopEchoOffer,
  AscensionShopInventory,
  AscensionShopServiceOffer
} from '../../models/ascension-shop.model';
import type { AscensionRunState } from '../../state/ascension-run-state.model';

@Component({
  selector: 'app-ascension-shop-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './ascension-shop.page.html',
  styleUrls: ['./ascension-shop.page.scss']
})
export class AscensionShopPageComponent implements OnInit {
  private readonly runState = inject(AscensionRunStateService);
  private readonly shopService = inject(AscensionShopService);
  private readonly router = inject(Router);

  protected readonly state$ = this.runState.getState();
  protected inventory: AscensionShopInventory | null = null;

  ngOnInit(): void {
    this.inventory = this.shopService.generateShopInventory(this.runState.getSnapshot());
  }

  canBuyEcho(offer: AscensionShopEchoOffer, state: AscensionRunState): boolean {
    return this.shopService.canBuyEcho(offer, state);
  }

  canBuyService(offer: AscensionShopServiceOffer, state: AscensionRunState): boolean {
    return this.shopService.canBuyService(offer, state);
  }

  buyEcho(offer: AscensionShopEchoOffer): void {
    if (offer.sold) return;
    this.shopService.buyEcho(offer);
  }

  buyService(offer: AscensionShopServiceOffer): void {
    if (offer.purchased) return;
    this.shopService.buyService(offer.service.id);
  }

  continue(): void {
    const snapshot = this.runState.getSnapshot();
    const nextFloor = snapshot.floorIndex + 1;

    if (nextFloor > ASCENSION_CONFIG.totalFloors) {
      this.runState.patchState({
        floorIndex: ASCENSION_CONFIG.totalFloors,
        roomType: 'summary'
      });
      this.shopService.clearShop();
      this.router.navigateByUrl('/ascension/summary');
      return;
    }

    this.runState.patchState({ floorIndex: nextFloor, roomType: 'battle' });
    this.shopService.clearShop();
    this.router.navigateByUrl('/ascension/battle');
  }
}
