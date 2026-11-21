<script lang="ts">
import type { Animations } from 'dotquilt';
import {
  type SkeletonText as NativeSkeletonText,
  registerSkeletonText,
  type SkeletonPreset,
} from 'dotquilt/skeleton';
import {
  wrapperPolicy,
  wrapperPolicyAttributes,
  wrapperSkeletonLines,
  wrapperSkeletonTextMarkStyles,
  wrapperSkeletonTextStyles,
} from 'dotquilt/wrapper';
import { untrack } from 'svelte';
import {
  type HostProps,
  type MarkProps,
  markSheet,
  sheet,
  useHost,
} from './host.svelte.js';

interface Props extends HostProps<NativeSkeletonText>, MarkProps {
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'skeleton'> | undefined;
  preset?: SkeletonPreset | undefined;
  /** How many lines, up to 50. */
  lines?: number | undefined;
  /** Each line's length as a share of the width. */
  widths?: readonly number[] | undefined;
}
let {
  stylePolicy,
  motion,
  mark,
  speed,
  pointerResponse,
  animations,
  preset,
  lines,
  widths,
  onHandoffStart,
  onHandoffEnd,
  onHandoffCancel,
  onLoaderError,
  element = $bindable(),
  ...attributes
}: Props = $props();

const initial = untrack(() => ({
  policy: wrapperPolicy(stylePolicy),
  speed: speed ?? preset?.speed ?? 1,
  pointerResponse: pointerResponse ?? preset?.pointerResponse ?? 'none',
  ...wrapperSkeletonLines(lines, widths),
}));
useHost(
  () => element,
  registerSkeletonText,
  () => ({
    stylePolicy: stylePolicy ?? initial.policy,
    animations,
    preset,
    speed,
    pointerResponse,
    motion,
    lines,
    widths,
  }),
  () => ({ onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError }),
);
</script>

<dotquilt-skeleton-text
  bind:this={element}
  aria-hidden="true"
  {...attributes}
  {...wrapperPolicyAttributes(initial.policy)}
  data-dotquilt-surface=""
  motion="paused"
  speed={initial.speed}
  pointer-response={initial.pointerResponse}
  lines={initial.count}
  {mark}
  >{@html sheet(wrapperSkeletonTextStyles(), initial.policy, 'SkeletonText')}{@html markSheet(
    wrapperSkeletonTextMarkStyles,
    initial.policy,
    'SkeletonText',
    mark,
  )}<span data-dotquilt-wrapper-static aria-hidden="true"
    ><span data-dotquilt-static
      >{#each initial.widths as width, index (index)}<svg
          data-dotquilt-static-line=""
          width="{width * 100}%"
          height="14"
        ></svg>{/each}</span
    ></span
  ></dotquilt-skeleton-text
>
