import { Injectable, signal } from '@angular/core';
import { Enemy, EnemyAttributes, EnemyState } from '../models/enemy.model';

const baseEnemy: EnemyAttributes = {
  name: 'Construct E01',
  maxHp: 950,
  hp: 950,
  maxPosture: 140,
  posture: 140,
  attack: 90,
  defense: 30,
  critChance: 0.1,
  critDamage: 1.5,
  multiHitChance: 0.2,
  dotChance: 0.15,
  strongAttackReady: false
};

@Injectable({ providedIn: 'root' })
export class EnemyStateService {
  readonly enemy = signal<Enemy>({
    attributes: { ...baseEnemy },
    state: 'normal',
    breakTurns: 0
  });

  reset(name?: string): void {
    this.enemy.set({
      attributes: { ...baseEnemy, name: name ?? baseEnemy.name },
      state: 'normal',
      breakTurns: 0
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

  decrementBreak(): void {
    this.enemy.update(e => {
      const remaining = Math.max(0, (e.breakTurns ?? 0) - 1);
      const state = remaining === 0 && e.state !== 'preparing' ? 'normal' : e.state;
      return { ...e, breakTurns: remaining, state };
    });
  }

  regenPosture(amount: number): void {
    this.enemy.update(e => {
      const posture = Math.min(e.attributes.maxPosture, e.attributes.posture + amount);
      return { ...e, attributes: { ...e.attributes, posture } };
    });
  }

  spawnForRoom(roomNumber: number, roomType: 'normal' | 'mini-boss' | 'boss'): void {
    const hpBase = 200;
    const atkBase = 30;
    const postureBase = 100;
    const scale = 1 + roomNumber * 0.15;
    const typeMult = roomType === 'boss' ? 2 : roomType === 'mini-boss' ? 1.5 : 1;
    const hp = Math.round(hpBase * scale * typeMult);
    const atk = Math.round(atkBase * scale * typeMult);
    const post = Math.round(postureBase * scale * typeMult);

    this.enemy.set({
      attributes: {
        ...baseEnemy,
        name: roomType === 'boss' ? 'Ascendant Boss' : roomType === 'mini-boss' ? 'Mini-boss' : 'Construct E01',
        maxHp: hp,
        hp,
        maxPosture: post,
        posture: post,
        attack: atk,
        strongAttackReady: false
      },
      state: 'normal',
      breakTurns: 0,
      phase: roomType
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
