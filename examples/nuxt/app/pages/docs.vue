<script setup lang="ts">
// The docs site shows these six files in its Vue tabs; tests/nuxt runs them.
import ActivityFeed from '~/docs/ActivityFeed.vue';
import AssistantReply from '~/docs/AssistantReply.vue';
import InvoiceTable from '~/docs/InvoiceTable.vue';
import MemberCard from '~/docs/MemberCard.vue';
import RevenueChart from '~/docs/RevenueChart.vue';
import RevenueTotal from '~/docs/RevenueTotal.vue';
</script>

<template>
  <h1>Docs examples</h1>
  <MemberCard id="ada" />
  <RevenueTotal month="2026-11" />
  <RevenueChart :year="2026" />
  <InvoiceTable />
  <AssistantReply question="When is the Globex invoice due?" />
  <ActivityFeed />
</template>

<style>
/* The example's .member grid has a column for TeamList's avatars; this card
   has none. */
article.member {
  display: block;
}
</style>
