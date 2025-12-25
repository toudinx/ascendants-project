import { EchoDefinition } from '../../../models/echo.model';

export const WRATH_ECHOES: EchoDefinition[] = [
  {
    id: 'ember-sigil',
    name: 'Ember Sigil',
    description: 'Gain +2 echo fragments after battle clears.',
    pathId: 'Wrath',
    rarity: 'common',
    tags: ['fragments', 'starter']
  },
  {
    id: 'redline-vow',
    name: 'Redline Vow',
    description: 'Deal 6% more damage while above 70% HP.',
    pathId: 'Wrath',
    rarity: 'common',
    tags: ['damage']
  },
  {
    id: 'fury-latch',
    name: 'Fury Latch',
    description: 'First strike each battle deals 8% more damage.',
    pathId: 'Wrath',
    rarity: 'common',
    tags: ['damage']
  }
];
