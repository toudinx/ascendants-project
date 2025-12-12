import { Injectable, signal } from '@angular/core';
import { PlayerAttributes, PlayerBuff, PlayerState } from '../models/player.model';

const baseAttributes: PlayerAttributes = {
  maxHp: 1200,
  hp: 1200,
  maxPosture: 180,
  posture: 180,
  maxEnergy: 100,
  energy: 60,
  attack: 140,
  defense: 45,
  critChance: 0.18,
  critDamage: 1.7,
  multiHitChance: 0.32,
  dotChance: 0.22,
  penetration: 0.25
};

@Injectable({ providedIn: 'root' })
export class PlayerStateService {
  readonly state = signal<PlayerState>({
    attributes: { ...baseAttributes },
    buffs: mockBuffs(),
    status: 'normal',
    breakTurns: 0,
    skillCooldown: 0
  });

  reset(): void {
    this.state.set({
      attributes: { ...baseAttributes },
      buffs: mockBuffs(),
      status: 'normal',
      breakTurns: 0,
      skillCooldown: 0
    });
  }

  resetForNewRun(): void {
    this.reset();
  }

  normalizeAfterBattle(): void {
    this.state.update(current => ({
      ...current,
      attributes: {
        ...current.attributes,
        posture: current.attributes.maxPosture
      },
      status: 'normal',
      breakTurns: 0
    }));
  }

  usePotion(): void {
    this.state.update(current => {
      const healedHp = Math.min(current.attributes.hp + current.attributes.maxHp * 0.3, current.attributes.maxHp);
      return { ...current, attributes: { ...current.attributes, hp: Math.round(healedHp) } };
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

  activateSkill(cost: number): void {
    this.state.update(current => ({
      ...current,
      attributes: { ...current.attributes, energy: Math.max(0, current.attributes.energy - cost) },
      skillCooldown: 3
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

  decrementBreak(): void {
    this.state.update(current => {
      const remaining = Math.max(0, (current.breakTurns ?? 0) - 1);
      const status = remaining === 0 ? 'normal' : current.status;
      return { ...current, breakTurns: remaining, status };
    });
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
      const posture = Math.min(current.attributes.maxPosture, current.attributes.posture + amount);
      return { ...current, attributes: { ...current.attributes, posture } };
    });
  }

  smallHeal(percent: number): void {
    this.state.update(current => {
      const heal = current.attributes.maxHp * percent;
      const hp = Math.min(current.attributes.maxHp, current.attributes.hp + heal);
      return { ...current, attributes: { ...current.attributes, hp } };
    });
  }

  regenEnergyFlat(amount: number): void {
    this.state.update(current => {
      const energy = Math.min(current.attributes.maxEnergy, current.attributes.energy + amount);
      return { ...current, attributes: { ...current.attributes, energy } };
    });
  }
}

function mockBuffs(): PlayerBuff[] {
  return [
    { id: 'eco', name: 'Eco Arcano', type: 'buff', icon: '✦', duration: 3 },
    { id: 'veneno', name: 'Toxina Leve', type: 'debuff', icon: '☣', duration: 2 }
  ];
}
