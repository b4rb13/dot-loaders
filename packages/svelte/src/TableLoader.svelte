<script lang="ts">
import type { Animations } from 'dotquilt';
import {
  type TableLoader as NativeTableLoader,
  registerTableLoader,
  type TableColumn,
  type TablePreset,
  type TableTargetProvider,
} from 'dotquilt/table';
import {
  staticTableLayout,
  wrapperPolicy,
  wrapperPolicyAttributes,
  wrapperTableStyles,
} from 'dotquilt/wrapper';
import { untrack } from 'svelte';
import {
  type HostProps,
  type MarkProps,
  sheet,
  useHost,
} from './host.svelte.js';

interface Props extends HostProps<NativeTableLoader>, MarkProps {
  /** How many rows to show, up to 100. */
  rows?: number | undefined;
  /** Row height in pixels. */
  rowHeight?: number | undefined;
  /** What each column holds and its share of the width. */
  columns?: readonly TableColumn[] | undefined;
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'table'> | undefined;
  preset?: TablePreset | undefined;
  /** Where the real cells are, for the `rows` handoff. */
  targetProvider?: TableTargetProvider | undefined;
}
let {
  stylePolicy,
  motion,
  mark,
  rows,
  rowHeight,
  columns,
  speed,
  pointerResponse,
  animations,
  preset,
  targetProvider,
  onHandoffStart,
  onHandoffEnd,
  onHandoffCancel,
  onLoaderError,
  element = $bindable(),
  ...attributes
}: Props = $props();

// The static outline is drawn once, from the first options; the element
// redraws in its shadow root once defined.
const initial = untrack(() => {
  const layout = staticTableLayout(rows, rowHeight, columns);
  return {
    policy: wrapperPolicy(stylePolicy),
    layout,
    height: layout.rows * layout.rowHeight,
  };
});
useHost(
  () => element,
  registerTableLoader,
  () => ({
    rows,
    rowHeight,
    columns,
    speed,
    pointerResponse,
    animations,
    preset,
    targetProvider,
    stylePolicy: stylePolicy ?? initial.policy,
    motion,
  }),
  () => ({ onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError }),
);
</script>

<dotquilt-table-loader
  bind:this={element}
  {...attributes}
  {...wrapperPolicyAttributes(initial.policy)}
  aria-hidden="true"
  data-dotquilt-surface=""
  motion="paused"
  rows={initial.layout.rows}
  row-height={initial.layout.rowHeight}
  {mark}
  >{@html sheet(wrapperTableStyles, initial.policy, 'TableLoader')}<span
    data-dotquilt-wrapper-static
    aria-hidden="true"
    ><svg
      data-dotquilt-static=""
      width="100%"
      height={initial.height}
      viewBox="0 0 100 {initial.height}"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      opacity="0.25"
      >{#each initial.layout.parts as part, index (index)}<path
          {...part}
        />{/each}</svg
    ></span
  ></dotquilt-table-loader
>
