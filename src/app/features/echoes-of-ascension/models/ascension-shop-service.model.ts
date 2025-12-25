import { AscensionNextFightBuffs } from '../state/ascension-run-state.model';

export type AscensionShopServiceKind = 'heal' | 'buff';

export interface AscensionShopServiceDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  kind: AscensionShopServiceKind;
  healPercent?: number;
  nextFightBuffs?: AscensionNextFightBuffs;
}
