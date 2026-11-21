import type { Routes } from '@angular/router';
import { ChecksPage } from './checks-page';
import { RevenuePage } from './revenue-page';
import { TeamPage } from './team-page';

export const routes: Routes = [
  { path: '', component: TeamPage },
  { path: 'revenue', component: RevenuePage },
  { path: 'checks', component: ChecksPage },
];
