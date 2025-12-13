export type EvolutionVisualKey = 'ruina' | 'impacto' | 'critico';

export interface EvolutionVisual {
  key: EvolutionVisualKey;
  name: string;
  description: string;
  cssClass: string;
  icon?: string;
}

export const EVOLUTION_VISUALS: Record<EvolutionVisualKey, EvolutionVisual> = {
  ruina: {
    key: 'ruina',
    name: 'Corrosão Viva',
    description: 'Ataques deixam rastro roxo e DoT ganha fumaça persistente.',
    cssClass: 'ruina-evolved',
    icon: '☣'
  },
  impacto: {
    key: 'impacto',
    name: 'Força Irrefreável',
    description: 'Impactos reverberam com rachaduras e choque seco.',
    cssClass: 'impacto-evolved',
    icon: '✦'
  },
  critico: {
    key: 'critico',
    name: 'Ritmo Letal',
    description: 'Críticos soltam faíscas rápidas e brilho extra.',
    cssClass: 'critico-evolved',
    icon: '⚡'
  }
};

