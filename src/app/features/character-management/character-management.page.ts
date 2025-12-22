import { CommonModule } from "@angular/common";
import { Component, computed, effect, inject, signal } from "@angular/core";
import {
  CharacterManagementStateService,
  CharacterManagementTab,
} from "./character-management-state.service";
import { LoadoutService } from "../../core/services/loadout.service";
import { KaelisDefinition, KaelisId } from "../../core/models/kaelis.model";
import {
  RingDefinition,
  RingSetDefinition,
  RingStat,
  RingStatType,
} from "../../core/models/ring.model";
import { WeaponDefinition } from "../../core/models/weapon.model";
import { SkinDefinition } from "../../core/models/skin.model";
import { SIGIL_SETS } from "../../content/equipment/sigils";
import { RosterStripComponent } from "./components/roster-strip/roster-strip.component";
import { SideNavigationComponent } from "./components/side-navigation/side-navigation.component";
import { CenterPreviewComponent } from "./components/center-preview/center-preview.component";
import {
  InfoPanelComponent,
  InfoPanelStat,
  SetBonusDisplay,
} from "./components/info-panel/info-panel.component";
import {
  SelectionModalComponent,
  SelectionMode,
} from "./components/selection-modal/selection-modal.component";

interface WeaponStatRow {
  label: string;
  value: string;
}

@Component({
  selector: "app-character-management-page",
  standalone: true,
  imports: [
    CommonModule,
    RosterStripComponent,
    SideNavigationComponent,
    CenterPreviewComponent,
    InfoPanelComponent,
    SelectionModalComponent,
  ],
  templateUrl: "./character-management.page.html",
  styleUrls: ["./character-management.page.scss"],
})
export class CharacterManagementPageComponent {
  protected readonly state = inject(CharacterManagementStateService);
  protected readonly loadout = inject(LoadoutService);

  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<SelectionMode>("weapon");
  protected readonly modalSelectedId = signal<string | null>(null);
  protected readonly previewSkinId = signal<string | null>(null);

  protected readonly roster = computed(() => this.loadout.kaelisList());
  protected readonly currentKaelis = computed(() =>
    this.state.currentKaelis$()
  );
  protected readonly equippedWeapon = computed(() =>
    this.state.equippedWeapon$()
  );
  protected readonly sigilIds = computed(() => this.state.equippedSigils$());
  protected readonly sigilById = computed(
    () =>
      new Map(this.loadout.sigilInventory().map((sigil) => [sigil.id, sigil]))
  );
  protected readonly equippedRings = computed(() =>
    this.sigilIds()
      .map((id) => (id ? (this.sigilById().get(id) ?? null) : null))
      .filter((ring): ring is RingDefinition => !!ring)
  );
  protected readonly skins = computed(() =>
    this.loadout.getSkinsForKaelis(this.state.selectedKaelisId())
  );
  protected readonly equippedSkin = computed(() => this.state.equippedSkin$());

  protected readonly previewSkin = computed(() => {
    const list = this.skins();
    const fallback = this.equippedSkin()?.id;
    const id = this.previewSkinId() ?? fallback;
    return list.find((item) => item.id === id) ?? list[0] ?? null;
  });
  protected readonly previewSkinIndex = computed(() => {
    const list = this.skins();
    const id = this.previewSkin()?.id;
    if (!id) return -1;
    return list.findIndex((item) => item.id === id);
  });
  protected readonly canPrevSkin = computed(() => this.skins().length > 1);
  protected readonly canNextSkin = computed(() => this.skins().length > 1);
  protected readonly isPreviewSkinOwned = computed(() => {
    const skin = this.previewSkin();
    return skin ? this.loadout.isSkinOwned(skin.id) : false;
  });
  protected readonly isPreviewSkinEquipped = computed(() => {
    const skin = this.previewSkin();
    return skin?.id === this.equippedSkin()?.id;
  });

