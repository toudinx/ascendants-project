import { UpgradeDef } from '../upgrade.types';

export const PRECISION_EDGE_UPGRADE: UpgradeDef = {
  id: 'precision-edge',
  name: 'Precision Edge',
  track: 'A',
  rarity: 'common',
  duration: { type: 'run' },
  effects: [{ icon: '*', text: '+5% crit rate.' }],
  modifiers: {
    addCritRate: 0.05
  },
  tags: ['crit']
};
