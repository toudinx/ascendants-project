import { VFX_TIMING } from "./vfx-timing.config";

export type ActionKind =
  | "normal"
  | "skill"
  | "enemy"
  | "enemySkill"
  | "dotTick"
  | "break";
export type AttackStyle = "melee" | "ranged" | "cast";

export type ActionVfxStep =
  | { t: "attackerLunge"; ms: number }
  | { t: "castCharge"; ms: number }
  | { t: "projectile"; ms: number; key?: string; scale?: number }
  | { t: "slashArc"; ms: number; scale: number }
  | { t: "impactPackage"; ms: number; tier: 1 | 2 | 3 | 4 }
  | {
      t: "afterglowField";
      ms: number;
      fieldKey: "burn" | "poison" | "bleed" | "rune";
    };

export type ActionVfxProfile = {
  kind: ActionKind;
  style: AttackStyle;
  steps: ActionVfxStep[];
  combo?: { hits: number; spacingMs: number; visualOnly: boolean };
};

export const ENABLE_VISUAL_COMBOS = true;

export const ACTION_VFX_PROFILES: ActionVfxProfile[] = [
  {
    kind: "normal",
    style: "melee",
    steps: [
      { t: "attackerLunge", ms: 120 },
      { t: "projectile", ms: 200, key: "orb", scale: 0.9 },
      { t: "slashArc", ms: 0, scale: 0.78 },
      { t: "impactPackage", ms: VFX_TIMING.normal.impactMs, tier: 1 },
      { t: "afterglowField", ms: 180, fieldKey: "rune" },
    ],
    combo: { hits: 1, spacingMs: 90, visualOnly: true },
  },
  {
    kind: "skill",
    style: "cast",
    steps: [
      { t: "castCharge", ms: VFX_TIMING.skill.anticipationMs },
      {
        t: "projectile",
        ms: VFX_TIMING.skill.travelMs,
        key: "beam",
        scale: 1.5,
      },
      { t: "impactPackage", ms: VFX_TIMING.skill.impactMs, tier: 3 },
      {
        t: "afterglowField",
        ms: VFX_TIMING.skill.afterglowMs,
        fieldKey: "rune",
      },
    ],
  },
  {
    kind: "skill",
    style: "ranged",
    steps: [
      { t: "castCharge", ms: 280 },
      { t: "projectile", ms: 240, key: "bolt", scale: 1.35 },
      { t: "impactPackage", ms: 150, tier: 3 },
      { t: "afterglowField", ms: 820, fieldKey: "burn" },
    ],
  },
  {
    kind: "enemy",
    style: "melee",
    steps: [
      { t: "attackerLunge", ms: 150 },
      { t: "slashArc", ms: 50, scale: 1.05 },
      { t: "impactPackage", ms: VFX_TIMING.normal.impactMs, tier: 2 },
      { t: "afterglowField", ms: 220, fieldKey: "bleed" },
    ],
  },
  {
    kind: "enemy",
    style: "ranged",
    steps: [
      { t: "castCharge", ms: 240 },
      { t: "projectile", ms: 220, key: "bolt" },
      { t: "impactPackage", ms: 150, tier: 2 },
      { t: "afterglowField", ms: 480, fieldKey: "bleed" },
    ],
  },
  {
    kind: "enemySkill",
    style: "cast",
    steps: [
      { t: "castCharge", ms: 340 },
      { t: "projectile", ms: 240, key: "burst", scale: 1.4 },
      { t: "impactPackage", ms: 170, tier: 3 },
      { t: "afterglowField", ms: 560, fieldKey: "bleed" },
    ],
  },
  {
    kind: "dotTick",
    style: "cast",
    steps: [
      { t: "impactPackage", ms: VFX_TIMING.dot.pulseMs, tier: 1 },
      { t: "afterglowField", ms: VFX_TIMING.dot.afterglowMs, fieldKey: "burn" },
    ],
  },
  {
    kind: "break",
    style: "melee",
    steps: [
      { t: "attackerLunge", ms: 90 },
      { t: "impactPackage", ms: VFX_TIMING.normal.impactMs, tier: 4 },
      { t: "afterglowField", ms: 520, fieldKey: "rune" },
    ],
  },
];

export function resolveActionProfile(
  kind: ActionKind,
  style: AttackStyle
): ActionVfxProfile {
  const direct = ACTION_VFX_PROFILES.find(
    (profile) => profile.kind === kind && profile.style === style
  );
  if (direct) return direct;
  const fallback = ACTION_VFX_PROFILES.find((profile) => profile.kind === kind);
  if (fallback) return fallback;
  return ACTION_VFX_PROFILES[0];
}
