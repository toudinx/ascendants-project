import { EchoDefinition } from '../../../models/echo.model';

export const SENTINEL_ECHOES: EchoDefinition[] = [
  {
    id: 'aegis-lattice',
    name: 'Aegis Lattice',
    description: 'Gain 4 shield at battle start.',
    pathId: 'Sentinel',
    rarity: 'common',
    tags: ['defense', 'shield']
  },
  {
    id: 'vigil-ward',
    name: 'Vigil Ward',
    description: 'First hit each battle deals 15% less damage.',
    pathId: 'Sentinel',
    rarity: 'common',
    tags: ['defense']
  },
  {
    id: 'bulwark-step',
    name: 'Bulwark Step',
    description: 'Gain 2 shield after taking damage.',
    pathId: 'Sentinel',
    rarity: 'common',
    tags: ['defense', 'shield']
  }
];
