export type TrackKey = 'A' | 'B' | 'C';

export interface TrackDefinition {
  key: TrackKey;
  name: string;
  fantasy: string;
  role: string;
}

export interface TrackProgress {
  track: TrackKey;
  title: string;
  level: number;
  emphasis: string;
}
