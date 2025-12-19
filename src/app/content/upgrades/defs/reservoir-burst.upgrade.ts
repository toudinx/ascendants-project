import { UpgradeDef } from '../upgrade.types';

export const RESERVOIR_BURST_UPGRADE: UpgradeDef = {
  id: 'reservoir-burst',
  name: 'Reservoir Burst',
  track: 'B',
  rarity: 'common',
  duration: { type: 'nextBattle' },
  effects: [{ icon: '+', text: 'Start next battle with +30 energy.' }],
  modifiers: {
    startNextBattleEnergy: 30
  },
  tags: ['energy']
};
