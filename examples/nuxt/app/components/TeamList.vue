<script setup lang="ts">
import { LoadingRegion, SkeletonCircle, SkeletonLine } from '@dotquilt/vue';
import { onMounted, onUnmounted, ref } from 'vue';

interface Member {
  name: string;
  role: string;
}

const status = ref<'loading' | 'done' | 'failed'>('loading');
const members = ref<Member[]>([]);
const cycle = ref(0);
const handovers = ref(0);
let latest: AbortController | undefined;

function load() {
  // Only the latest request may update the list.
  latest?.abort();
  const request = new AbortController();
  latest = request;
  status.value = 'loading';
  $fetch<Member[]>('/api/team', { signal: request.signal })
    .then((list) => {
      members.value = list;
      status.value = 'done';
    })
    .catch(() => {
      if (!request.signal.aborted) status.value = 'failed';
    });
}

function reload() {
  cycle.value++;
  load();
}

onMounted(load);
onUnmounted(() => latest?.abort());
</script>

<template>
  <section>
    <h2>Members</h2>
    <button type="button" @click="reload">Reload</button>
    <!-- An error replaces the placeholder at once, without the handoff. -->
    <LoadingRegion
      aria-label="Team members"
      :state="status === 'loading' ? 'pending' : 'ready'"
      :cycle="String(cycle)"
      :timing="status === 'failed' ? { duration: 0 } : undefined"
      @handoff-end="handovers++"
    >
      <template #placeholder>
        <div v-for="row in 3" :key="row" class="member-skeleton">
          <SkeletonCircle />
          <SkeletonLine style="width: 45%" />
          <SkeletonLine style="width: 30%" />
        </div>
      </template>
      <template v-if="status === 'done'">
        <div v-for="member in members" :key="member.name" class="member">
          <span class="avatar" />
          <h3>{{ member.name }}</h3>
          <p>{{ member.role }}</p>
        </div>
      </template>
      <p v-else-if="status === 'failed'" role="alert">
        We couldn't load the team. Try again later.
      </p>
    </LoadingRegion>
    <p class="note">Handovers: {{ handovers }}</p>
  </section>
</template>
