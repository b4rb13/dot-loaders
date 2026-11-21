<script lang="ts">
import type { Animations } from 'dotquilt';
import {
  type SkeletonBlock as NativeSkeletonBlock,
  registerSkeletonBlock,
  type SkeletonPreset,
} from 'dotquilt/skeleton';
import {
  wrapperPolicy,
  wrapperPolicyAttributes,
  wrapperSkeletonMarkStyles,
  wrapperSkeletonStyles,
} from 'dotquilt/wrapper';
import { untrack } from 'svelte';
import {
  type HostProps,
  type MarkProps,
  markSheet,
  sheet,
  useHost,
} from './host.svelte.js';

interface Props extends HostProps<NativeSkeletonBlock>, MarkProps {
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'skeleton'> | undefined;
  preset?: SkeletonPreset | undefined;
}
let {
  stylePolicy,
  motion,
  mark,
  speed,
  pointerResponse,
  animations,
  preset,
  onHandoffStart,
  onHandoffEnd,
  onHandoffCancel,
  onLoaderError,
  element = $bindable(),
  ...attributes
}: Props = $props();

// The first render's options; from then on everything goes through update().
const initial = untrack(() => ({
  policy: wrapperPolicy(stylePolicy),
  speed: speed ?? preset?.speed ?? 1,
  pointerResponse: pointerResponse ?? preset?.pointerResponse ?? 'none',
}));
useHost(
  () => element,
  registerSkeletonBlock,
  () => ({
    stylePolicy: stylePolicy ?? initial.policy,
    animations,
    preset,
    speed,
    pointerResponse,
    motion,
  }),
  () => ({ onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError }),
);
</script>

<dotquilt-skeleton-block
  bind:this={element}
  aria-hidden="true"
  {...attributes}
  {...wrapperPolicyAttributes(initial.policy)}
  data-dotquilt-surface=""
  motion="paused"
  speed={initial.speed}
  pointer-response={initial.pointerResponse}
  {mark}
  >{@html sheet(wrapperSkeletonStyles(), initial.policy, 'SkeletonBlock')}{@html markSheet(
    wrapperSkeletonMarkStyles,
    initial.policy,
    'SkeletonBlock',
    mark,
  )}<span data-dotquilt-wrapper-static aria-hidden="true"
    ><span data-dotquilt-static></span></span
  ></dotquilt-skeleton-block
>
