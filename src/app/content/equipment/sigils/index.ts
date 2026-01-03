import { SigilDefinition, SigilSetDefinition } from '../../../core/models/sigil.model';
import { SigilDef } from './sigil.types';
import { AGGRESSION_CREST_I_DEF } from './defs/aggression-crest-i.sigil';
import { AGGRESSION_CREST_II_DEF } from './defs/aggression-crest-ii.sigil';
import { AGGRESSION_CREST_III_DEF } from './defs/aggression-crest-iii.sigil';
import { AGGRESSION_CREST_IV_DEF } from './defs/aggression-crest-iv.sigil';
import { AGGRESSION_CREST_V_DEF } from './defs/aggression-crest-v.sigil';
import { AGGRESSION_RESERVE_DEF } from './defs/aggression-reserve.sigil';

const RAW_SIGILS: SigilDef[] = [
  AGGRESSION_CREST_I_DEF,
  AGGRESSION_CREST_II_DEF,
  AGGRESSION_CREST_III_DEF,
  AGGRESSION_CREST_IV_DEF,
  AGGRESSION_CREST_V_DEF,
  AGGRESSION_RESERVE_DEF
];

function mapSigil(def: SigilDef): SigilDefinition {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    imageUrl: def.imageUrl,
    level: def.level,
    slot: def.slot,
    setKey: def.setKey,
    mainStat: { ...def.mainStat },
    subStats: def.subStats.map(stat => ({ ...stat }))
  };
}

export const SIGIL_CATALOG: Record<string, SigilDefinition> = RAW_SIGILS.reduce<
  Record<string, SigilDefinition>
>((acc, def) => {
  acc[def.id] = mapSigil(def);
  return acc;
}, {});

export const SIGIL_LIST: SigilDefinition[] = Object.values(SIGIL_CATALOG);

export const SIGIL_SETS: Record<string, SigilSetDefinition> = {
  agressao: {
    key: 'agressao',
    name: 'Aggression',
    threePieceBonus: {
      type: 'damage_percent',
      value: 12
    },
    fivePieceSkillBuff: {
      trigger: 'skill',
      damagePercent: 25,
      durationTurns: 2
    }
  }
};

export function getSigilDefinition(id: string): SigilDefinition | undefined {
  return SIGIL_CATALOG[id];
}


