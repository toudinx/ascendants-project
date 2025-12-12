import { RouteKey } from './routes.model';

export type UpgradeRarity = 'common' | 'rare' | 'epic';

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  route: RouteKey;
  rarity: UpgradeRarity;
  tag?: string;
}
