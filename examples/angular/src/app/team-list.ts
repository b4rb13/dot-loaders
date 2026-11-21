import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  DotquiltPlaceholder,
  LoadingRegion,
  SkeletonCircle,
  SkeletonLine,
} from '@dotquilt/angular';

interface Member {
  name: string;
  role: string;
}

@Component({
  selector: 'app-team-list',
  imports: [DotquiltPlaceholder, LoadingRegion, SkeletonCircle, SkeletonLine],
  template: `
    <section>
      <h2>Members</h2>
      <button type="button" (click)="reload()">Reload</button>
      <!-- An error replaces the placeholder at once, without the handoff. -->
      <dotquilt-region
        aria-label="Team members"
        [state]="status() === 'loading' ? 'pending' : 'ready'"
        [cycle]="cycle().toString()"
        [timing]="status() === 'failed' ? { duration: 0 } : undefined"
        (handoffEnd)="handovers.set(handovers() + 1)"
      >
        <div dotquiltPlaceholder>
          @for (row of [0, 1, 2]; track row) {
            <div class="member-skeleton">
              <dotquilt-skeleton-circle />
              <dotquilt-skeleton-line style="width: 45%" />
              <dotquilt-skeleton-line style="width: 30%" />
            </div>
          }
        </div>
        @if (status() === 'done') {
          @for (member of members(); track member.name) {
            <div class="member">
              <span class="avatar"></span>
              <h3>{{ member.name }}</h3>
              <p>{{ member.role }}</p>
            </div>
          }
        } @else if (status() === 'failed') {
          <p role="alert">We couldn't load the team. Try again later.</p>
        }
      </dotquilt-region>
      <p class="note">Handovers: {{ handovers() }}</p>
    </section>
  `,
})
export class TeamList {
  protected readonly status = signal<'loading' | 'done' | 'failed'>('loading');
  protected readonly members = signal<Member[]>([]);
  protected readonly cycle = signal(0);
  protected readonly handovers = signal(0);
  #latest: AbortController | undefined;

  constructor() {
    afterNextRender(() => this.load());
    inject(DestroyRef).onDestroy(() => this.#latest?.abort());
  }

  protected reload() {
    this.cycle.update((n) => n + 1);
    this.load();
  }

  private load() {
    // Only the latest request may update the list.
    this.#latest?.abort();
    const request = new AbortController();
    this.#latest = request;
    this.status.set('loading');
    fetch('/api/team', { signal: request.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<Member[]>;
      })
      .then((list) => {
        this.members.set(list);
        this.status.set('done');
      })
      .catch(() => {
        if (!request.signal.aborted) this.status.set('failed');
      });
  }
}
