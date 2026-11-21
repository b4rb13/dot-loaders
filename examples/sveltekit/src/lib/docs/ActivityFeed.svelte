<script lang="ts">
// Use it as <ActivityFeed />; it loads when it mounts, and Refresh loads again.
import { LoadingRegion, SkeletonText } from '@dotquilt/svelte';

async function fetchActivity(signal: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/activity', { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

let items = $state<string[] | null>(null);
let refreshing = $state(false);
let failed = $state(false);
let latest: AbortController | undefined;

function load() {
  // Only the latest request may update the feed.
  latest?.abort();
  const request = new AbortController();
  latest = request;
  return fetchActivity(request.signal).then(
    (next) => {
      if (latest === request) items = next;
    },
    (error) => {
      // A newer request replaced this one; that is not a failure.
      if (!request.signal.aborted) throw error;
    },
  );
}

$effect(() => {
  load().catch(() => {
    failed = true;
  });
  return () => latest?.abort();
});

function refresh() {
  refreshing = true;
  // A failed refresh keeps the feed you already have.
  load()
    .catch(() => {})
    .finally(() => {
      refreshing = false;
    });
}
</script>

<section>
  <button type="button" onclick={refresh} disabled={refreshing}>Refresh</button>
  <!-- Pending hides the content; refreshing keeps it visible and usable. -->
  <LoadingRegion
    aria-label="Recent activity"
    state={items === null && !failed
      ? 'pending'
      : refreshing
        ? 'refreshing'
        : 'ready'}
    timing={failed && items === null ? { duration: 0 } : undefined}
  >
    {#snippet placeholder()}
      <SkeletonText lines={3} />
    {/snippet}
    {#if failed && items === null}
      <p role="alert">We couldn't load activity. Try again later.</p>
    {:else}
      <ul>
        {#each items ?? [] as item (item)}
          <li>{item}</li>
        {/each}
      </ul>
    {/if}
  </LoadingRegion>
</section>
