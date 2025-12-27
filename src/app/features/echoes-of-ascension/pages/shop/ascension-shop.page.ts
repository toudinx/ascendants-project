import { Component, HostListener, OnInit, inject } from '@angular/core';
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
  protected readonly echoHotkeys = ['1', '2', '3'];
  protected readonly serviceHotkeys = ['Q', 'W', 'E'];
  protected isTransitioning = false;

  ngOnInit(): void {
    this.inventory = this.shopService.generateShopInventory(this.runState.getSnapshot());
  }

  canBuyEcho(offer: AscensionShopEchoOffer, state: AscensionRunState): boolean {
    return this.shopService.canBuyEcho(offer, state);
  }

  canBuyService(offer: AscensionShopServiceOffer, state: AscensionRunState): boolean {
    return this.shopService.canBuyService(offer, state);
  }

  @HostListener('window:keydown', ['$event'])
  handleHotkeys(event: KeyboardEvent): void {
    if (event.repeat || this.isTransitioning || !this.inventory) return;
    if (this.isEditableTarget(event.target)) return;

    if (event.code === 'Space') {
      event.preventDefault();
      this.continue();
      return;
    }

    const echoIndex = this.echoHotkeyIndex(event.code);
    if (echoIndex !== null) {
      this.tryBuyEchoByIndex(echoIndex, event);
      return;
    }

    const serviceIndex = this.serviceHotkeyIndex(event.code);
    if (serviceIndex !== null) {
      this.tryBuyServiceByIndex(serviceIndex, event);
    }
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
    this.isTransitioning = true;
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

  private tryBuyEchoByIndex(index: number, event: KeyboardEvent): void {
    const offer = this.inventory?.echoesForSale?.[index];
    if (!offer) return;
    const snapshot = this.runState.getSnapshot();
    if (!this.canBuyEcho(offer, snapshot)) return;
    event.preventDefault();
    this.buyEcho(offer);
  }

  private tryBuyServiceByIndex(index: number, event: KeyboardEvent): void {
    const offer = this.inventory?.servicesForSale?.[index];
    if (!offer) return;
    const snapshot = this.runState.getSnapshot();
    if (!this.canBuyService(offer, snapshot)) return;
    event.preventDefault();
    this.buyService(offer);
  }

  private echoHotkeyIndex(code: string): number | null {
    switch (code) {
      case 'Digit1':
      case 'Numpad1':
        return 0;
      case 'Digit2':
      case 'Numpad2':
        return 1;
      case 'Digit3':
      case 'Numpad3':
        return 2;
      default:
        return null;
    }
  }

  private serviceHotkeyIndex(code: string): number | null {
    switch (code) {
      case 'KeyQ':
        return 0;
      case 'KeyW':
        return 1;
      case 'KeyE':
        return 2;
      default:
        return null;
    }
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }
    return target.isContentEditable;
  }
}
