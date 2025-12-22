import { KaelisDef } from "../kaelis.types";

export const LUMEN_DEF: KaelisDef = {
  id: "lumen",
  name: "Lumen Cerys",
  title: "Resonant Weaver",
  description: "Ruin Kaelis who amplifies DoT pressure and attrition tempo.",
  routeType: "Ruin",
  portrait: "assets/battle/characters/lumen/lumen_skin_default.png",
  sprite: "assets/battle/characters/lumen/lumen_skin_default.png",
  defaultBattleSpriteId: "lumen_skin_default",
  imageUrl: "assets/battle/characters/lumen/lumen_skin_default.png",
  role: "Status amplifier",
  tags: ["dot", "tempo"],
  profile: {
    level: 64,
    xpCurrent: 5320,
    xpMax: 9000,
    affinity: 5,
  },
  base: {
    hp: 9000,
    atk: 880,
    posture: 240,
    energy: 120,
    defense: 290,
    critRate: 0.28,
    critDamage: 1.7,
    damagePercent: 16,
    damageReductionPercent: 4,
    healPercent: 5,
    multiHitChance: 0.24,
    dotChance: 0.34,
    penetration: 0.18,
    energyRegenPercent: 125,
  },
  kit: {
    autoMultiplier: 0.85,
    skillMultiplier: 1.85,
    skillHits: 2,
    skillCooldownTurns: 3,
    skillEnergyCost: 45,
    dotStacksPerSkill: 1,
    tags: ["ruin", "dot-booster"],
  },
};


