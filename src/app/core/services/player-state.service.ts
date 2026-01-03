import { Injectable, effect, inject, signal } from '@angular/core';
import { PlayerAttributes, PlayerBuff, PlayerSigilSkillBuff, PlayerState } from '../models/player.model';
import { RunKaelisSnapshot } from '../models/kaelis.model';
import { ProfileStateService } from './profile-state.service';
import { WeaponDefinition } from '../models/weapon.model';
import { SIGIL_SETS } from '../../content/equipment/sigils';
import { SigilDefinition, SigilSetKey, SigilStat } from '../models/sigil.model';
import { BALANCE_CONFIG } from '../../content/balance/balance.config';
import { resolveBattleSpriteId, spriteIdToAssetPath } from '../../content/battle-sprites';

interface BuildAttributesResult {
  attributes: PlayerAttributes;
  sigilSetCounts: Record<SigilSetKey, number>;
  sigilSkillBuffs: PlayerSigilSkillBuff[];
}

interface SigilBuffState {
  percent: number;
  turns: number;
  source?: SigilSetKey;
}

interface AttributeAccumulator {
  hpFlat: number;
  hpPercent: number;
  atkFlat: number;
  atkPercent: number;
  critRate: number;
  critDamage: number;
  damagePercent: number;
  energyRegenPercent: number;
  damageReductionPercent: number;
  healPercent: number;
  postureDamagePercent: number;
}

export interface PlayerAttributeModifierSet {
  hpFlat?: number;
  atkFlat?: number;
  critRate?: number;
  critDamage?: number;
  damagePercent?: number;
  damageReductionPercent?: number;
  energyRegenPercent?: number;
  postureDamagePercent?: number;
}

export interface PlayerBattleStartBonuses {
  energy?: number;
  postureShield?: number;
}

@Injectable({ providedIn: 'root' })
export class PlayerStateService {
  private readonly profile = inject(ProfileStateService);
  private readonly loadoutLocked = signal(false);
  private lastKaelis?: RunKaelisSnapshot;
  private lastWeapon?: WeaponDefinition;
  private lastSigils: SigilDefinition[] = [];
  private currentModifiers: PlayerAttributeModifierSet = {};

  readonly state = signal<PlayerState>(this.buildStateFromProfile());

  constructor() {
    effect(() => {
      if (this.loadoutLocked()) {
        return;
      }
      const snapshot = this.profile.getActiveSnapshot();
      const weapon = this.profile.getEquippedWeapon(snapshot.id);
      const sigils = this.profile.getEquippedSigils(snapshot.id);
      const equippedSkinId = this.profile.getActiveSkinFor(snapshot.id);
      this.applyEquipment(snapshot, weapon, sigils, undefined, equippedSkinId);
    });
  }

  reset(): void {
    this.state.set(this.buildStateFromProfile());
  }

  lockLoadout(): void {
    this.loadoutLocked.set(true);
  }

  unlockLoadout(): void {
    this.loadoutLocked.set(false);
  }

  resetForNewRun(
    kaelis: RunKaelisSnapshot,
    weapon: WeaponDefinition,
    sigils: SigilDefinition[],
    modifiers?: PlayerAttributeModifierSet
  ): void {
    this.lastKaelis = { ...kaelis, baseStats: { ...kaelis.baseStats }, kit: { ...kaelis.kit } };
    this.lastWeapon = { ...weapon };
    this.lastSigils = sigils.map(sigil => ({
      ...sigil,
      mainStat: { ...sigil.mainStat },
      subStats: sigil.subStats.map(stat => ({ ...stat }))
    }));
    this.currentModifiers = modifiers ? { ...modifiers } : {};
    const equippedSkinId = this.profile.getActiveSkinFor(kaelis.id);
    this.state.set(
      buildPlayerState(this.lastKaelis, this.lastWeapon, this.lastSigils, this.currentModifiers, equippedSkinId)
    );
  }

  applyRunAttributeModifiers(modifiers: PlayerAttributeModifierSet): void {
    this.currentModifiers = { ...modifiers };
    if (!this.lastKaelis || !this.lastWeapon) return;
    this.applyEquipment(this.lastKaelis, this.lastWeapon, this.lastSigils, this.currentModifiers);
  }

