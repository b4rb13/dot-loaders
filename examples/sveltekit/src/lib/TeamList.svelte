<script lang="ts">
import { LoadingRegion, SkeletonCircle, SkeletonLine } from '@dotquilt/svelte';
import { onMount } from 'svelte';

interface Member {
  name: string;
  role: string;
}

let status = $state<'loading' | 'done' | 'failed'>('loading');
let members = $state<Member[]>([]);
let cycle = $state(0);
let handovers = $state(0);
let latest: AbortController | undefined;

function load() {
  // Only the latest request may update the list.
  latest?.abort();
  const request = new AbortController();
  latest = request;
  status = 'loading';
  fetch('/api/team', { signal: request.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json() as Promise<Member[]>;
    })
    .then((list) => {
      members = list;
      status = 'done';
    })
    .catch(() => {
      if (!request.signal.aborted) status = 'failed';
    });
}

function reload() {
  cycle++;
  load();
}

onMount(() => {
  load();
  return () => latest?.abort();
});
</script>

<section>
  <h2>Members</h2>
  <button type="button" onclick={reload}>Reload</button>
  <!-- An error replaces the placeholder at once, without the handoff. -->
  <LoadingRegion
    aria-label="Team members"
    state={status === 'loading' ? 'pending' : 'ready'}
    cycle={String(cycle)}
    timing={status === 'failed' ? { duration: 0 } : undefined}
    onHandoffEnd={() => handovers++}
  >
    {#snippet placeholder()}
      {#each [0, 1, 2] as row (row)}
        <div class="member-skeleton">
          <SkeletonCircle />
          <SkeletonLine style="width: 45%" />
          <SkeletonLine style="width: 30%" />
        </div>
      {/each}
    {/snippet}
    {#if status === 'done'}
      {#each members as member (member.name)}
        <div class="member">
          <span class="avatar"></span>
          <h3>{member.name}</h3>
          <p>{member.role}</p>
        </div>
      {/each}
    {:else if status === 'failed'}
      <p role="alert">We couldn't load the team. Try again later.</p>
    {/if}
  </LoadingRegion>
  <p class="note">Handovers: {handovers}</p>
</section>
