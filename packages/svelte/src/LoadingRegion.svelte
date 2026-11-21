<script lang="ts">
import type { Animations, LoadingState, RevealTarget, Timing } from 'dotquilt';
import {
  type LoadingRegion as NativeLoadingRegion,
  type RegionPreset,
  registerLoadingRegion,
} from 'dotquilt/region';
import {
  wrapperPolicy,
  wrapperPolicyAttributes,
  wrapperRegionStyles,
} from 'dotquilt/wrapper';
import { type Snippet, untrack } from 'svelte';
import { type HostProps, sheet, useHost } from './host.svelte.js';

interface Props extends Omit<HostProps<NativeLoadingRegion>, 'placeholder'> {
  /** Your content. */
  children?: Snippet | undefined;
  /** The loader shown while pending. */
  placeholder?: Snippet | undefined;
  /** Your own cue while refreshing, in place of the row of marks. */
  refreshIndicator?: Snippet | undefined;
  state?: LoadingState | undefined;
  cycle?: string | undefined;
  /** Milliseconds to wait before showing the placeholder. */
  delay?: number | undefined;
  /** Milliseconds a placeholder stays once shown. */
  minDisplay?: number | undefined;
  timing?: Timing | undefined;
  animations?: Pick<Animations<'region'>, 'handoff'> | undefined;
  preset?: RegionPreset | undefined;
  revealTargets?: readonly RevealTarget[] | undefined;
}
let {
  children,
  placeholder,
  refreshIndicator,
  stylePolicy,
  motion,
  state = 'ready',
  cycle,
  delay,
  minDisplay,
  timing,
  animations,
  preset,
  revealTargets,
  onHandoffStart,
  onHandoffEnd,
  onHandoffCancel,
  onLoaderError,
  element = $bindable(),
  ...attributes
}: Props = $props();

const initial = untrack(() => ({
  policy: wrapperPolicy(stylePolicy),
  state,
}));
useHost(
  () => element,
  registerLoadingRegion,
  () => ({
    state,
    cycle,
    delay,
    minDisplay,
    timing,
    animations,
    preset,
    revealTargets,
    motion,
    stylePolicy: stylePolicy ?? initial.policy,
  }),
  () => ({ onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError }),
);
</script>

<dotquilt-region
  bind:this={element}
  role="group"
  {...attributes}
  {...wrapperPolicyAttributes(initial.policy)}
  state={initial.state}
  data-presentation={initial.state}
  motion="paused"
  data-dotquilt-wrapper-empty={placeholder ? undefined : ''}
  >{@html sheet(wrapperRegionStyles, initial.policy, 'LoadingRegion')}{#if placeholder}<div
      slot="placeholder"
      data-dotquilt-wrapper-slot=""
      aria-hidden="true"
      inert
    >
      {@render placeholder()}
    </div>{/if}{#if refreshIndicator}<div
      slot="refresh-indicator"
      data-dotquilt-wrapper-slot=""
      aria-hidden="true"
      inert
    >
      {@render refreshIndicator()}
    </div>{/if}{@render children?.()}</dotquilt-region
>
