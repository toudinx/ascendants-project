export type HomeKaelisPose = 'idle' | 'crossed-arms' | 'combat';

export interface HomeKaelisDef {
  id: string;
  kaelisId?: string;
  name: string;
  imageUrl: string;
  pose?: HomeKaelisPose;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  subtleIdleAnimation?: boolean;
  tags?: string[];
}
