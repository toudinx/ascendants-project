import { Injectable, inject } from '@angular/core';
import { getEchoes, getResonances, getBargains } from '../content';
import { EchoDefinition } from '../models/echo.model';
import { ResonanceDefinition } from '../models/resonance.model';
import { BargainDefinition } from '../models/bargain.model';
import { AscensionRandomService } from './ascension-random.service';

@Injectable({ providedIn: 'root' })
export class AscensionGeneratorService {
  private readonly random = inject(AscensionRandomService);

  getEchoDraft(count = 3, seed?: number): EchoDefinition[] {
    const pool = getEchoes();
    return this.pickRandom(pool, count, this.createRng(seed));
  }

  getResonanceCatalog(): ResonanceDefinition[] {
    return getResonances();
  }

  getBargainOptions(count = 2, seed?: number): BargainDefinition[] {
    const pool = getBargains();
    return this.pickRandom(pool, count, this.createRng(seed));
  }

  private pickRandom<T>(pool: T[], count: number, rng: () => number): T[] {
    if (!pool.length || count <= 0) return [];
    const picked: T[] = [];
    const copy = [...pool];
    while (copy.length && picked.length < count) {
      const index = Math.floor(rng() * copy.length);
      picked.push(copy.splice(index, 1)[0]);
    }
    return picked;
  }

  private createRng(seed?: number): () => number {
    if (typeof seed !== 'number' || Number.isNaN(seed)) {
      return () => this.random.nextFloat();
    }
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
