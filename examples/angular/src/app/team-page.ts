import { Component } from '@angular/core';
import { RevenueTotal } from './revenue-total';
import { TeamList } from './team-list';

@Component({
  selector: 'app-team-page',
  imports: [RevenueTotal, TeamList],
  template: `
    <h1>Team</h1>
    <app-revenue-total />
    <app-team-list />
  `,
})
export class TeamPage {}
