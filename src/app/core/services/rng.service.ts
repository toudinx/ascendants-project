import { Injectable } from "@angular/core";
import { chance, createPrng, nextInt, pick, Prng, shuffle } from "../domain/rng/prng";

export interface RngStream {
  nextFloat: () => number;
  nextInt: (min: number, max: number) => number;
  pick: <T>(values: T[]) => T | undefined;
  chance: (probability: number) => boolean;
  shuffle: <T>(values: T[]) => T[];
  random: () => number;
  int: (min: number, max: number) => number;
}

@Injectable({ providedIn: "root" })
export class RngService {
  private seed = this.seedFromClock();
  private readonly streams = new Map<string, RngStreamImpl>();

  setSeed(seed: number | string): void {
    this.seed = this.seedFromInput(seed);
    this.streams.clear();
  }

  fork(streamName: string, seedOverride?: number): RngStream {
    if (typeof seedOverride === "number") {
      return new RngStreamImpl(createPrng(seedOverride >>> 0));
    }
    const existing = this.streams.get(streamName);
    if (existing) return existing;
    const streamSeed = this.mixSeed(streamName);
    const stream = new RngStreamImpl(createPrng(streamSeed));
    this.streams.set(streamName, stream);
    return stream;
  }

  nextFloat(): number {
    return this.fork("default").nextFloat();
  }

  nextInt(min: number, max: number): number {
    return this.fork("default").nextInt(min, max);
  }

  pick<T>(values: T[]): T | undefined {
    return this.fork("default").pick(values);
  }

  chance(probability: number): boolean {
    return this.fork("default").chance(probability);
  }

  shuffle<T>(values: T[]): T[] {
    return this.fork("default").shuffle(values);
  }

  random(): number {
    return this.nextFloat();
  }

  int(min: number, max: number): number {
    return this.nextInt(min, max);
  }

  private mixSeed(streamName: string): number {
    const hash = this.hashString(streamName);
    return (this.seed ^ hash) >>> 0;
  }

  private hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private seedFromClock(): number {
    const now = Date.now() >>> 0;
    return (now ^ (now >>> 16)) >>> 0;
  }

  private seedFromInput(seed: number | string): number {
    if (typeof seed === "string") {
      return this.hashString(seed);
    }
    if (!Number.isFinite(seed)) return 0;
    return (Math.floor(seed) >>> 0) || 0;
  }
}

class RngStreamImpl implements RngStream {
  constructor(private readonly rng: Prng) {}

  nextFloat(): number {
    return this.rng();
  }

  nextInt(min: number, max: number): number {
    return nextInt(min, max, this.rng);
  }

  pick<T>(values: T[]): T | undefined {
    return pick(values, this.rng);
  }

  chance(probability: number): boolean {
    return chance(probability, this.rng);
  }

  shuffle<T>(values: T[]): T[] {
    return shuffle(values, this.rng);
  }

  random(): number {
    return this.nextFloat();
  }

  int(min: number, max: number): number {
    return this.nextInt(min, max);
  }
}
