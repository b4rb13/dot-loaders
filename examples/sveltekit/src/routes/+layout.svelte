<script lang="ts">
import '#lib/styles.css';
import type { Snippet } from 'svelte';

let { children }: { children: Snippet } = $props();
</script>

<nav aria-label="Pages">
  <!-- Client-side navigation: the loaders on the next page start fresh. -->
  <a href="/">Team</a>
  <a href="/revenue">Revenue</a>
</nav>
<main>
  {@render children()}
</main>
