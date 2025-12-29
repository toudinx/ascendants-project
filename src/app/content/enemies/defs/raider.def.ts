import { EnemyDef } from "../enemies.types";

export const STORM_RAIDER_DEF: EnemyDef = {
  id: "storm-raider",
  name: "Storm Raider",
  kind: "normal",
  base: {
    hp: 12000,
    attack: 300,
    posture: 220,
  },
  combat: {
    defense: 380,
    critChance: 0.15,
    critDamage: 1.5,
    multiHitChance: 0.18,
    baseHitCount: 1,
    dotChance: 0.1,
  },
  abilities: {
    auto: {
      name: "Arc Slash",
      damageMultiplier: 0.95,
      postureRatio: 0.2,
    },
  },
  dot: {
    chance: 0.15,
    damage: 4,
    duration: 2,
    postureRatio: 0.04,
  },
  aiPlan: { type: "simple-auto" },
  tags: ["raider", "normal"],
};
