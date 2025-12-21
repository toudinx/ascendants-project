import { CommonModule } from "@angular/common";
import { Component, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  AppPanelComponent,
  AppButtonComponent,
  AppTagComponent,
} from "../../../shared/components";
import { KaelisRouteType } from "../../../core/models/kaelis-route.model";
import { KaelisDef } from "../../../content/kaelis/kaelis.types";
import {
  EnemyDef,
  EnemyKind,
  EnemyAiPlan,
} from "../../../content/enemies/enemies.types";
import {
  KAELIS_CATALOG,
  KAELIS_DEFS,
  KAELIS_LIST,
  mapDefinitionToContent,
} from "../../../content/kaelis";
import { ENEMY_CATALOG, ENEMY_DEFS } from "../../../content/enemies";
import {
  computeKaelisScores,
  validateEnemyDef,
  validateKaelisDef,
  WithScoresReport,
} from "../../../content/validators";
import { BALANCE_CONFIG } from "../../../content/balance/balance.config";
import { KaelisDefinition } from "../../../core/models/kaelis.model";

type WorkshopTab = "kaelis" | "enemy" | "validate";

interface KaelisFormState {
  id: string;
  name: string;
  routeType: KaelisRouteType;
  hp: number;
  atk: number;
  autoMultiplier: number;
  skillMultiplier: number;
  skillCooldownTurns: number;
  skillEnergyCost: number;
  includeMultihit: boolean;
  multihitCount: number;
  multihitMultiplier: number;
  includeDot: boolean;
  dotDuration: number;
  dotStacks: number;
  dotTickMultiplier: number;
}

type EnemyPlanOption = "simple" | "elite" | "boss";

interface EnemyFormState {
  id: string;
  name: string;
  kind: EnemyKind;
  hp: number;
  attack: number;
  posture: number;
  includeHeavy: boolean;
  heavyTelegraph: number;
  heavyMultiplier: number;
  includeDot: boolean;
  dotChance: number;
  dotDamage: number;
  dotDuration: number;
  dotPostureRatio: number;
  aiPlan: EnemyPlanOption;
}

@Component({
  selector: "app-content-workshop-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppPanelComponent,
    AppButtonComponent,
    AppTagComponent,
  ],
  templateUrl: "./content-workshop.page.html",
  styleUrls: ["./content-workshop.page.scss"],
})
export class ContentWorkshopPageComponent {
  protected readonly tabs: { key: WorkshopTab; label: string }[] = [
    { key: "kaelis", label: "New Kaelis" },
    { key: "enemy", label: "New Enemy" },
    { key: "validate", label: "Validate Catalog" },
  ];
  protected readonly activeTab = signal<WorkshopTab>("kaelis");
  protected readonly routeTypeOptions: KaelisRouteType[] = [
    "Sentinel",
    "Ruin",
    "Resonance",
    "Fortune",
    "Colossus",
    "Wrath",
  ];
  protected readonly enemyKindOptions: EnemyKind[] = [
    "normal",
    "elite",
    "boss",
  ];
  protected readonly enemyPlanOptions: {
    key: EnemyPlanOption;
    label: string;
    description: string;
  }[] = [
    {
      key: "simple",
      label: "Simple Auto",
      description: "Always uses auto unless broken.",
    },
    {
      key: "elite",
      label: "Elite (One Strong Hit)",
      description:
        "Charges one heavy strike per fight, then resumes auto pattern.",
    },
    {
      key: "boss",
      label: "Boss Cycle (4 turns)",
      description: "Charge -> slam -> auto -> auto repeating cycle.",
    },
  ];

  private readonly kaelisIdSet = new Set(Object.keys(KAELIS_CATALOG));
  private readonly enemyIdSet = new Set(Object.keys(ENEMY_CATALOG));

  protected readonly kaelisForm = signal<KaelisFormState>({
    id: "new-kaelis",
    name: "New Kaelis",
    routeType: "Sentinel",
    hp: 9500,
    atk: 900,
    autoMultiplier: 0.9,
    skillMultiplier: 1.6,
    skillCooldownTurns: 3,
    skillEnergyCost: 40,
    includeMultihit: false,
    multihitCount: 2,
    multihitMultiplier: 0.4,
    includeDot: false,
    dotDuration: 2,
    dotStacks: 1,
    dotTickMultiplier: 0.2,
  });

