import { SigilSetKey, SigilSlot, SigilStat } from '../../../core/models/sigil.model';

export interface SigilDef {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  level: number;
  slot: SigilSlot;
  setKey: SigilSetKey;
  mainStat: SigilStat;
  subStats: SigilStat[];
}


