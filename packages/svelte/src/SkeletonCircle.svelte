<script lang="ts">
import type { Animations } from 'dotquilt';
import {
  type SkeletonCircle as NativeSkeletonCircle,
  registerSkeletonCircle,
  type SkeletonPreset,
} from 'dotquilt/skeleton';
import {
  wrapperCircleMarkStyles,
  wrapperCircleStyles,
  wrapperPolicy,
  wrapperPolicyAttributes,
} from 'dotquilt/wrapper';
import { untrack } from 'svelte';
import {
  type HostProps,
  type MarkProps,
  markSheet,
  sheet,
  useHost,
} from './host.svelte.js';

interface Props extends HostProps<NativeSkeletonCircle>, MarkProps {
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
  registerSkeletonCircle,
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

<dotquilt-skeleton-circle
  bind:this={element}
  aria-hidden="true"
  {...attributes}
  {...wrapperPolicyAttributes(initial.policy)}
  data-dotquilt-surface=""
  motion="paused"
  speed={initial.speed}
  pointer-response={initial.pointerResponse}
  {mark}
  >{@html sheet(wrapperCircleStyles(), initial.policy, 'SkeletonCircle')}{@html markSheet(
    wrapperCircleMarkStyles,
    initial.policy,
    'SkeletonCircle',
    mark,
  )}<span data-dotquilt-wrapper-static aria-hidden="true"
    ><span data-dotquilt-static></span></span
  ></dotquilt-skeleton-circle
>
