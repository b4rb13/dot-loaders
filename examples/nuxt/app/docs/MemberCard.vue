<script setup lang="ts">
import { LoadingRegion, SkeletonCircle, SkeletonLine } from '@dotquilt/vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';

// Use it as <MemberCard id="ada" />; it loads again whenever id changes.
const props = defineProps<{ id: string }>();

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

const result = ref<Result>({ status: 'loading' });
let latest: AbortController | undefined;

function load(id: string) {
  // A newer id cancels this request, so a stale answer never shows.
  latest?.abort();
  const request = new AbortController();
  latest = request;
  result.value = { status: 'loading' };
  fetchMember(id, request.signal)
    .then((member) => {
      if (!request.signal.aborted) result.value = { status: 'done', member };
    })
    .catch(() => {
      if (!request.signal.aborted) result.value = { status: 'failed' };
    });
}

// Fetch in the browser only, so the server HTML holds the placeholder.
onMounted(() => load(props.id));
watch(() => props.id, load);
onUnmounted(() => latest?.abort());
</script>

<template>
  <!-- An error replaces the placeholder at once, without the handoff. -->
  <LoadingRegion
    aria-label="Team member"
    :state="result.status === 'loading' ? 'pending' : 'ready'"
    :cycle="id"
    :timing="result.status === 'failed' ? { duration: 0 } : undefined"
  >
    <template #placeholder>
      <div class="member-skeleton">
        <SkeletonCircle />
        <SkeletonLine />
        <SkeletonLine style="width: 60%" />
      </div>
    </template>
    <article v-if="result.status === 'done'" class="member">
      <h3>{{ result.member.name }}</h3>
      <p>{{ result.member.role }}</p>
      <p>{{ result.member.bio }}</p>
    </article>
    <p v-else-if="result.status === 'failed'" role="alert">
      We couldn't load this member. Try again later.
    </p>
  </LoadingRegion>
</template>