  protected readonly enemyForm = signal<EnemyFormState>({
    id: "new-enemy",
    name: "Prototype",
    kind: "normal",
    hp: 12000,
    attack: 300,
    posture: 220,
    includeHeavy: false,
    heavyTelegraph: 1,
    heavyMultiplier: 1.5,
    includeDot: false,
    dotChance: 0.15,
    dotDamage: 5,
    dotDuration: 2,
    dotPostureRatio: 0.05,
    aiPlan: "simple",
  });

  protected readonly kaelisDef = computed<KaelisDef>(() =>
    this.buildKaelisDef(this.kaelisForm())
  );
  protected readonly enemyDef = computed<EnemyDef>(() =>
    this.buildEnemyDef(this.enemyForm())
  );

  protected readonly kaelisValidation = computed(() =>
    validateKaelisDef(this.kaelisDef(), { existingIds: this.kaelisIdSet })
  );
  protected readonly enemyValidation = computed(() =>
    validateEnemyDef(this.enemyDef(), { existingIds: this.enemyIdSet })
  );

  protected readonly kaelisSnippet = computed(() =>
    generateKaelisSnippet(this.kaelisDef())
  );
  protected readonly enemySnippet = computed(() =>
    generateEnemySnippet(this.enemyDef())
  );

  protected readonly kaelisCatalogResults = computed(() =>
    this.buildKaelisCatalogResults()
  );
  protected readonly enemyCatalogResults = computed(() =>
    this.buildEnemyCatalogResults()
  );

  protected readonly kaelisPowerTable = computed(() =>
    KAELIS_LIST.map((def) => ({
      name: def.name,
      id: def.id,
      ...computeKaelisScores(mapDefinitionToContent(def)),
    }))
  );

  protected readonly catalogFilter = signal<"all" | "errors" | "warnings">(
    "all"
  );
  protected readonly kaelisCatalogTotals = computed(() => {
    const results = this.kaelisCatalogResults();
    return {
      total: results.length,
      errors: results.reduce((sum, entry) => sum + entry.errors.length, 0),
      warnings: results.reduce((sum, entry) => sum + entry.warnings.length, 0),
    };
  });
  protected readonly enemyCatalogTotals = computed(() => {
    const results = this.enemyCatalogResults();
    return {
      total: results.length,
      errors: results.reduce((sum, entry) => sum + entry.errors.length, 0),
      warnings: results.reduce((sum, entry) => sum + entry.warnings.length, 0),
    };
  });

  setActiveTab(tab: WorkshopTab): void {
    this.activeTab.set(tab);
  }

  updateKaelisField<K extends keyof KaelisFormState>(
    key: K,
    value: KaelisFormState[K]
  ): void {
    this.kaelisForm.update((form) => ({ ...form, [key]: value }));
  }

  updateEnemyField<K extends keyof EnemyFormState>(
    key: K,
    value: EnemyFormState[K]
  ): void {
    this.enemyForm.update((form) => ({ ...form, [key]: value }));
  }

