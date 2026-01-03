import { KAELIS_DEFS, KAELIS_CATALOG } from "../kaelis";
import { ENEMY_DEFS } from "../enemies";
import { SIGIL_LIST, SIGIL_SETS } from "../equipment/sigils";
import { SKIN_LIST } from "../equipment/skins";
import { WEAPON_LIST } from "../equipment/weapons";
import {
  DEFAULT_HOME_BACKGROUND_ID,
  DEFAULT_HOME_KAELIS_ID,
  HOME_BACKGROUNDS,
  HOME_KAELIS
} from "../home";
import { SIGIL_SLOTS } from "../../core/models/sigil.model";
import { validateKaelisDef } from "./kaelis.validator";
import { validateEnemyDef } from "./enemy.validator";
import { validateBattleSpriteMapping } from "./battle-sprite.validator";
import { validateBalanceConfig } from "./balance.validator";
import { ValidationReport } from "./types";

const SIGIL_STAT_TYPES = new Set([
  "hp_flat",
  "atk_flat",
  "hp_percent",
  "atk_percent",
  "crit_rate_percent",
  "crit_damage_percent",
  "damage_percent",
  "energy_regen_percent",
  "damage_reduction_percent",
  "heal_percent"
]);

const WEAPON_FLAT_TYPES = new Set(["atk", "hp"]);
const WEAPON_SECONDARY_TYPES = new Set(["critRate", "critDamage", "energyRegen"]);
const SKIN_RARITIES = new Set(["R", "SR", "SSR"]);

export function validateCatalogs(): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  validateKaelisCatalog(errors, warnings);
  validateEnemyCatalog(errors, warnings);
  validateSigilCatalog(errors);
  validateSkinCatalog(errors);
  validateWeaponCatalog(errors);
  validateHomeCatalog(errors);
  mergeReport(errors, warnings, "Balance", validateBalanceConfig());
  mergeReport(errors, warnings, "Battle sprites", validateBattleSpriteMapping());

  return { errors, warnings };
}

function validateKaelisCatalog(errors: string[], warnings: string[]): void {
  const seen = new Set<string>();
  KAELIS_DEFS.forEach(def => {
    if (seen.has(def.id)) {
      errors.push(`Kaelis id "${def.id}" appears multiple times.`);
    }
    seen.add(def.id);
    const report = validateKaelisDef(def);
    report.errors.forEach(msg => errors.push(`Kaelis "${def.id}": ${msg}`));
    report.warnings.forEach(msg => warnings.push(`Kaelis "${def.id}": ${msg}`));
    if (!def.portrait?.trim()) {
      errors.push(`Kaelis "${def.id}" is missing a portrait asset.`);
    }
    if (!def.sprite?.trim()) {
      errors.push(`Kaelis "${def.id}" is missing a sprite asset.`);
    }
    if (!def.imageUrl?.trim()) {
      errors.push(`Kaelis "${def.id}" is missing an imageUrl.`);
    }
    if (!def.defaultBattleSpriteId?.trim()) {
      warnings.push(`Kaelis "${def.id}" is missing defaultBattleSpriteId.`);
    }
  });
}

function validateEnemyCatalog(errors: string[], warnings: string[]): void {
  const seen = new Set<string>();
  ENEMY_DEFS.forEach(def => {
    if (seen.has(def.id)) {
      errors.push(`Enemy id "${def.id}" appears multiple times.`);
    }
    seen.add(def.id);
    const report = validateEnemyDef(def);
    report.errors.forEach(msg => errors.push(`Enemy "${def.id}": ${msg}`));
    report.warnings.forEach(msg => warnings.push(`Enemy "${def.id}": ${msg}`));
  });
}

function validateSigilCatalog(errors: string[]): void {
  const seen = new Set<string>();
  SIGIL_LIST.forEach(def => {
    if (seen.has(def.id)) {
      errors.push(`Sigil id "${def.id}" appears multiple times.`);
    }
    seen.add(def.id);
    if (!def.name?.trim()) {
      errors.push(`Sigil "${def.id}" is missing a name.`);
    }
    if (!def.imageUrl?.trim()) {
      errors.push(`Sigil "${def.id}" is missing an imageUrl.`);
    }
    if (!SIGIL_SLOTS.includes(def.slot)) {
      errors.push(`Sigil "${def.id}" has invalid slot "${def.slot}".`);
    }
    if (!SIGIL_SETS[def.setKey]) {
      errors.push(`Sigil "${def.id}" references unknown setKey "${def.setKey}".`);
    }
    if (!isValidSigilStat(def.mainStat)) {
      errors.push(`Sigil "${def.id}" has invalid mainStat.`);
    }
    def.subStats.forEach((stat, index) => {
      if (!isValidSigilStat(stat)) {
        errors.push(`Sigil "${def.id}" has invalid subStat at index ${index}.`);
      }
    });
    if (!Number.isFinite(def.level) || def.level <= 0) {
      errors.push(`Sigil "${def.id}" has invalid level "${def.level}".`);
    }
  });

  Object.entries(SIGIL_SETS).forEach(([key, setDef]) => {
    if (setDef.key !== key) {
      errors.push(`Sigil set "${key}" has mismatched key "${setDef.key}".`);
    }
    if (setDef.threePieceBonus && setDef.threePieceBonus.value <= 0) {
      errors.push(`Sigil set "${key}" threePieceBonus value must be > 0.`);
    }
    if (setDef.fivePieceSkillBuff) {
      if (setDef.fivePieceSkillBuff.damagePercent <= 0) {
        errors.push(`Sigil set "${key}" fivePieceSkillBuff damagePercent must be > 0.`);
      }
      if (setDef.fivePieceSkillBuff.durationTurns <= 0) {
        errors.push(`Sigil set "${key}" fivePieceSkillBuff durationTurns must be > 0.`);
      }
    }
  });
}

