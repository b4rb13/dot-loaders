import type { Routes } from '@angular/router';
import { RevenuePage } from './revenue-page';
import { TeamPage } from './team-page';

export const routes: Routes = [
  { path: '', component: TeamPage },
  { path: 'revenue', component: RevenuePage },
];
