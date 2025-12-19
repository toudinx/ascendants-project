import { UpgradeDef } from '../upgrade.types';

export const BULWARK_ENTRY_UPGRADE: UpgradeDef = {
  id: 'bulwark-entry',
  name: 'Bulwark Entry',
  track: 'C',
  rarity: 'common',
  duration: { type: 'nextBattle' },
  effects: [{ icon: '+', text: 'Start next battle with +40 posture.' }],
  modifiers: {
    startNextBattlePosture: 40
  },
  tags: ['posture']
};
