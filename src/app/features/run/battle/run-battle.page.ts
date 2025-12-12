import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AppPanelComponent,
  AppStatBarComponent,
  AppTagComponent,
  AppButtonComponent,
  WowBurstComponent,
  RarityTagComponent
} from '../../../shared/components';
import { EnemyStateService } from '../../../core/services/enemy-state.service';
import { PlayerStateService } from '../../../core/services/player-state.service';
import { RunStateService } from '../../../core/services/run-state.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { BattleEngineService } from '../../../core/services/battle-engine.service';
import { SkinStateService } from '../../../core/services/skin-state.service';

type SkillState = { disabled: boolean; hint: string };

@Component({
  selector: 'app-run-battle-page',
  standalone: true,
  imports: [CommonModule, AppPanelComponent, AppStatBarComponent, AppTagComponent, AppButtonComponent, WowBurstComponent, RarityTagComponent],
  template: `
    <wow-burst [trigger]="wow"></wow-burst>
    <div class="space-y-4">
      <app-panel
        title="{{ enemy.attributes.name }}"
        subtitle="IA genérica para validação de combate"
        [ngClass]="enemyPanelClass"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <app-tag label="Inimigo" tone="muted"></app-tag>
            <app-tag *ngIf="enemy.state === 'preparando'" label="Ataque forte" tone="warning"></app-tag>
            <app-tag *ngIf="enemy.state === 'quebrado'" label="Quebrado" tone="warning"></app-tag>
            <app-tag *ngIf="enemy.state === 'superquebrado'" label="Superquebrado" tone="danger"></app-tag>
          </div>
          <div class="flex items-center gap-2 text-xs text-[#A4A4B5]">
            <span class="h-2 w-2 rounded-full bg-[#E28FE8]"></span>
            Estado: {{ enemy.state }}
          </div>
        </div>
        <div class="mt-3 space-y-2">
          <app-stat-bar
            label="HP"
            [current]="enemy.attributes.hp"
            [max]="enemy.attributes.maxHp"
            tone="hp"
            [warnAt]="0.2"
          ></app-stat-bar>
          <app-stat-bar
            label="Postura"
            [current]="enemy.attributes.posture"
            [max]="enemy.attributes.maxPosture"
            tone="posture"
          ></app-stat-bar>
          <div *ngIf="enemy.state === 'preparando'" class="flex items-center gap-2 rounded-[10px] border border-[#FFD344]/30 bg-[#FFD344]/10 px-3 py-2 text-sm text-[#FFD344]">
            Alerta: Ataque poderoso chegando!
          </div>
        </div>
      </app-panel>

      <div class="rounded-[16px] border border-white/10 bg-[#0B0B16] p-4 md:p-6">
        <div class="grid gap-4 md:grid-cols-[1fr,0.55fr]">
          <div class="relative h-56 overflow-hidden rounded-[14px] bg-gradient-to-br from-[#8A7CFF]/20 via-[#E28FE8]/10 to-[#050511]" [class.enemy-hit-flash]="ui.state().flashEnemy">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(138,124,255,0.12),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(226,143,232,0.08),transparent_40%)]"></div>
            <div class="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.24em] text-white/30">
              Arena + números flutuantes
            </div>
            <div class="absolute inset-0 pointer-events-none">
              <div
                *ngFor="let event of ui.state().floatEvents"
                class="float-number text-lg"
                [ngClass]="{
                  'float-crit': event.type === 'crit',
                  'float-dot': event.type === 'dot',
                  'float-posture': event.type === 'posture'
                }"
                [style.left.%]="10 + (event.id.charCodeAt(0) % 70)"
                [style.top.%]="20 + (event.id.charCodeAt(1) % 60)"
              >
                {{ event.value }}
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <p class="text-sm text-[#A4A4B5] uppercase tracking-[0.2em]">Log rápido</p>
            <div #logList class="max-h-40 space-y-2 overflow-y-auto rounded-[12px] border border-white/10 bg-white/5 p-3">
              <div
                *ngFor="let log of ui.state().logs"
                class="rounded-[10px] border border-white/5 bg-white/5 px-3 py-2 text-sm text-white/80"
              >
                {{ log }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <app-panel
        title="Velvet"
        [subtitle]="skinSubtitle"
        [ngClass]="player.status === 'quebrado' ? 'panel-broken' : player.status === 'superquebrado' ? 'panel-superbroken' : ''"
      >
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-3 md:flex-row md:items-center">
            <div
              class="h-24 w-full rounded-[14px] border bg-gradient-to-br from-[#8A7CFF]/30 to-[#E28FE8]/20 md:h-24 md:w-24"
              [class.player-hit-flash]="ui.state().flashPlayer"
              [ngClass]="[skinAccentClass, skinGlowClass]"
            ></div>
            <div class="flex-1 space-y-2">
              <div class="flex items-center gap-2 text-sm text-[#A4A4B5]">
                <span class="text-white">Velvet — {{ currentSkin.name }}</span>
                <rarity-tag [rarity]="currentSkin.rarity"></rarity-tag>
              </div>
              <app-stat-bar
                label="HP"
                [current]="player.attributes.hp"
                [max]="player.attributes.maxHp"
                tone="hp"
                [warnAt]="0.2"
              ></app-stat-bar>
              <app-stat-bar
                label="Postura"
                [current]="player.attributes.posture"
                [max]="player.attributes.maxPosture"
                tone="posture"
              ></app-stat-bar>
              <app-stat-bar
                label="Energia"
                [current]="player.attributes.energy"
                [max]="player.attributes.maxEnergy"
                tone="energy"
              ></app-stat-bar>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <app-tag
              *ngFor="let buff of player.buffs"
              [label]="buff.name"
              [tone]="buff.type === 'buff' ? 'success' : 'danger'"
              [icon]="buff.icon"
            ></app-tag>
            <app-tag *ngIf="!player.buffs.length" label="Sem efeitos" tone="muted"></app-tag>
          </div>

          <div class="space-y-2 rounded-[14px] border border-white/10 bg-white/5 p-3">
            <div class="flex items-center justify-between text-sm text-[#A4A4B5]">
              <span class="uppercase tracking-[0.18em]">Habilidade Ativa</span>
              <span class="text-xs text-white/70">{{ activeSkill.name }}</span>
            </div>
            <app-button
              [label]="activeSkill.name"
              variant="primary"
              [disabled]="skillState.disabled"
              class="w-full"
              (click)="activateSkill()"
            ></app-button>
            <p class="text-xs text-[#A4A4B5]">{{ skillState.hint }}</p>
          </div>
        </div>
      </app-panel>

      <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-[#A4A4B5]">
        <div class="flex items-center gap-2">
          <span class="text-white">Sala {{ run.currentRoom() }} / {{ run.totalRooms() }}</span>
          <app-tag
            [label]="salaTipoLabel"
            [tone]="salaTipoTone"
          ></app-tag>
        </div>
        <div class="flex gap-2">
          <app-tag label="Tick-based" tone="muted"></app-tag>
          <app-tag label="Auto" tone="accent"></app-tag>
        </div>
      </div>
    </div>
  `
})
export class RunBattlePageComponent implements OnInit, OnDestroy {
  @ViewChild('logList') logList?: ElementRef<HTMLDivElement>;

