import { AscensionShopServiceDefinition } from '../models/ascension-shop-service.model';

export const ASCENSION_SHOP_SERVICES: AscensionShopServiceDefinition[] = [
  {
    id: 'restoration-bloom',
    name: 'Restoration Bloom',
    description: 'Restore 30% of maximum HP.',
    cost: 4,
    kind: 'heal',
    healPercent: 0.3
  },
  {
    id: 'warded-entry',
    name: 'Warded Entry',
    description: 'Start the next fight with 12 shield.',
    cost: 3,
    kind: 'buff',
    nextFightBuffs: { hpShield: 12 }
  },
  {
    id: 'posture-edge',
    name: 'Posture Edge',
    description: 'Next fight posture damage +20%.',
    cost: 3,
    kind: 'buff',
    nextFightBuffs: { postureDamageBoost: 0.2 }
  }
];

export function getShopServices(): AscensionShopServiceDefinition[] {
  return [...ASCENSION_SHOP_SERVICES];
}
