import { EchoDefinition } from './echo.model';
import { AscensionShopServiceDefinition } from './ascension-shop-service.model';

export interface AscensionShopEchoOfferItem {
  kind: 'echo';
  echo: EchoDefinition;
  price: number;
  sold?: boolean;
}

export interface AscensionShopRestOfferItem {
  kind: 'rest';
  id: string;
  name: string;
  description: string;
  price: number;
  sold?: boolean;
}

export type AscensionShopEchoOffer =
  | AscensionShopEchoOfferItem
  | AscensionShopRestOfferItem;

export interface AscensionShopServiceOffer {
  service: AscensionShopServiceDefinition;
  price: number;
  purchased?: boolean;
}

export interface AscensionShopInventory {
  echoesForSale: AscensionShopEchoOffer[];
  servicesForSale: AscensionShopServiceOffer[];
}