  applyBattleStartBonuses(bonuses: PlayerBattleStartBonuses): void {
    if (!bonuses.energy && !bonuses.postureShield) return;
    this.state.update(current => {
      const attrs = current.attributes;
      const nextEnergy = bonuses.energy ? Math.min(attrs.maxEnergy, attrs.energy + bonuses.energy) : attrs.energy;
      const nextPosture =
        bonuses.postureShield && attrs.maxPosture
          ? Math.min(attrs.maxPosture, attrs.posture + bonuses.postureShield)
          : attrs.posture;
      return {
        ...current,
        attributes: {
          ...attrs,
          energy: nextEnergy,
          posture: nextPosture
        }
      };
    });
  }

  applyEquipment(
    kaelis: RunKaelisSnapshot,
    weapon: WeaponDefinition,
    sigils: SigilDefinition[],
    modifiers?: PlayerAttributeModifierSet,
    equippedSkinId?: string | null
  ): void {
    this.lastKaelis = { ...kaelis, baseStats: { ...kaelis.baseStats }, kit: { ...kaelis.kit } };
    this.lastWeapon = { ...weapon };
    this.lastSigils = sigils.map(sigil => ({
      ...sigil,
      mainStat: { ...sigil.mainStat },
      subStats: sigil.subStats.map(stat => ({ ...stat }))
    }));
    if (modifiers) {
      this.currentModifiers = { ...modifiers };
    }
    const activeSkinId = equippedSkinId ?? this.profile.getActiveSkinFor(kaelis.id);
    const battleSprite = resolveBattleSpritePath(kaelis.id, activeSkinId);
    this.state.update(current => {
      const prev = current.attributes;
      const hpRatio = prev.maxHp > 0 ? prev.hp / prev.maxHp : 1;
      const postureRatio = prev.maxPosture > 0 ? prev.posture / prev.maxPosture : 1;
      const energyRatio = prev.maxEnergy > 0 ? prev.energy / prev.maxEnergy : 1;
      const rebuilt = buildPlayerAttributes(this.lastKaelis!, this.lastWeapon!, this.lastSigils, this.currentModifiers);
      const preservedBuff = this.preserveSigilBuff(current, rebuilt.sigilSkillBuffs);

      return {
        ...current,
        attributes: {
          ...rebuilt.attributes,
          hp: Math.min(rebuilt.attributes.maxHp, Math.max(1, Math.floor(rebuilt.attributes.maxHp * hpRatio))),
          posture: Math.min(
            rebuilt.attributes.maxPosture,
            Math.max(0, Math.floor(rebuilt.attributes.maxPosture * postureRatio))
          ),
          energy: Math.min(
            rebuilt.attributes.maxEnergy,
            Math.max(0, Math.floor(rebuilt.attributes.maxEnergy * energyRatio))
          )
        },
        kaelisSprite: battleSprite,
        weaponId: this.lastWeapon!.id,
        sigilSetCounts: rebuilt.sigilSetCounts,
        sigilSkillBuffs: rebuilt.sigilSkillBuffs,
        sigilDamageBuffPercent: preservedBuff.percent,
        sigilDamageBuffTurns: preservedBuff.turns,
        sigilDamageBuffSource: preservedBuff.source
      };
    });
  }

  normalizeAfterBattle(): void {
    this.state.update(current => ({
      ...current,
      attributes: {
        ...current.attributes,
        posture: current.attributes.maxPosture
      },
      status: 'normal',
      breakTurns: 0,
      sigilDamageBuffPercent: 0,
      sigilDamageBuffTurns: 0,
      sigilDamageBuffSource: undefined
    }));
  }

  usePotion(): void {
    this.state.update(current => {
      const bonus = (current.attributes.healBonusPercent ?? 0) / 100;
      const healAmount = current.attributes.maxHp * 0.3 * (1 + bonus);
      const healedHp = Math.min(current.attributes.hp + healAmount, current.attributes.maxHp);
      return { ...current, attributes: { ...current.attributes, hp: Math.floor(healedHp) } };
    });
  }

  spendEnergy(amount: number): void {
    this.state.update(current => {
      const energy = Math.max(0, current.attributes.energy - amount);
      return { ...current, attributes: { ...current.attributes, energy } };
    });
  }

  gainEnergy(amount: number): void {
    this.state.update(current => {
      const energy = Math.min(current.attributes.maxEnergy, current.attributes.energy + amount);
      return { ...current, attributes: { ...current.attributes, energy } };
    });
  }

  canUseSkill(cost: number): boolean {
    const player = this.state();
    return player.attributes.energy >= cost && (player.skillCooldown ?? 0) <= 0 && player.status === 'normal';
  }

