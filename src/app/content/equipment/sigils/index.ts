import { RingDefinition, RingSetDefinition } from '../../../core/models/ring.model';
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

function mapSigil(def: SigilDef): RingDefinition {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    level: def.level,
    slot: def.slot,
    setKey: def.setKey,
    mainStat: { ...def.mainStat },
    subStats: def.subStats.map(stat => ({ ...stat }))
  };
}

export const SIGIL_CATALOG: Record<string, RingDefinition> = RAW_SIGILS.reduce<
  Record<string, RingDefinition>
>((acc, def) => {
  acc[def.id] = mapSigil(def);
  return acc;
}, {});

export const SIGIL_LIST: RingDefinition[] = Object.values(SIGIL_CATALOG);

export const SIGIL_SETS: Record<string, RingSetDefinition> = {
  agressao: {
    key: 'agressao',
    name: 'Agressão',
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

export function getSigilDefinition(id: string): RingDefinition | undefined {
  return SIGIL_CATALOG[id];
}
