<script setup lang="ts">
import { LoadingRegion, SkeletonText } from '@dotquilt/vue';
import { onMounted, onUnmounted, ref } from 'vue';

// Use it as <ActivityFeed />; Refresh keeps the list on screen while it loads.
async function fetchActivity(signal: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/activity', { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

const items = ref<string[] | null>(null);
const refreshing = ref(false);
const failed = ref(false);
let latest: AbortController | undefined;

function load() {
  // Only the latest request may update the feed.
  latest?.abort();
  const request = new AbortController();
  latest = request;
  return fetchActivity(request.signal).then(
    (next) => {
      if (latest === request) items.value = next;
    },
    (error) => {
      // A newer request replaced this one; that is not a failure.
      if (!request.signal.aborted) throw error;
    },
  );
}

// Fetch in the browser only, so the server HTML holds the placeholder.
onMounted(() => {
  load().catch(() => {
    failed.value = true;
  });
});
onUnmounted(() => latest?.abort());

function refresh() {
  refreshing.value = true;
  // A failed refresh keeps the feed you already have.
  load()
    .catch(() => {})
    .finally(() => {
      refreshing.value = false;
    });
}
</script>

<template>
  <section>
    <button type="button" :disabled="refreshing" @click="refresh">
      Refresh
    </button>
    <!-- Pending hides the content; refreshing keeps it visible and usable. -->
    <LoadingRegion
      aria-label="Recent activity"
      :state="
        items === null && !failed
          ? 'pending'
          : refreshing
            ? 'refreshing'
            : 'ready'
      "
      :timing="failed && items === null ? { duration: 0 } : undefined"
    >
      <template #placeholder>
        <SkeletonText :lines="3" />
      </template>
      <p v-if="failed && items === null" role="alert">
        We couldn't load activity. Try again later.
      </p>
      <ul v-else>
        <li v-for="item in items" :key="item">{{ item }}</li>
      </ul>
    </LoadingRegion>
  </section>
</template>