  activateSkill(cost: number, cooldown: number): void {
    this.state.update(current => ({
      ...current,
      attributes: { ...current.attributes, energy: Math.max(0, current.attributes.energy - cost) },
      skillCooldown: cooldown
    }));
  }

  tickSkillCooldown(): void {
    this.state.update(current => ({
      ...current,
      skillCooldown: Math.max(0, (current.skillCooldown ?? 0) - 1)
    }));
  }

  setStatus(status: PlayerState['status'], turns: number): void {
    this.state.update(current => ({
      ...current,
      status,
      breakTurns: turns
    }));
  }

  decrementBreak(): boolean {
    let endedNow = false;
    this.state.update(current => {
      const remaining = Math.max(0, (current.breakTurns ?? 0) - 1);
      const wasBroken = current.status === 'broken' || current.status === 'superbroken';
      if (wasBroken && remaining === 0) {
        endedNow = true;
        return {
          ...current,
          breakTurns: 0,
          status: 'normal',
          attributes: { ...current.attributes, posture: current.attributes.maxPosture }
        };
      }
      return { ...current, breakTurns: remaining };
    });
    return endedNow;
  }

  applyDamage(amount: number, postureDamage = 0): void {
    this.state.update(current => {
      const hp = Math.max(0, current.attributes.hp - amount);
      const posture = Math.max(0, current.attributes.posture - postureDamage);
      return { ...current, attributes: { ...current.attributes, hp, posture } };
    });
  }

  regenPosture(amount: number): void {
    this.state.update(current => {
      if (current.status === 'broken' || current.status === 'superbroken') {
        return current;
      }
      const posture = Math.min(current.attributes.maxPosture, current.attributes.posture + amount);
      return { ...current, attributes: { ...current.attributes, posture } };
    });
  }

  smallHeal(percent: number): void {
    this.state.update(current => {
      const bonus = (current.attributes.healBonusPercent ?? 0) / 100;
      const heal = current.attributes.maxHp * percent * (1 + bonus);
      const hp = Math.min(current.attributes.maxHp, current.attributes.hp + heal);
      return { ...current, attributes: { ...current.attributes, hp: Math.floor(hp) } };
    });
  }

  regenEnergyFlat(amount: number): void {
    this.state.update(current => {
      const energy = Math.min(current.attributes.maxEnergy, current.attributes.energy + amount);
      return { ...current, attributes: { ...current.attributes, energy } };
    });
  }

  activateSigilDamageBuff(source: SigilSetKey, percent: number, turns: number): 'activated' | 'refreshed' | 'none' {
    if (percent <= 0 || turns <= 0) return 'none';
    let result: 'activated' | 'refreshed' | 'none' = 'activated';
    this.state.update(current => {
      const existingPercent = current.sigilDamageBuffPercent ?? 0;
      const existingSource = current.sigilDamageBuffSource;
      if (existingPercent > 0 && existingSource === source) {
        result = 'refreshed';
      } else if (existingPercent > 0 && existingSource !== source) {
        result = 'activated';
      }
      return {
        ...current,
        sigilDamageBuffPercent: percent,
        sigilDamageBuffTurns: turns,
        sigilDamageBuffSource: source
      };
    });
    return result;
  }

  tickSigilDamageBuff(): 'expired' | 'active' | 'none' {
    let result: 'expired' | 'active' | 'none' = 'none';
    this.state.update(current => {
      const turns = current.sigilDamageBuffTurns ?? 0;
      const percent = current.sigilDamageBuffPercent ?? 0;
      if (percent <= 0 || turns <= 0) {
        return current;
      }
      if (turns - 1 <= 0) {
        result = 'expired';
        return {
          ...current,
          sigilDamageBuffPercent: 0,
          sigilDamageBuffTurns: 0,
          sigilDamageBuffSource: undefined
        };
      }
      result = 'active';
      return { ...current, sigilDamageBuffTurns: turns - 1 };
    });
    return result;
  }

  clearSigilDamageBuff(): void {
    this.state.update(current => ({
      ...current,
      sigilDamageBuffPercent: 0,
      sigilDamageBuffTurns: 0,
      sigilDamageBuffSource: undefined
    }));
  }

  getSigilDamageBuffPercent(): number {
    return this.state().sigilDamageBuffPercent ?? 0;
  }

  getSigilDamageBuffSource(): SigilSetKey | undefined {
    return this.state().sigilDamageBuffSource;
  }

