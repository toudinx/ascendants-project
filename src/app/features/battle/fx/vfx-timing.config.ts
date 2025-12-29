export const VFX_TIMING = {
  normal: {
    anticipationMs: 120,
    impactMs: 120,
    afterglowMs: 260
  },
  skill: {
    anticipationMs: 300,
    travelMs: 220,
    impactMs: 140,
    afterglowMs: 720
  },
  dot: {
    pulseMs: 160,
    afterglowMs: 520
  },
  crit: {
    impactScale: 1.25,
    afterglowBoostMs: 140
  },
  combatText: {
    normalMs: 1800,
    critMs: 2000,
    dotMs: 2100
  }
} as const;

export const VFX_HOLD_MS = 60;
