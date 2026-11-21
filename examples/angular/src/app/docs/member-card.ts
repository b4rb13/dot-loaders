// Use it as <app-member-card id="ada" />; it loads again whenever id changes.
import { afterRenderEffect, Component, input, signal } from '@angular/core';
import {
  DotquiltPlaceholder,
  LoadingRegion,
  SkeletonCircle,
  SkeletonLine,
} from '@dotquilt/angular';

interface Member {
  name: string;
  role: string;
  bio: string;
}

async function fetchMember(id: string, signal: AbortSignal): Promise<Member> {
  const response = await fetch(`/api/members/${id}`, { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

type Result =
  | { status: 'loading' }
  | { status: 'done'; member: Member }
  | { status: 'failed' };

@Component({
  selector: 'app-member-card',
  imports: [DotquiltPlaceholder, LoadingRegion, SkeletonCircle, SkeletonLine],
  template: `
    @let current = result();
    <!-- An error replaces the placeholder at once, without the handoff. -->
    <dotquilt-region
      aria-label="Team member"
      [state]="current.status === 'loading' ? 'pending' : 'ready'"
      [cycle]="id()"
      [timing]="current.status === 'failed' ? { duration: 0 } : undefined"
    >
      <div dotquiltPlaceholder>
        <div class="member-skeleton">
          <dotquilt-skeleton-circle />
          <dotquilt-skeleton-line />
          <dotquilt-skeleton-line style="width: 60%" />
        </div>
      </div>
      @if (current.status === 'done') {
        <article class="member">
          <h3>{{ current.member.name }}</h3>
          <p>{{ current.member.role }}</p>
          <p>{{ current.member.bio }}</p>
        </article>
      } @else if (current.status === 'failed') {
        <p role="alert">We couldn't load this member. Try again later.</p>
      }
    </dotquilt-region>
  `,
})
export class MemberCard {
  readonly id = input.required<string>();
  protected readonly result = signal<Result>({ status: 'loading' });

  constructor() {
    // Runs in the browser after rendering, and again whenever id changes.
    // It never runs on the server, which renders the placeholder.
    afterRenderEffect((onCleanup) => {
      const request = new AbortController();
      this.result.set({ status: 'loading' });
      fetchMember(this.id(), request.signal)
        .then((member) => this.result.set({ status: 'done', member }))
        .catch(() => {
          if (!request.signal.aborted) this.result.set({ status: 'failed' });
        });
      // A newer id cancels this request, so a stale answer never shows.
      onCleanup(() => request.abort());
    });
  }
}