  getSigilSkillBuffs(): PlayerSigilSkillBuff[] {
    return this.state().sigilSkillBuffs ?? [];
  }

  private buildStateFromProfile(): PlayerState {
    const snapshot = this.profile.getActiveSnapshot();
    const weapon = this.profile.getEquippedWeapon(snapshot.id);
    const sigils = this.profile.getEquippedSigils(snapshot.id);
    this.lastKaelis = { ...snapshot, baseStats: { ...snapshot.baseStats }, kit: { ...snapshot.kit } };
    this.lastWeapon = { ...weapon };
    this.lastSigils = sigils.map(sigil => ({
      ...sigil,
      mainStat: { ...sigil.mainStat },
      subStats: sigil.subStats.map(stat => ({ ...stat }))
    }));
    const equippedSkinId = this.profile.getActiveSkinFor(snapshot.id);
    return buildPlayerState(this.lastKaelis, this.lastWeapon, this.lastSigils, this.currentModifiers, equippedSkinId);
  }

  private preserveSigilBuff(current: PlayerState, buffs: PlayerSigilSkillBuff[]): SigilBuffState {
    const source = current.sigilDamageBuffSource;
    if (!source || !current.sigilDamageBuffPercent) {
      return { percent: 0, turns: 0 };
    }
    const stillValid = buffs.some(buff => buff.setKey === source);
    if (!stillValid) {
      return { percent: 0, turns: 0 };
    }
    return {
      percent: current.sigilDamageBuffPercent ?? 0,
      turns: current.sigilDamageBuffTurns ?? 0,
      source
    };
  }
}

function mockBuffs(): PlayerBuff[] {
  return [
    { id: 'eco', name: 'Eco Arcano', type: 'buff', icon: '*', duration: 3 },
    { id: 'veneno', name: 'Toxina Leve', type: 'debuff', icon: '!', duration: 2 }
  ];
}

function resolveBattleSpritePath(kaelisId: RunKaelisSnapshot['id'], equippedSkinId?: string | null): string {
  const spriteId = resolveBattleSpriteId(kaelisId, equippedSkinId);
  return spriteIdToAssetPath(spriteId);
}

function buildPlayerState(
  kaelis: RunKaelisSnapshot,
  weapon: WeaponDefinition,
  sigils: SigilDefinition[],
  modifiers: PlayerAttributeModifierSet = {},
  equippedSkinId?: string | null
): PlayerState {
  const result = buildPlayerAttributes(kaelis, weapon, sigils, modifiers);
  return {
    attributes: result.attributes,
    buffs: mockBuffs(),
    status: 'normal',
    breakTurns: 0,
    skillCooldown: 0,
    kaelisRoute: kaelis.routeType,
    kaelisId: kaelis.id,
    kaelisName: kaelis.name,
    kaelisSprite: resolveBattleSpritePath(kaelis.id, equippedSkinId),
    kit: { ...kaelis.kit },
    weaponId: weapon.id,
    sigilSetCounts: result.sigilSetCounts,
    sigilSkillBuffs: result.sigilSkillBuffs,
    sigilDamageBuffPercent: 0,
    sigilDamageBuffTurns: 0,
    sigilDamageBuffSource: undefined
  };
}

