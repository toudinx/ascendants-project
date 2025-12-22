import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RunStateService } from "../../../core/services/run-state.service";
import { PlayerStateService } from "../../../core/services/player-state.service";
import { ProfileStateService } from "../../../core/services/profile-state.service";
import { LoadoutService } from "../../../core/services/loadout.service";
import { TrackKey } from "../../../core/models/tracks.model";
import { SIGIL_SETS } from "../../../content/equipment/sigils";
import { Router } from "@angular/router";

interface TrackOption {
  key: TrackKey;
  name: string;
  fantasy: string;
  tag: string;
}

interface SigilSetSummary {
  name: string;
  bonus: string;
  iconUrl?: string;
}

@Component({
  selector: "app-run-start-page",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./run-start.page.html",
  styleUrls: ["./run-start.page.scss"],
})
export class RunStartPageComponent implements OnInit {
  protected readonly runState = inject(RunStateService);
  protected readonly player = inject(PlayerStateService);
  protected readonly profile = inject(ProfileStateService);
  protected readonly loadout = inject(LoadoutService);
  protected readonly router = inject(Router);

  protected tracks: TrackOption[] = [
    {
      key: "A",
      name: "Critical Route",
      fantasy: "Sentinel Focus + Multi-hit Vulnerability",
      tag: "A",
    },
    {
      key: "B",
      name: "Spiritual Route",
      fantasy: "Ruin Focus + DoT Scaling Increase",
      tag: "B",
    },
    {
      key: "C",
      name: "Impact Route",
      fantasy: "Resonance Focus + Heavy Posture Break",
      tag: "C",
    },
  ];

  protected selectedTrack?: TrackKey;
  protected readonly fallbackPortrait =
    "assets/battle/characters/placeholder.png";

  ngOnInit(): void {
    if (
      this.runState.phase() === "idle" ||
      this.runState.phase() === "finished"
    ) {
      this.runState.phase.set("start");
    }
  }

  get activeKaelis() {
    return this.profile.activeKaelis();
  }

  get attributes() {
    return this.player.state().attributes;
  }

  get activeWeapon() {
    return this.profile.getEquippedWeapon(this.activeKaelis.id);
  }

  get activeWeaponPassive(): string {
    return (
      this.activeWeapon.passive ??
      this.activeWeapon.description ??
      "Passive: (coming soon)"
    );
  }

  get kaelisLevel(): number {
    return this.activeKaelis.profile?.level ?? 1;
  }

  get kaelisTitleLine(): string {
    const title = this.activeKaelis.title || "Kaelis";
    const route = this.activeKaelis.routeType
      ? ` - ${this.activeKaelis.routeType}`
      : "";
    return `${title}${route}`;
  }

  get kaelisStageImage(): string {
    const skin = this.loadout.getEquippedSkin(this.activeKaelis.id);
    return (
      skin?.imageUrl ||
      this.activeKaelis.imageUrl ||
      this.activeKaelis.portrait ||
      this.fallbackPortrait
    );
  }

  get sigilSetSummary(): SigilSetSummary {
    const rings = this.profile.getEquippedRings(this.activeKaelis.id);
    const counts = this.profile.getRingSetCounts(this.activeKaelis.id);
    const entries = Object.entries(counts) as Array<[string, number]>;
    if (!entries.length) {
      return {
        name: "None",
        bonus: "Bonus: (coming soon)",
        iconUrl: rings[0]?.imageUrl,
      };
    }

    const [setKey, count] = entries.sort((a, b) => b[1] - a[1])[0];
    const setDef = SIGIL_SETS[setKey];
    const name = setDef?.name ?? "Unknown Set";
    let bonus = "Bonus: (coming soon)";

    if (setDef?.fivePieceSkillBuff && count >= 5) {
      bonus = `5-Pc: +${setDef.fivePieceSkillBuff.damagePercent}% Skill Dmg`;
    } else if (setDef?.threePieceBonus && count >= 3) {
      bonus = `3-Pc: +${setDef.threePieceBonus.value}% Damage`;
    }

    return {
      name,
      bonus,
      iconUrl: rings[0]?.imageUrl,
    };
  }

  selectTrack(track: TrackKey): void {
    this.selectedTrack = track;
  }

  cycleKaelis(direction: "prev" | "next"): void {
    const roster = this.profile.kaelisList();
    if (!roster.length) return;
    const currentId = this.profile.selectedKaelisId();
    const currentIndex = roster.findIndex((item) => item.id === currentId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      direction === "next"
        ? (safeIndex + 1) % roster.length
        : (safeIndex - 1 + roster.length) % roster.length;
    const nextKaelis = roster[nextIndex];
    if (nextKaelis) {
      this.profile.setSelectedKaelis(nextKaelis.id);
    }
  }

  confirm(): void {
    if (!this.selectedTrack) return;
    this.runState.startRun(this.selectedTrack);
  }

  cancel(): void {
    this.runState.finishRun();
  }

  goToLoadout(): void {
    this.router.navigate(["/character-management"]);
  }
}