  copyToClipboard(value: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  protected filteredKaelisCatalog() {
    const filter = this.catalogFilter();
    return this.kaelisCatalogResults().filter((entry) => {
      if (filter === "errors") {
        return entry.errors.length > 0;
      }
      if (filter === "warnings") {
        return entry.warnings.length > 0 && entry.errors.length === 0;
      }
      return true;
    });
  }

  protected filteredEnemyCatalog() {
    const filter = this.catalogFilter();
    return this.enemyCatalogResults().filter((entry) => {
      if (filter === "errors") {
        return entry.errors.length > 0;
      }
      if (filter === "warnings") {
        return entry.warnings.length > 0 && entry.errors.length === 0;
      }
      return true;
    });
  }

  protected enemyPlanDescription(key: EnemyPlanOption): string {
    return (
      this.enemyPlanOptions.find((option) => option.key === key)?.description ??
      "Select an AI behavior template."
    );
  }

  private buildKaelisDef(form: KaelisFormState): KaelisDef {
    const basePosture = Math.max(120, Math.floor(form.hp * 0.2));
    const defaults = BALANCE_CONFIG.playerDefaults;
    const kit: KaelisDef["kit"] = {
      autoMultiplier: form.autoMultiplier,
      skillMultiplier: form.skillMultiplier,
      skillCooldownTurns: form.skillCooldownTurns,
      skillEnergyCost: form.skillEnergyCost,
      multihit: form.includeMultihit
        ? {
            count: form.multihitCount,
            perHitMultiplier: form.multihitMultiplier,
          }
        : undefined,
      dot: form.includeDot
        ? {
            durationTurns: form.dotDuration,
            stacksPerUse: form.dotStacks,
            tickMultiplier: form.dotTickMultiplier,
          }
        : undefined,
    };

    return {
      id: form.id,
      name: form.name,
      title: "Prototype",
      description: "Generated via Content Workshop.",
      routeType: form.routeType,
      portrait: "assets/battle/characters/placeholder.png",
      sprite: "assets/battle/characters/placeholder.png",
      imageUrl: "assets/battle/characters/placeholder.png",
      role: "Custom",
      profile: {
        level: 1,
        xpCurrent: 0,
        xpMax: 100,
        affinity: 1,
      },
      base: {
        hp: form.hp,
        atk: form.atk,
        posture: basePosture,
        energy: 110,
        defense: 320,
        critRate: 0.2,
        critDamage: 1.7,
        damagePercent: 12,
        damageReductionPercent: defaults.damageReductionPercent,
        healPercent: defaults.healPercent,
        multiHitChance: 0.25,
        dotChance: 0.2,
        penetration: 0.2,
        energyRegenPercent: defaults.energyRegenPercent,
      },
      kit,
    };
  }

  private buildEnemyDef(form: EnemyFormState): EnemyDef {
    const aiPlan: EnemyAiPlan =
      form.aiPlan === "simple"
        ? { type: "simple-auto" }
        : form.aiPlan === "elite"
          ? {
              type: "elite-one-strong-hit",
              strongHitMultiplier: form.heavyMultiplier,
            }
          : {
              type: "boss-cycle-4",
              cycle: ["charge", "slam", "auto", "auto"],
              slamMultiplier: form.heavyMultiplier,
            };

    return {
      id: form.id,
      name: form.name,
      kind: form.kind,
      base: {
        hp: form.hp,
        attack: form.attack,
        posture: form.posture,
      },
      combat: {
        defense: 380,
        critChance: 0.15,
        critDamage: 1.5,
        multiHitChance: 0.18,
        dotChance: form.includeDot ? form.dotChance : 0.15,
      },
      abilities: {
        auto: {
          name: "Auto Strike",
          damageMultiplier: 1,
          postureRatio: 0.22,
        },
        heavy: form.includeHeavy
          ? {
              name: "Heavy Slam",
              damageMultiplier: form.heavyMultiplier,
              postureRatio: 0.4,
              telegraphTurns: form.heavyTelegraph,
              maxActivations: form.aiPlan === "elite" ? 1 : undefined,
            }
          : undefined,
      },
      dot: form.includeDot
        ? {
            chance: form.dotChance,
            damage: form.dotDamage,
            duration: form.dotDuration,
            postureRatio: form.dotPostureRatio,
          }
        : undefined,
      aiPlan,
      tags: ["workshop"],
    };
  }

  private buildKaelisCatalogResults() {
    const counts = countIds(KAELIS_DEFS.map((def) => def.id));
    return KAELIS_DEFS.map((def) => {
      const summary = validateKaelisDef(def);
      const errors = [...summary.errors];
      if (counts[def.id] > 1) {
        errors.push("Duplicate id detected within catalog.");
      }
      return {
        def,
        errors,
        warnings: summary.warnings,
        damageScore: summary.damageScore,
        survivabilityScore: summary.survivabilityScore,
      } as WithScoresReport & { def: KaelisDef };
    });
  }

  private buildEnemyCatalogResults() {
    const counts = countIds(ENEMY_DEFS.map((def) => def.id));
    return ENEMY_DEFS.map((def) => {
      const summary = validateEnemyDef(def);
      const errors = [...summary.errors];
      if (counts[def.id] > 1) {
        errors.push("Duplicate id detected within catalog.");
      }
      return {
        def,
        errors,
        warnings: summary.warnings,
      };
    });
  }
}

function countIds(ids: string[]): Record<string, number> {
  return ids.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
}

function generateKaelisSnippet(def: KaelisDef): string {
  const constName = toConstantName(def.id) + "_DEF";
  const json = JSON.stringify(def, null, 2);
  return `import { KaelisDef } from '../kaelis.types';

export const ${constName}: KaelisDef = ${json};
`;
}

function generateEnemySnippet(def: EnemyDef): string {
  const constName = toConstantName(def.id) + "_DEF";
  const json = JSON.stringify(def, null, 2);
  return `import { EnemyDef } from '../enemies.types';

export const ${constName}: EnemyDef = ${json};
`;
}

function toConstantName(id: string): string {
  return id
    .replace(/[^a-zA-Z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.toUpperCase())
    .join("_");
}
