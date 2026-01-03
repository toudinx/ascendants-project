export type HitActor = "player" | "enemy";

export interface AtomicHit {
  source: HitActor;
  target: HitActor;
  amount: number;
  isCrit?: boolean;
  isDot?: boolean;
  timestamp: number;
  hitIndex?: number;
  hitCount?: number;
}

export function splitAmount(total: number, count: number): number[] {
  const hits = Math.max(1, Math.floor(count));
  if (hits === 1) return [Math.max(0, Math.floor(total))];
  const safeTotal = Math.max(0, Math.floor(total));
  const base = Math.floor(safeTotal / hits);
  const remainder = safeTotal - base * hits;
  const parts = Array.from({ length: hits }, () => base);
  for (let i = 0; i < remainder; i += 1) {
    parts[i] += 1;
  }
  return parts;
}

export function expandAtomicHits(input: {
  source: HitActor;
  target: HitActor;
  amount: number;
  hitCount: number;
  isCrit?: boolean;
  isDot?: boolean;
  timestamp?: number;
}): AtomicHit[] {
  const hitCount = Math.max(1, Math.floor(input.hitCount));
  const timestamp = input.timestamp ?? Date.now();
  const parts = splitAmount(input.amount, hitCount);
  return parts.map((amount, index) => ({
    source: input.source,
    target: input.target,
    amount,
    isCrit: input.isCrit,
    isDot: input.isDot,
    timestamp,
    hitIndex: index,
    hitCount
  }));
}

export function extractHitCount(text?: string | null): number | undefined {
  if (!text) return undefined;
  const stackMatch = text.match(/\((\d+)\s*stacks?\)/i);
  if (stackMatch) {
    const parsed = Number(stackMatch[1]);
    if (Number.isFinite(parsed) && parsed > 1) return parsed;
  }
  const xPrefix = text.match(/(?:x|×)\s*(\d+)/i);
  if (xPrefix) {
    const parsed = Number(xPrefix[1]);
    if (Number.isFinite(parsed) && parsed > 1) return parsed;
  }
  const xSuffix = text.match(/(\d+)\s*(?:x|×)\b/i);
  if (xSuffix) {
    const parsed = Number(xSuffix[1]);
    if (Number.isFinite(parsed) && parsed > 1) return parsed;
  }
  return undefined;
}
