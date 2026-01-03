import { Injectable, inject } from '@angular/core';
import { getEchoes, getResonances, getBargains } from '../content';
import { EchoDefinition } from '../models/echo.model';
import { ResonanceDefinition } from '../models/resonance.model';
import { BargainDefinition } from '../models/bargain.model';
import { AscensionRandomService } from './ascension-random.service';
import { RngService } from '../../../core/services/rng.service';

@Injectable({ providedIn: 'root' })
export class AscensionGeneratorService {
  private readonly random = inject(AscensionRandomService);
  private readonly rng = inject(RngService);

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
    const stream = this.rng.fork('ascension-generator', seed);
    return () => stream.nextFloat();
  }
}
