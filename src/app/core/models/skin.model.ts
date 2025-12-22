import { KaelisId } from './kaelis.model';

export interface SkinDefinition {
  id: string;
  kaelisId: KaelisId;
  name: string;
  description: string;
  rarity: 'R' | 'SR' | 'SSR';
  imageUrl: string;
  battleSpriteId?: string;
  tags?: string[];
  isDefault?: boolean;
}
