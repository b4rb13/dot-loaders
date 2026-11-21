<script setup lang="ts">
// Edge cases tests/nuxt drives in a browser; not part of the example's story.
import { SkeletonText, TableLoader } from '@dotquilt/vue';
import type { TableColumn } from 'dotquilt/table';
import { reactive, ref } from 'vue';

const mark = ref<'dash' | undefined>(undefined);
const errors = ref<string[]>([]);
const columns = reactive<TableColumn[]>([{ kind: 'text' }, { kind: 'number' }]);
</script>

<template>
  <h1>Checks</h1>
  <button type="button" @click="mark = 'dash'">Dashes</button>
  <button type="button" @click="mark = undefined">Default mark</button>
  <button type="button" @click="columns.push({ kind: 'badge' })">Add column</button>
  <SkeletonText
    data-check="text"
    :lines="2"
    :mark="mark"
    @loader-error="(event) => errors.push(event.detail.code)"
  />
  <TableLoader data-check="table" :columns="columns" :rows="2" />
  <p>Errors: {{ errors.join(', ') || 'none' }}</p>
</template>
