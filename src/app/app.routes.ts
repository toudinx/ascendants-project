import { Routes } from '@angular/router';
import { HomePageComponent } from './features/home/home.page';
import { RunStartPageComponent } from './features/run/start/run-start.page';
import { RunBattlePageComponent } from './features/run/battle/run-battle.page';
import { RunIntermissionPageComponent } from './features/run/intermission/run-intermission.page';
import { RunRewardPageComponent } from './features/run/reward/run-reward.page';
import { RunPrepPageComponent } from './features/run/prep/run-prep.page';
import { RunEvolutionPageComponent } from './features/run/evolution/run-evolution.page';
import { RunSummaryPageComponent } from './features/run/summary/run-summary.page';
import { RunDeathPageComponent } from './features/run/death/run-death.page';
import { RunVictoryPageComponent } from './features/run/victory/run-victory.page';
import { InventoryPageComponent } from './features/inventory/inventory.page';
import { StorePageComponent } from './features/store/store.page';
import { DailyPageComponent } from './features/daily/daily.page';
import { VelvetCollectionPageComponent } from './features/collection/velvet-collection.page';
import { GachaPageComponent } from './features/gacha/gacha.page';
import { EventsPageComponent } from './features/events/events.page';
import { runActiveCanActivate, runActiveCanMatch } from './core/guards/run-active.guard';
import { LoadoutPageComponent } from './features/loadout/loadout.page';
import { CharacterManagementPageComponent } from './features/character-management/character-management.page';
import { ContentWorkshopPageComponent } from './features/dev/content-workshop/content-workshop.page';
import { devOnlyCanActivate, devOnlyCanMatch } from './core/guards/dev-only.guard';
import { ASCENSION_ROUTES } from './features/echoes-of-ascension/echoes-of-ascension.routes';

export const appRoutes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'run/start', component: RunStartPageComponent },
  ...ASCENSION_ROUTES,
  {
    path: 'run/battle',
    component: RunBattlePageComponent,
    canActivate: [runActiveCanActivate],
    canMatch: [runActiveCanMatch]
  },
  {
    path: 'run/intermission',
    component: RunIntermissionPageComponent,
    canActivate: [runActiveCanActivate],
    canMatch: [runActiveCanMatch]
  },
  {
    path: 'run/reward',
    component: RunRewardPageComponent,
    canActivate: [runActiveCanActivate],
    canMatch: [runActiveCanMatch]
  },
  {
    path: 'run/prep',
    component: RunPrepPageComponent,
    canActivate: [runActiveCanActivate],
    canMatch: [runActiveCanMatch]
  },
  {
    path: 'run/evolution',
    component: RunEvolutionPageComponent,
    canActivate: [runActiveCanActivate],
    canMatch: [runActiveCanMatch]
  },
  {
    path: 'run/death',
    component: RunDeathPageComponent,
    canActivate: [runActiveCanActivate],
    canMatch: [runActiveCanMatch]
  },
  {
    path: 'run/victory',
    component: RunVictoryPageComponent,
    canActivate: [runActiveCanActivate],
    canMatch: [runActiveCanMatch]
  },
  {
    path: 'run/summary',
    component: RunSummaryPageComponent,
    canActivate: [runActiveCanActivate],
    canMatch: [runActiveCanMatch]
  },
  { path: 'inventory', component: InventoryPageComponent },
  { path: 'store', component: StorePageComponent },
  { path: 'daily', component: DailyPageComponent },
  { path: 'collection', component: VelvetCollectionPageComponent },
  { path: 'gacha', component: GachaPageComponent },
  { path: 'events', component: EventsPageComponent },
  { path: 'character-management', component: CharacterManagementPageComponent },
  { path: 'loadout', component: LoadoutPageComponent },
  {
    path: 'dev/content',
    component: ContentWorkshopPageComponent,
    canActivate: [devOnlyCanActivate],
    canMatch: [devOnlyCanMatch]
  },
  { path: '**', redirectTo: '' }
];
