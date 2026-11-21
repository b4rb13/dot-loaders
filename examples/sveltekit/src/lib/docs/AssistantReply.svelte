<script lang="ts">
// Use it as <AssistantReply question="When is the Globex invoice due?" />;
// it asks again whenever question changes.
import { LoadingRegion, TypingDots } from '@dotquilt/svelte';

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

let { question }: { question: string } = $props();
let reply = $state<string | null>(null);
let failed = $state(false);

$effect(() => {
  const request = new AbortController();
  reply = null;
  failed = false;
  fetchReply(question, request.signal)
    .then((answer) => {
      reply = answer;
    })
    .catch(() => {
      if (!request.signal.aborted) failed = true;
    });
  return () => request.abort();
});
</script>

<LoadingRegion
  aria-label="Assistant reply"
  state={reply === null && !failed ? 'pending' : 'ready'}
  cycle={question}
  timing={failed ? { duration: 0 } : undefined}
>
  {#snippet placeholder()}
    <div class="bubble">
      <TypingDots />
    </div>
  {/snippet}
  <div class="bubble">
    {failed ? "Sorry, I couldn't answer that. Try again." : reply}
  </div>
</LoadingRegion>
