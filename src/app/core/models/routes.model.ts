export type RouteKey = 'A' | 'B' | 'C';

export interface RouteDefinition {
  key: RouteKey;
  name: string;
  fantasy: string;
  role: string;
}

export interface RouteProgress {
  route: RouteKey;
  title: string;
  level: number;
  emphasis: string;
}