  protected readonly baseStats = computed(() =>
    this.buildBaseStats(this.currentKaelis())
  );
  protected readonly weaponStats = computed(() =>
    this.buildWeaponStats(this.equippedWeapon())
  );
  protected readonly sigilStats = computed(() =>
    this.buildSigilStats(this.equippedRings())
  );
  protected readonly sigilSetBonuses = computed(() =>
    this.buildSigilSetBonuses(this.equippedRings())
  );
  protected readonly primarySigilBonus = computed(() =>
    this.pickPrimarySetBonus(this.equippedRings())
  );

  protected readonly availableWeapons = computed(() =>
    this.loadout.weaponList()
  );
  protected readonly availableSigils = computed(() =>
    this.loadout.sigilInventory()
  );

  constructor() {
    effect(
      () => {
        this.state.selectedKaelisId();
        this.previewSkinId.set(null);
      },
      { allowSignalWrites: true }
    );
  }

  selectKaelis(id: KaelisId): void {
    this.state.selectKaelis(id);
  }

  setActiveTab(tab: CharacterManagementTab): void {
    this.state.setActiveTab(tab);
  }

  openWeaponModal(): void {
    this.modalMode.set("weapon");
    this.modalSelectedId.set(this.equippedWeapon()?.id ?? null);
    this.modalOpen.set(true);
  }

