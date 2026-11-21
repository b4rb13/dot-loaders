<script lang="ts">
import type { Animations } from 'dotquilt';
import {
  type ChartPreset,
  type ChartVariant,
  type ChartLoader as NativeChartLoader,
  registerChartLoader,
  type TargetProvider,
} from 'dotquilt/chart';
import {
  wrapperChartMarkStyles,
  wrapperChartStyles,
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

interface Props extends HostProps<NativeChartLoader>, MarkProps {
  /** The kind of chart it stands in for. */
  variant?: ChartVariant | undefined;
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'chart'> | undefined;
  preset?: ChartPreset | undefined;
  /** Where the real chart is, for the handoff. */
  targetProvider?: TargetProvider | undefined;
}
let {
  stylePolicy,
  motion,
  mark,
  variant,
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

const initial = untrack(() => ({
  policy: wrapperPolicy(stylePolicy),
  variant: variant ?? preset?.variant ?? 'line',
}));
useHost(
  () => element,
  registerChartLoader,
  () => ({
    variant,
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

<dotquilt-chart-loader
  bind:this={element}
  {...attributes}
  {...wrapperPolicyAttributes(initial.policy)}
  aria-hidden="true"
  data-dotquilt-surface=""
  motion="paused"
  variant={initial.variant}
  {mark}
  >{@html sheet(wrapperChartStyles(), initial.policy, 'ChartLoader')}{@html markSheet(
    wrapperChartMarkStyles,
    initial.policy,
    'ChartLoader',
    mark,
  )}<span data-dotquilt-wrapper-static aria-hidden="true"
    ><span data-dotquilt-static></span></span
  ></dotquilt-chart-loader
>
