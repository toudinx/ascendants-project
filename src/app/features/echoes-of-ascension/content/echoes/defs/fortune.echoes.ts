import { EchoDefinition } from '../../../models/echo.model';

export const FORTUNE_ECHOES: EchoDefinition[] = [
  {
    id: 'gilded-drift',
    name: 'Gilded Drift',
    description: 'Shop services cost 1 fewer fragments (min 1).',
    pathId: 'Fortune',
    rarity: 'rare',
    tags: ['shop']
  },
  {
    id: 'lucky-spiral',
    name: 'Lucky Spiral',
    description: 'Gain 1 fragment after flawless rooms.',
    pathId: 'Fortune',
    rarity: 'common',
    tags: ['fragments']
  },
  {
    id: 'coinfall-thread',
    name: 'Coinfall Thread',
    description: 'Shops begin with +2 fragments.',
    pathId: 'Fortune',
    rarity: 'common',
    tags: ['shop', 'fragments']
  }
];
