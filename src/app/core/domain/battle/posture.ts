import { PostureOverkillTracker } from "./types";

export function createPostureOverkillTracker(
  maxPosture: number,
  startPosture: number,
  overkillCapFraction: number
): PostureOverkillTracker {
  const cap = Math.max(0, Math.round(maxPosture * overkillCapFraction));
  let remaining = Math.max(0, Math.floor(startPosture));
  let overkill = 0;

  return {
    apply: (rawDamage: number) => {
      const damage = Math.max(0, Math.round(rawDamage));
      if (damage <= 0) return 0;
      if (remaining > 0) {
        const applied = Math.min(remaining, damage);
        remaining -= applied;
        const overflow = damage - applied;
        if (overflow > 0 && overkill < cap) {
          const extra = Math.min(overflow, cap - overkill);
          overkill += extra;
          return applied + extra;
        }
        return applied;
      }
      if (overkill >= cap) return 0;
      const extra = Math.min(damage, cap - overkill);
      overkill += extra;
      return extra;
    },
    getOverkill: () => overkill
  };
}
