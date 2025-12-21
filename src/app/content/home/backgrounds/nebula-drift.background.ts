import { HomeBackgroundDef } from "../home-background.types";

export const NEBULA_DRIFT_BACKGROUND: HomeBackgroundDef = {
  id: "nebula-drift",
  name: "Nebula Drift",
  imageUrl: "assets/battle/arena/nebula-drift.png",
  gradientOverlay:
    "radial-gradient(120% 90% at 10% 70%, rgba(92, 132, 255, 0.35), transparent 60%), radial-gradient(80% 70% at 70% 60%, rgba(255, 92, 168, 0.28), transparent 65%), linear-gradient(180deg, rgba(8, 6, 20, 0.1), rgba(6, 6, 18, 0.92))",
  particlePreset: "nebula",
  parallaxStrength: 18,
  tags: ["space", "nebula"],
};
