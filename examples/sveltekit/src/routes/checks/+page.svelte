<script lang="ts">
// Edge cases tests/sveltekit drives in a browser; not part of the
// example's story.
import { TableLoader, TypingDots } from '@dotquilt/svelte';
import type { TableColumn } from 'dotquilt/table';
import type { TypingDots as NativeTypingDots } from 'dotquilt/typing';

let clicks = $state(0);
let seen = $state<number[]>([]);
let updates = $state(0);
let dots = $state<NativeTypingDots>();
let columns = $state<TableColumn[]>([{ kind: 'text' }, { kind: 'number' }]);

// Count the element's update() calls after its first.
$effect(() => {
  const element = dots;
  if (!element) return;
  const first = element.update.bind(element);
  element.update = (patch: Parameters<NativeTypingDots['update']>[0]) => {
    updates++;
    first(patch);
  };
});
</script>

<h1>Checks</h1>
<button type="button" onclick={() => clicks++}>Click</button>
<button type="button" onclick={() => columns.push({ kind: 'badge' })}>
  Add column
</button>
<!-- count 0 is invalid: the element reports it during its first update(). -->
<TypingDots
  data-check="dots"
  bind:element={dots}
  count={0}
  onLoaderError={() => seen.push(clicks)}
/>
<TableLoader data-check="table" {columns} rows={2} />
<p>Errors at: {seen.join(', ') || 'none'}</p>
<p>Updates: {updates}</p>