function buildPlayerAttributes(
  kaelis: RunKaelisSnapshot,
  weapon: WeaponDefinition,
  sigils: SigilDefinition[],
  modifiers: PlayerAttributeModifierSet = {}
): BuildAttributesResult {
  const stats = kaelis.baseStats;
  const totals = createAccumulator();

  if (weapon.flatStat.type === 'hp') {
    totals.hpFlat += weapon.flatStat.value;
  } else {
    totals.atkFlat += weapon.flatStat.value;
  }

  switch (weapon.secondaryStat.type) {
    case 'critRate':
      totals.critRate += weapon.secondaryStat.value;
      break;
    case 'critDamage':
      totals.critDamage += weapon.secondaryStat.value;
      break;
    case 'energyRegen':
      totals.energyRegenPercent += weapon.secondaryStat.value;
      break;
  }

  const sigilSetCounts: Partial<Record<SigilSetKey, number>> = {};
  sigils.forEach(sigil => {
    sigilSetCounts[sigil.setKey] = (sigilSetCounts[sigil.setKey] ?? 0) + 1;
    applySigilStat(sigil.mainStat, totals);
    sigil.subStats.forEach(stat => applySigilStat(stat, totals));
  });

  totals.hpFlat += modifiers.hpFlat ?? 0;
  totals.atkFlat += modifiers.atkFlat ?? 0;
  totals.critRate += modifiers.critRate ?? 0;
  totals.critDamage += modifiers.critDamage ?? 0;
  totals.damagePercent += modifiers.damagePercent ?? 0;
  totals.damageReductionPercent += modifiers.damageReductionPercent ?? 0;
  totals.energyRegenPercent += modifiers.energyRegenPercent ?? 0;
  totals.postureDamagePercent += modifiers.postureDamagePercent ?? 0;

  let damageBonusPercent = (stats.dmgPctBase ?? 0) + totals.damagePercent;
  const damageReductionPercentRaw = (stats.drPctBase ?? 0) + totals.damageReductionPercent;
  const cappedDamageReductionPercent = Math.min(
    BALANCE_CONFIG.damageReductionCap * 100,
    Math.max(0, damageReductionPercentRaw)
  );
  const sigilSkillBuffs: PlayerSigilSkillBuff[] = [];

  Object.values(SIGIL_SETS).forEach(set => {
    const key = set.key as SigilSetKey;
    const equipped = sigilSetCounts[key] ?? 0;
    if (set.threePieceBonus && equipped >= 3 && set.threePieceBonus.type === 'damage_percent') {
      damageBonusPercent += set.threePieceBonus.value;
    }
    if (set.fivePieceSkillBuff && equipped >= 5) {
      sigilSkillBuffs.push({
        setKey: key,
        trigger: set.fivePieceSkillBuff.trigger,
        damagePercent: set.fivePieceSkillBuff.damagePercent,
        durationTurns: set.fivePieceSkillBuff.durationTurns
      });
    }
  });

  const maxHp = Math.floor((stats.hpBase + totals.hpFlat) * (1 + totals.hpPercent / 100));
  const maxPosture = Math.floor(stats.postureBase);
  const maxEnergy = Math.floor(stats.energyBase);
  const energyStart = Math.floor(maxEnergy * 0.6);
  const attack = Math.max(1, Math.floor((stats.atkBase + totals.atkFlat) * (1 + totals.atkPercent / 100)));

  const attributes: PlayerAttributes = {
    maxHp,
    hp: maxHp,
    maxPosture,
    posture: maxPosture,
    maxEnergy,
    energy: energyStart,
    attack,
    defense: Math.floor(stats.defBase),
    critChance: stats.critRateBase + totals.critRate,
    critDamage: stats.critDmgBase + totals.critDamage,
    multiHitChance: stats.multiHitBase,
    dotChance: stats.dotChanceBase,
    penetration: stats.penetrationBase,
    energyRegenPercent: stats.energyRegenBase + totals.energyRegenPercent,
    damageBonusPercent,
    damageReductionPercent: cappedDamageReductionPercent,
    healBonusPercent: (stats.healPctBase ?? 0) + totals.healPercent,
    postureDamageBonusPercent: totals.postureDamagePercent
  };

  return {
    attributes,
    sigilSetCounts: sigilSetCounts as Record<SigilSetKey, number>,
    sigilSkillBuffs
  };
}

function createAccumulator(): AttributeAccumulator {
  return {
    hpFlat: 0,
    hpPercent: 0,
    atkFlat: 0,
    atkPercent: 0,
    critRate: 0,
    critDamage: 0,
    damagePercent: 0,
    energyRegenPercent: 0,
    damageReductionPercent: 0,
    healPercent: 0,
    postureDamagePercent: 0
  };
}

function applySigilStat(stat: SigilStat, totals: AttributeAccumulator): void {
  switch (stat.type) {
    case 'hp_flat':
      totals.hpFlat += stat.value;
      return;
    case 'atk_flat':
      totals.atkFlat += stat.value;
      return;
    case 'hp_percent':
      totals.hpPercent += stat.value;
      return;
    case 'atk_percent':
      totals.atkPercent += stat.value;
      return;
    case 'crit_rate_percent':
      totals.critRate += stat.value;
      return;
    case 'crit_damage_percent':
      totals.critDamage += stat.value;
      return;
    case 'damage_percent':
      totals.damagePercent += stat.value;
      return;
    case 'energy_regen_percent':
      totals.energyRegenPercent += stat.value;
      return;
    case 'damage_reduction_percent':
      totals.damageReductionPercent += stat.value;
      return;
    case 'heal_percent':
      totals.healPercent += stat.value;
      return;
    default:
      return;
  }
}


