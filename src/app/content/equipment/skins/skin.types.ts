import { KaelisId } from '../../../core/models/kaelis.model';

export interface SkinDef {
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
