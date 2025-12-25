import { EchoDefinition } from './echo.model';

export interface AscensionEchoDraftOption {
  kind: 'echo';
  id: string;
  echo: EchoDefinition;
}

export interface AscensionRestDraftOption {
  kind: 'rest';
  id: string;
  name: string;
  description: string;
  tag: 'REST';
}

export type AscensionDraftOption =
  | AscensionEchoDraftOption
  | AscensionRestDraftOption;