function validateSkinCatalog(errors: string[]): void {
  const seen = new Set<string>();
  SKIN_LIST.forEach(def => {
    if (seen.has(def.id)) {
      errors.push(`Skin id "${def.id}" appears multiple times.`);
    }
    seen.add(def.id);
    if (!def.imageUrl?.trim()) {
      errors.push(`Skin "${def.id}" is missing an imageUrl.`);
    }
    if (!KAELIS_CATALOG[def.kaelisId]) {
      errors.push(`Skin "${def.id}" references unknown kaelisId "${def.kaelisId}".`);
    }
    if (!SKIN_RARITIES.has(def.rarity)) {
      errors.push(`Skin "${def.id}" has invalid rarity "${def.rarity}".`);
    }
    if (def.battleSpriteId !== undefined && !def.battleSpriteId.trim()) {
      errors.push(`Skin "${def.id}" has an empty battleSpriteId.`);
    }
  });
}

function validateWeaponCatalog(errors: string[]): void {
  const seen = new Set<string>();
  WEAPON_LIST.forEach(def => {
    if (seen.has(def.id)) {
      errors.push(`Weapon id "${def.id}" appears multiple times.`);
    }
    seen.add(def.id);
    if (!def.imageUrl?.trim()) {
      errors.push(`Weapon "${def.id}" is missing an imageUrl.`);
    }
    if (!def.name?.trim()) {
      errors.push(`Weapon "${def.id}" is missing a name.`);
    }
    if (!def.description?.trim()) {
      errors.push(`Weapon "${def.id}" is missing a description.`);
    }
    if (!WEAPON_FLAT_TYPES.has(def.flatStat.type)) {
      errors.push(`Weapon "${def.id}" has invalid flatStat type "${def.flatStat.type}".`);
    }
    if (!WEAPON_SECONDARY_TYPES.has(def.secondaryStat.type)) {
      errors.push(`Weapon "${def.id}" has invalid secondaryStat type "${def.secondaryStat.type}".`);
    }
    if (!Number.isFinite(def.flatStat.value) || def.flatStat.value <= 0) {
      errors.push(`Weapon "${def.id}" flatStat value must be > 0.`);
    }
    if (!Number.isFinite(def.secondaryStat.value) || def.secondaryStat.value <= 0) {
      errors.push(`Weapon "${def.id}" secondaryStat value must be > 0.`);
    }
  });
}

function validateHomeCatalog(errors: string[]): void {
  const backgroundIds = new Set<string>();
  Object.values(HOME_BACKGROUNDS).forEach(def => {
    if (backgroundIds.has(def.id)) {
      errors.push(`Home background id "${def.id}" appears multiple times.`);
    }
    backgroundIds.add(def.id);
    if (!def.imageUrl?.trim()) {
      errors.push(`Home background "${def.id}" is missing an imageUrl.`);
    }
  });
  if (!HOME_BACKGROUNDS[DEFAULT_HOME_BACKGROUND_ID]) {
    errors.push(`Default home background "${DEFAULT_HOME_BACKGROUND_ID}" is missing.`);
  }

  const kaelisIds = new Set<string>();
  Object.values(HOME_KAELIS).forEach(def => {
    if (kaelisIds.has(def.id)) {
      errors.push(`Home Kaelis id "${def.id}" appears multiple times.`);
    }
    kaelisIds.add(def.id);
    if (!def.name?.trim()) {
      errors.push(`Home Kaelis "${def.id}" is missing a name.`);
    }
    if (!def.imageUrl?.trim()) {
      errors.push(`Home Kaelis "${def.id}" is missing an imageUrl.`);
    }
    if (def.kaelisId && !KAELIS_CATALOG[def.kaelisId]) {
      errors.push(`Home Kaelis "${def.id}" references unknown kaelisId "${def.kaelisId}".`);
    }
    if (def.scale !== undefined && def.scale <= 0) {
      errors.push(`Home Kaelis "${def.id}" scale must be > 0.`);
    }
  });
  if (!HOME_KAELIS[DEFAULT_HOME_KAELIS_ID]) {
    errors.push(`Default home Kaelis "${DEFAULT_HOME_KAELIS_ID}" is missing.`);
  }
}

function isValidSigilStat(stat: { type: string; value: number } | undefined): boolean {
  if (!stat) return false;
  if (!SIGIL_STAT_TYPES.has(stat.type)) return false;
  if (!Number.isFinite(stat.value) || stat.value <= 0) return false;
  return true;
}

function mergeReport(
  errors: string[],
  warnings: string[],
  label: string,
  report: ValidationReport
): void {
  report.errors.forEach(msg => errors.push(`${label}: ${msg}`));
  report.warnings.forEach(msg => warnings.push(`${label}: ${msg}`));
}