  protected readonly enemyState = inject(EnemyStateService);
  protected readonly playerState = inject(PlayerStateService);
  protected readonly run = inject(RunStateService);
  protected readonly ui = inject(UiStateService);
  protected readonly battle = inject(BattleEngineService);
  protected readonly skinState = inject(SkinStateService);

  protected readonly activeSkill = { name: 'Impacto Arcano', cost: 40, cooldown: 0 };
  protected wow = false;

  constructor() {
    effect(() => {
      this.ui.state().logs;
      queueMicrotask(() => this.scrollLogs());
    });
    effect(() => {
      const evt = this.battle.lastEvent();
      if (evt === 'superbreak' || evt === 'skill') {
        this.wow = false;
        queueMicrotask(() => (this.wow = true));
      }
    });
  }

  ngOnInit(): void {
    this.battle.startLoop();
  }

  ngOnDestroy(): void {
    this.battle.stopLoop();
  }

  get enemy() {
    return this.enemyState.enemy();
  }

  get player() {
    return this.playerState.state();
  }

  get currentSkin() {
    return this.skinState.currentSkin();
  }

  get skinSubtitle(): string {
    return `Skin: ${this.currentSkin.name}`;
  }

  get skinAccentClass(): string {
    if (this.currentSkin.rarity === 'SSR') return 'skin-ssr';
    if (this.currentSkin.rarity === 'SR') return 'skin-sr';
    return 'border-blue-300/30 shadow-[0_0_12px_rgba(122,140,255,0.16)]';
  }

  get skinGlowClass(): string {
    return this.currentSkin.rarity === 'SSR' ? 'shadow-[0_0_16px_rgba(255,211,68,0.35)]' : '';
  }

  get enemyPanelClass(): string {
    if (this.enemy.state === 'superquebrado') return 'panel-superbroken';
    if (this.enemy.state === 'quebrado') return 'panel-broken';
    return '';
  }

  get salaTipoLabel(): string {
    const tipo = this.run.roomType();
    if (tipo === 'mini-boss') return 'Mini-boss';
    if (tipo === 'boss') return 'Boss';
    return 'Normal';
  }

  get salaTipoTone(): 'accent' | 'warning' | 'danger' | 'muted' {
    const tipo = this.run.roomType();
    if (tipo === 'mini-boss') return 'warning';
    if (tipo === 'boss') return 'danger';
    return 'accent';
  }

  get skillState(): SkillState {
    const energy = this.player.attributes.energy;
    const cd = this.playerState.state().skillCooldown ?? 0;
    if (this.player.status !== 'normal') return { disabled: true, hint: 'Velvet está quebrada' };
    if (cd > 0) return { disabled: true, hint: `Recarregando (${cd} turnos)` };
    if (energy < this.activeSkill.cost) return { disabled: true, hint: 'Sem energia suficiente' };
    return { disabled: false, hint: 'Pronta - consome energia e aplica multi-hit' };
  }

  private scrollLogs(): void {
    const el = this.logList?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  activateSkill(): void {
    this.battle.triggerActiveSkill();
  }
}
