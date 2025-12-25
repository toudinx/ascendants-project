export type EchoRarity = 'common' | 'rare' | 'epic';

export interface EchoDefinition {
  id: string;
  name: string;
  description: string;
  pathId: string;
  rarity: EchoRarity;
  tags?: string[];
}
