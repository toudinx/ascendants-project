import { EchoDefinition } from '../../../models/echo.model';

export const RUIN_ECHOES: EchoDefinition[] = [
  {
    id: 'void-hymn',
    name: 'Void Hymn',
    description: 'Apply 1 decay on the first hit each battle.',
    pathId: 'Ruin',
    rarity: 'common',
    tags: ['decay', 'starter']
  },
  {
    id: 'corrosion-mark',
    name: 'Corrosion Mark',
    description: 'Enemies take 3% more damage per debuff.',
    pathId: 'Ruin',
    rarity: 'rare',
    tags: ['debuff']
  },
  {
    id: 'ash-brand',
    name: 'Ash Brand',
    description: 'Your first strike applies 1 burn.',
    pathId: 'Ruin',
    rarity: 'common',
    tags: ['burn']
  }
];
