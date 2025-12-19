import { RingSetKey, RingSlot, RingStat } from '../../../core/models/ring.model';

export interface SigilDef {
  id: string;
  name: string;
  description: string;
  level: number;
  slot: RingSlot;
  setKey: RingSetKey;
  mainStat: RingStat;
  subStats: RingStat[];
}
