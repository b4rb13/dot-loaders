<script lang="ts">
// The Svelte examples on the docs site's component pages, run here so the
// build type-checks them and tests/sveltekit drives them in a browser.
import ActivityFeed from '#lib/docs/ActivityFeed.svelte';
import AssistantReply from '#lib/docs/AssistantReply.svelte';
import InvoiceTable from '#lib/docs/InvoiceTable.svelte';
import MemberCard from '#lib/docs/MemberCard.svelte';
import RevenueChart from '#lib/docs/RevenueChart.svelte';
import RevenueTotal from '#lib/docs/RevenueTotal.svelte';
</script>

<h1>Docs examples</h1>
<MemberCard id="ada" />
<RevenueTotal month="2026-11" />
<RevenueChart year={2026} />
<InvoiceTable />
<AssistantReply question="When is the Globex invoice due?" />
<ActivityFeed />
