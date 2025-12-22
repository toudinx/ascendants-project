import { KaelisId } from '../core/models/kaelis.model';
import { getKaelisDefinition } from './kaelis';
import { getSkinDefinition } from './equipment/skins';

const FALLBACK_BATTLE_SPRITE_ID = 'velvet_battle_default';

export function resolveBattleSpriteId(kaelisId: KaelisId, equippedSkinId?: string | null): string {
  const skin = equippedSkinId ? getSkinDefinition(equippedSkinId) : undefined;
  if (skin && skin.kaelisId === kaelisId && skin.battleSpriteId) {
    return skin.battleSpriteId;
  }
  const kaelis = getKaelisDefinition(kaelisId);
  return kaelis?.defaultBattleSpriteId ?? FALLBACK_BATTLE_SPRITE_ID;
}

export function spriteIdToAssetPath(spriteId: string): string {
  const safeId = spriteId?.trim() ? spriteId : FALLBACK_BATTLE_SPRITE_ID;
  const folder = safeId.split('_')[0] || 'velvet';
  return `assets/battle/characters/${folder}/${safeId}.png`;
}
