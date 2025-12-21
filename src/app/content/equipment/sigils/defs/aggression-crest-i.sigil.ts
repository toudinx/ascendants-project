import { SigilDef } from "../sigil.types";

export const AGGRESSION_CREST_I_DEF: SigilDef = {
  id: "agressao-slot1",
  name: "Aggression Crest I",
  description: "Primary seal carrying raw attack.",
  imageUrl: "assets/battle/fx/shadow_ground.png",
  level: 75,
  slot: "slot1",
  setKey: "agressao",
  mainStat: { type: "atk_percent", value: 22 },
  subStats: [
    { type: "crit_rate_percent", value: 0.05 },
    { type: "crit_damage_percent", value: 0.1 },
    { type: "hp_flat", value: 300 },
    { type: "atk_flat", value: 30 },
  ],
};
