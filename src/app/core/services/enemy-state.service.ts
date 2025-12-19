import { Injectable, signal } from '@angular/core';
import { Enemy, EnemyState } from '../models/enemy.model';

const createPlaceholderEnemy = (name = 'Construct'): Enemy => ({
  attributes: {
    name,
    maxHp: 1,
    hp: 1,
    maxPosture: 1,
    posture: 1,
    attack: 1,
    defense: 1,
    critChance: 0.05,
    critDamage: 1.5,
    multiHitChance: 0,
    dotChance: 0,
    strongAttackReady: false
  },
  state: 'normal',
  breakTurns: 0
});

@Injectable({ providedIn: 'root' })
export class EnemyStateService {
  readonly enemy = signal<Enemy>(createPlaceholderEnemy());

  reset(name?: string): void {
    this.enemy.set(createPlaceholderEnemy(name));
  }

  spawnEncounter(enemy: Enemy): void {
    this.enemy.set({
      ...enemy,
      attributes: { ...enemy.attributes }
    });
  }

  prepareStrongAttack(): void {
    this.enemy.update(e => ({
      ...e,
      attributes: { ...e.attributes, strongAttackReady: true },
      state: 'preparing'
    }));
  }

  resolveStrongAttack(): void {
    this.enemy.update(e => ({
      ...e,
      attributes: { ...e.attributes, strongAttackReady: false },
      state: 'normal'
    }));
  }

  applyDamage(amount: number, postureDamage = 0): void {
    this.enemy.update(e => {
      const hp = Math.max(0, e.attributes.hp - amount);
      const posture = Math.max(0, e.attributes.posture - postureDamage);
      const nextState = posture === 0 && e.state !== 'superbroken' ? 'broken' : e.state;
      return {
        ...e,
        attributes: { ...e.attributes, hp, posture },
        state: hp <= 0 ? 'dead' : nextState
      };
    });
  }

  setBreak(state: EnemyState, turns: number): void {
    this.enemy.update(e => ({
      ...e,
      state,
      breakTurns: turns,
      attributes: { ...e.attributes, posture: 0 }
    }));
  }

  decrementBreak(): boolean {
    let endedNow = false;
    this.enemy.update(e => {
      const remaining = Math.max(0, (e.breakTurns ?? 0) - 1);
      const wasBroken = e.state === 'broken' || e.state === 'superbroken';
      if (wasBroken && remaining === 0) {
        endedNow = true;
        return {
          ...e,
          breakTurns: 0,
          state: 'normal',
          attributes: { ...e.attributes, posture: e.attributes.maxPosture }
        };
      }
      return { ...e, breakTurns: remaining };
    });
    return endedNow;
  }

  regenPosture(amount: number): void {
    this.enemy.update(e => {
      if (e.state === 'broken' || e.state === 'superbroken') {
        return e;
      }
      const posture = Math.min(e.attributes.maxPosture, e.attributes.posture + amount);
      return { ...e, attributes: { ...e.attributes, posture } };
    });
  }

  forceKill(): void {
    this.enemy.update(e => ({
      ...e,
      attributes: { ...e.attributes, hp: 0 },
      state: 'dead'
    }));
  }
}
