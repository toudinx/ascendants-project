import { HomeBackgroundDef } from "./home-background.types";
import { HomeKaelisDef } from "./home-kaelis.types";
import { VOID_VEIL_BACKGROUND } from "./backgrounds/void-veil.background";
import { NEBULA_DRIFT_BACKGROUND } from "./backgrounds/nebula-drift.background";
import { VELVET_HOME } from "./kaelis/velvet.home";
import { VELVET_HEROIC_HOME } from "./kaelis/velvet-heroic.home";

const RAW_BACKGROUNDS: HomeBackgroundDef[] = [
  VOID_VEIL_BACKGROUND,
  NEBULA_DRIFT_BACKGROUND,
];

const RAW_KAELIS: HomeKaelisDef[] = [VELVET_HOME, VELVET_HEROIC_HOME];

export const HOME_BACKGROUNDS: Record<string, HomeBackgroundDef> =
  RAW_BACKGROUNDS.reduce<Record<string, HomeBackgroundDef>>((acc, def) => {
    acc[def.id] = def;
    return acc;
  }, {});

export const HOME_KAELIS: Record<string, HomeKaelisDef> = RAW_KAELIS.reduce<
  Record<string, HomeKaelisDef>
>((acc, def) => {
  acc[def.id] = def;
  return acc;
}, {});

export const DEFAULT_HOME_BACKGROUND_ID = RAW_BACKGROUNDS[0]?.id ?? "void-veil";
export const DEFAULT_HOME_KAELIS_ID = RAW_KAELIS[0]?.id ?? "velvet-quiet";

export function getHomeBackgrounds(): HomeBackgroundDef[] {
  return Object.values(HOME_BACKGROUNDS);
}

export function getHomeKaelisOptions(): HomeKaelisDef[] {
  return Object.values(HOME_KAELIS);
}

export function getDefaultHomeScene(): {
  backgroundId: string;
  kaelisId: string;
} {
  return {
    backgroundId: DEFAULT_HOME_BACKGROUND_ID,
    kaelisId: DEFAULT_HOME_KAELIS_ID,
  };
}

export * from "./home-background.types";
export * from "./home-kaelis.types";
