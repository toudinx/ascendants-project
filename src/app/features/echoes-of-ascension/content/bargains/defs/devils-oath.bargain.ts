import { BargainDefinition } from '../../../models/bargain.model';

export const DEVILS_OATH_BARGAIN: BargainDefinition = {
  id: 'devils-oath',
  name: 'Devil\'s Oath',
  description: 'Take a wound now to gain a stronger echo later.',
  tier: 'major',
  cost: 15,
  effectText: '+1 premium echo draft next floor.'
};
