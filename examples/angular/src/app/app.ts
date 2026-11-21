import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  template: `
    <nav aria-label="Pages">
      <!-- Client-side navigation: the loaders on the next page start fresh. -->
      <a routerLink="/">Team</a>
      <a routerLink="/revenue">Revenue</a>
    </nav>
    <main><router-outlet /></main>
  `,
})
export class App {}
