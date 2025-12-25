import { EchoDefinition } from '../../../models/echo.model';

export const COLOSSUS_ECHOES: EchoDefinition[] = [
  {
    id: 'stonebreaker',
    name: 'Stonebreaker',
    description: 'Deal 12% more posture damage.',
    pathId: 'Colossus',
    rarity: 'common',
    tags: ['posture']
  },
  {
    id: 'iron-root',
    name: 'Iron Root',
    description: 'Increase max HP by 8.',
    pathId: 'Colossus',
    rarity: 'common',
    tags: ['hp']
  },
  {
    id: 'titan-grip',
    name: 'Titan Grip',
    description: 'Deal 5% more posture damage to staggered foes.',
    pathId: 'Colossus',
    rarity: 'common',
    tags: ['posture']
  }
];
