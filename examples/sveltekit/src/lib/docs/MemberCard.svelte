<script lang="ts">
// Use it as <MemberCard id="ada" />; it loads again whenever id changes.
import { LoadingRegion, SkeletonCircle, SkeletonLine } from '@dotquilt/svelte';

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

let { id }: { id: string } = $props();
let result = $state<Result>({ status: 'loading' });

$effect(() => {
  const request = new AbortController();
  result = { status: 'loading' };
  fetchMember(id, request.signal)
    .then((member) => {
      result = { status: 'done', member };
    })
    .catch(() => {
      if (!request.signal.aborted) result = { status: 'failed' };
    });
  // A newer id cancels this request, so a stale answer never shows.
  return () => request.abort();
});
</script>

<!-- An error replaces the placeholder at once, without the handoff. -->
<LoadingRegion
  aria-label="Team member"
  state={result.status === 'loading' ? 'pending' : 'ready'}
  cycle={id}
  timing={result.status === 'failed' ? { duration: 0 } : undefined}
>
  {#snippet placeholder()}
    <div class="member-skeleton">
      <SkeletonCircle />
      <SkeletonLine />
      <SkeletonLine style="width: 60%" />
    </div>
  {/snippet}
  {#if result.status === 'done'}
    <article class="member">
      <h3>{result.member.name}</h3>
      <p>{result.member.role}</p>
      <p>{result.member.bio}</p>
    </article>
  {:else if result.status === 'failed'}
    <p role="alert">We couldn't load this member. Try again later.</p>
  {/if}
</LoadingRegion>