  openSigilModal(index: number): void {
    this.state.selectSigilSlot(index);
    const slotId = this.sigilIds()[index] ?? null;
    this.modalMode.set("sigil");
    this.modalSelectedId.set(slotId);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  confirmSelection(id: string | null): void {
    const kaelisId = this.state.selectedKaelisId();
    if (this.modalMode() === "weapon") {
      if (id) {
        this.loadout.equipWeapon(kaelisId, id as WeaponDefinition["id"]);
      }
      this.modalOpen.set(false);
      return;
    }
    this.state.equipSigilToSelectedSlot(id as RingDefinition["id"] | null);
    this.modalOpen.set(false);
  }

  selectPreviewSkin(skin: SkinDefinition): void {
    this.previewSkinId.set(skin.id);
  }

  equipPreviewSkin(): void {
    const skin = this.previewSkin();
    if (!skin) return;
    this.loadout.equipSkin(this.state.selectedKaelisId(), skin.id);
    this.previewSkinId.set(skin.id);
  }

  previewPreviousSkin(): void {
    const list = this.skins();
    const index = this.previewSkinIndex();
    if (!list.length) return;
    const nextIndex = index <= 0 ? list.length - 1 : index - 1;
    this.previewSkinId.set(list[nextIndex].id);
  }

  previewNextSkin(): void {
    const list = this.skins();
    const index = this.previewSkinIndex();
    if (!list.length) return;
    const nextIndex = index < 0 || index >= list.length - 1 ? 0 : index + 1;
    this.previewSkinId.set(list[nextIndex].id);
  }

  private buildBaseStats(kaelis?: KaelisDefinition): InfoPanelStat[] {
    if (!kaelis) return [];
    return [
      { label: "HP", value: `${kaelis.baseStats.hpBase}` },
      { label: "ATK", value: `${kaelis.baseStats.atkBase}` },
      {
        label: "Crit",
        value: `${Math.round(kaelis.baseStats.critRateBase * 100)}%`,
      },
      {
        label: "DOT",
        value: `${Math.round(kaelis.baseStats.dotChanceBase * 100)}%`,
      },
      { label: "Energy", value: `${kaelis.baseStats.energyBase}` },
    ];
  }

  private buildWeaponStats(weapon?: WeaponDefinition | null): WeaponStatRow[] {
    if (!weapon) return [];
    return [
      { label: "Base", value: this.weaponFlatLabel(weapon) },
      { label: "Secondary", value: this.weaponSecondaryLabel(weapon) },
    ];
  }

  private buildSigilStats(rings: RingDefinition[]): InfoPanelStat[] {
    if (!rings.length) return [];
    const totals = new Map<RingStatType, number>();
    rings.forEach((ring) => {
      this.addStat(totals, ring.mainStat);
      ring.subStats.forEach((stat) => this.addStat(totals, stat));
    });

    const order: RingStatType[] = [
      "hp_flat",
      "hp_percent",
      "atk_flat",
      "atk_percent",
      "crit_rate_percent",
      "crit_damage_percent",
      "damage_percent",
      "energy_regen_percent",
      "damage_reduction_percent",
      "heal_percent",
    ];

    return order
      .filter((type) => (totals.get(type) ?? 0) !== 0)
      .map((type) => ({
        label: this.ringStatLabel({ type, value: totals.get(type) ?? 0 }),
        value: this.ringStatValue(type, totals.get(type) ?? 0),
      }));
  }

  private buildSigilSetBonuses(rings: RingDefinition[]): SetBonusDisplay[] {
    if (!rings.length) return [];
    const counts = this.buildSetCounts(rings);
    return Object.values(SIGIL_SETS).flatMap((set) =>
      this.resolveSetBonuses(set, counts[set.key] ?? 0)
    );
  }

  private pickPrimarySetBonus(rings: RingDefinition[]): SetBonusDisplay | null {
    if (!rings.length) return null;
    const counts = this.buildSetCounts(rings);
    const best = Object.entries(counts).reduce<{
      key: string;
      count: number;
    } | null>(
      (current, [key, count]) =>
        !current || count > current.count ? { key, count } : current,
      null
    );
    if (!best) return null;
    const set = SIGIL_SETS[best.key];
    if (!set) return null;
    const options = this.resolveSetBonuses(set, best.count);
    return options.length ? options[options.length - 1] : null;
  }

  private buildSetCounts(rings: RingDefinition[]): Record<string, number> {
    return rings.reduce<Record<string, number>>((acc, ring) => {
      acc[ring.setKey] = (acc[ring.setKey] ?? 0) + 1;
      return acc;
    }, {});
  }

  private resolveSetBonuses(
    set: RingSetDefinition,
    count: number
  ): SetBonusDisplay[] {
    const entries: SetBonusDisplay[] = [];
    if (set.threePieceBonus && count >= 3) {
      entries.push({
        id: `${set.key}-3`,
        label: `${set.name} (3pc)`,
        detail: `Damage +${set.threePieceBonus.value}%`,
      });
    }
    if (set.fivePieceSkillBuff && count >= 5) {
      entries.push({
        id: `${set.key}-5`,
        label: `${set.name} (5pc)`,
        detail: `Skill: +${set.fivePieceSkillBuff.damagePercent}% damage for ${set.fivePieceSkillBuff.durationTurns} turns`,
      });
    }
    return entries;
  }

  private weaponFlatLabel(weapon: WeaponDefinition): string {
    return weapon.flatStat.type === "atk"
      ? `ATK +${weapon.flatStat.value}`
      : `HP +${weapon.flatStat.value}`;
  }

  private weaponSecondaryLabel(weapon: WeaponDefinition): string {
    if (weapon.secondaryStat.type === "energyRegen") {
      return `Energy Regen +${weapon.secondaryStat.value}%`;
    }
    const percent = Math.round(weapon.secondaryStat.value * 100);
    return weapon.secondaryStat.type === "critRate"
      ? `Crit Rate +${percent}%`
      : `Crit DMG +${percent}%`;
  }

  private addStat(totals: Map<RingStatType, number>, stat: RingStat): void {
    totals.set(stat.type, (totals.get(stat.type) ?? 0) + stat.value);
  }

  private ringStatLabel(stat: RingStat): string {
    switch (stat.type) {
      case "hp_flat":
        return "HP";
      case "atk_flat":
        return "ATK";
      case "hp_percent":
        return "HP %";
      case "atk_percent":
        return "ATK %";
      case "crit_rate_percent":
        return "Crit Rate";
      case "crit_damage_percent":
        return "Crit DMG";
      case "damage_percent":
        return "Damage";
      case "energy_regen_percent":
        return "Energy Regen";
      case "damage_reduction_percent":
        return "Damage Reduction";
      case "heal_percent":
        return "Heal Bonus";
      default:
        return "";
    }
  }

  private ringStatValue(type: RingStatType, value: number): string {
    if (type === "crit_rate_percent" || type === "crit_damage_percent") {
      return `+${Math.round(value * 100)}%`;
    }
    if (type.endsWith("_percent")) {
      return `+${value}%`;
    }
    return `+${value}`;
  }
}
