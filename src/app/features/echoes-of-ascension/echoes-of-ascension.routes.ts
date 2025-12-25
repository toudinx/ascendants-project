import { Routes } from '@angular/router';
import { AscensionStartPageComponent } from './pages/start/ascension-start.page';
import { AscensionBattlePageComponent } from './pages/battle/ascension-battle.page';
import { AscensionDraftPageComponent } from './pages/draft/ascension-draft.page';
import { AscensionShopPageComponent } from './pages/shop/ascension-shop.page';
import { AscensionBargainPageComponent } from './pages/bargain/ascension-bargain.page';
import { AscensionSummaryPageComponent } from './pages/summary/ascension-summary.page';

export const ASCENSION_ROUTES: Routes = [
  {
    path: 'ascension',
    children: [
      { path: 'start', component: AscensionStartPageComponent },
      { path: 'battle', component: AscensionBattlePageComponent },
      { path: 'draft', component: AscensionDraftPageComponent },
      { path: 'shop', component: AscensionShopPageComponent },
      { path: 'bargain', component: AscensionBargainPageComponent },
      { path: 'summary', component: AscensionSummaryPageComponent }
    ]
  }
];
