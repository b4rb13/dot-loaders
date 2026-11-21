<script setup lang="ts">
import { LoadingRegion, TypingDots } from '@dotquilt/vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';

// Use it as <AssistantReply question="…" />; it asks again whenever question changes.
const props = defineProps<{ question: string }>();

async function fetchReply(
  question: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal,
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const { reply } = await response.json();
  return reply;
}

const reply = ref<string | null>(null);
const failed = ref(false);
let latest: AbortController | undefined;

function load(question: string) {
  latest?.abort();
  const request = new AbortController();
  latest = request;
  reply.value = null;
  failed.value = false;
  fetchReply(question, request.signal)
    .then((text) => {
      if (!request.signal.aborted) reply.value = text;
    })
    .catch(() => {
      if (!request.signal.aborted) failed.value = true;
    });
}

onMounted(() => load(props.question));
watch(() => props.question, load);
onUnmounted(() => latest?.abort());
</script>

<template>
  <LoadingRegion
    aria-label="Assistant reply"
    :state="reply === null && !failed ? 'pending' : 'ready'"
    :cycle="question"
    :timing="failed ? { duration: 0 } : undefined"
  >
    <template #placeholder>
      <div class="bubble">
        <TypingDots />
      </div>
    </template>
    <div class="bubble">
      {{ failed ? "Sorry, I couldn't answer that. Try again." : reply }}
    </div>
  </LoadingRegion>
</template>
