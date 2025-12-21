import { SkinDefinition } from '../../../core/models/skin.model';
import { KaelisId } from '../../../core/models/kaelis.model';
import { KAELIS_LIST } from '../../kaelis';
import { SkinDef } from './skin.types';
import { VELVET_DEFAULT_SKIN_DEF } from './defs/velvet-default.skin';
import { VELVET_CRIMSON_SKIN_DEF } from './defs/velvet-crimson.skin';
import { VELVET_ASCENDANT_SKIN_DEF } from './defs/velvet-ascendant.skin';
import { LUMEN_DEFAULT_SKIN_DEF } from './defs/lumen-default.skin';
import { LUMEN_SPECTRUM_SKIN_DEF } from './defs/lumen-spectrum.skin';

const RAW_SKINS: SkinDef[] = [
  VELVET_DEFAULT_SKIN_DEF,
  VELVET_CRIMSON_SKIN_DEF,
  VELVET_ASCENDANT_SKIN_DEF,
  LUMEN_DEFAULT_SKIN_DEF,
  LUMEN_SPECTRUM_SKIN_DEF
];

function mapSkin(def: SkinDef): SkinDefinition {
  return {
    id: def.id,
    kaelisId: def.kaelisId,
    name: def.name,
    description: def.description,
    rarity: def.rarity,
    imageUrl: def.imageUrl,
    tags: def.tags ? [...def.tags] : undefined,
    isDefault: def.isDefault
  };
}

export const SKIN_CATALOG: Record<string, SkinDefinition> = RAW_SKINS.reduce<Record<string, SkinDefinition>>(
  (acc, def) => {
    acc[def.id] = mapSkin(def);
    return acc;
  },
  {}
);

export const SKIN_LIST: SkinDefinition[] = Object.values(SKIN_CATALOG);

export const DEFAULT_SKIN_BY_KAELIS = KAELIS_LIST.reduce<Record<KaelisId, string>>((acc, kaelis) => {
  const skins = SKIN_LIST.filter(skin => skin.kaelisId === kaelis.id);
  const fallback = skins.find(skin => skin.isDefault) ?? skins[0];
  if (fallback) {
    acc[kaelis.id] = fallback.id;
  }
  return acc;
}, {} as Record<KaelisId, string>);

export function getSkinDefinition(id: string): SkinDefinition | undefined {
  return SKIN_CATALOG[id];
}

export function getSkinsForKaelis(kaelisId: KaelisId): SkinDefinition[] {
  return SKIN_LIST.filter(skin => skin.kaelisId === kaelisId);
}
