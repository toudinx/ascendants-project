export type Prng = () => number;

export function createPrng(seed: number): Prng {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextInt(min: number, max: number, rng: Prng): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  if (max <= min) return Math.floor(min);
  return Math.floor(rng() * (max - min + 1) + min);
}

export function pick<T>(values: T[], rng: Prng): T | undefined {
  if (!values.length) return undefined;
  const index = nextInt(0, values.length - 1, rng);
  return values[index];
}

export function chance(probability: number, rng: Prng): boolean {
  if (!Number.isFinite(probability) || probability <= 0) return false;
  if (probability >= 1) return true;
  return rng() < probability;
}

export function shuffle<T>(values: T[], rng: Prng): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = nextInt(0, i, rng);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
