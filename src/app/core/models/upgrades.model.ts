import { UpgradeDef } from '../../content/upgrades/upgrade.types';

export interface UpgradeOption {
  id: string;
  upgrade: UpgradeDef;
  disabledReason?: string;
}
