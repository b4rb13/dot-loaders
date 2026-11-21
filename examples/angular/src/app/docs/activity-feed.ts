// Use it as <app-activity-feed />; it loads once, in the browser, and again
// when you press Refresh.
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
  SkeletonText,
} from '@dotquilt/angular';

async function fetchActivity(signal: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/activity', { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

@Component({
  selector: 'app-activity-feed',
  imports: [DotquiltPlaceholder, LoadingRegion, SkeletonText],
  template: `
    <section>
      <button type="button" (click)="refresh()" [disabled]="refreshing()">
        Refresh
      </button>
      <!-- Pending hides the content; refreshing keeps it visible and usable. -->
      <dotquilt-region
        aria-label="Recent activity"
        [state]="
          items() === null && !failed()
            ? 'pending'
            : refreshing()
              ? 'refreshing'
              : 'ready'
        "
        [timing]="failed() && items() === null ? { duration: 0 } : undefined"
      >
        <div dotquiltPlaceholder>
          <dotquilt-skeleton-text [lines]="3" />
        </div>
        @if (failed() && items() === null) {
          <p role="alert">We couldn't load activity. Try again later.</p>
        } @else {
          <ul>
            @for (item of items(); track item) {
              <li>{{ item }}</li>
            }
          </ul>
        }
      </dotquilt-region>
    </section>
  `,
})
export class ActivityFeed {
  protected readonly items = signal<string[] | null>(null);
  protected readonly refreshing = signal(false);
  protected readonly failed = signal(false);
  #latest: AbortController | undefined;

  constructor() {
    // In the browser only: the server renders the placeholder.
    afterNextRender(() => {
      this.load().catch(() => this.failed.set(true));
    });
    inject(DestroyRef).onDestroy(() => this.#latest?.abort());
  }

  protected refresh() {
    this.refreshing.set(true);
    // A failed refresh keeps the feed you already have.
    this.load()
      .catch(() => {})
      .finally(() => this.refreshing.set(false));
  }

  private load() {
    // Only the latest request may update the feed.
    this.#latest?.abort();
    const request = new AbortController();
    this.#latest = request;
    return fetchActivity(request.signal).then(
      (next) => {
        if (this.#latest === request) this.items.set(next);
      },
      (error) => {
        // A newer request replaced this one; that is not a failure.
        if (!request.signal.aborted) throw error;
      },
    );
  }
}
