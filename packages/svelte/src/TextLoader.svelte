<script lang="ts">
import type { Animations, LoadingState, Timing } from 'dotquilt';
import {
  type TextLoader as NativeTextLoader,
  registerTextLoader,
  type TextPreset,
} from 'dotquilt/text';
import {
  wrapperPolicy,
  wrapperPolicyAttributes,
  wrapperTextMarkStyles,
  wrapperTextStyles,
} from 'dotquilt/wrapper';
import { type Snippet, untrack } from 'svelte';
import {
  type HostProps,
  type MarkProps,
  markSheet,
  sheet,
  useHost,
} from './host.svelte.js';

interface Props extends HostProps<NativeTextLoader>, MarkProps {
  /** The value; it can be empty while pending. */
  children?: Snippet | undefined;
  /**
   * The shape the placeholder shows, such as `$00,000`. Pass it for a
   * placeholder in the server HTML: a snippet's text isn't known until it
   * renders.
   */
  mask?: string | undefined;
  state?: LoadingState | undefined;
  cycle?: string | undefined;
  /** Milliseconds to wait before showing the placeholder. */
  delay?: number | undefined;
  /** Milliseconds a placeholder stays once shown. */
  minDisplay?: number | undefined;
  timing?: Timing | undefined;
  speed?: number | undefined;
  pointerResponse?: 'none' | 'lift' | undefined;
  animations?: Animations<'text'> | undefined;
  preset?: TextPreset | undefined;
}
let {
  children,
  stylePolicy,
  motion,
  mark,
  mask,
  state = 'ready',
  cycle,
  delay,
  minDisplay,
  timing,
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

// Host and content attributes are the first render's only: from then on
// the element owns them.
const initial = untrack(() => ({
  policy: wrapperPolicy(stylePolicy),
  state,
  mask: (mask ?? '').length <= 256 ? (mask ?? '') : '',
  pending: state === 'pending',
}));
useHost(
  () => element,
  registerTextLoader,
  () => ({
    state,
    cycle,
    delay,
    minDisplay,
    timing,
    speed,
    pointerResponse,
    animations,
    preset,
    mask,
    motion,
    stylePolicy: stylePolicy ?? initial.policy,
  }),
  () => ({ onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError }),
);
</script>

<dotquilt-text-loader
  bind:this={element}
  role="group"
  {...attributes}
  {...wrapperPolicyAttributes(initial.policy)}
  state={initial.state}
  mask={initial.mask}
  motion="paused"
  {mark}
  >{@html sheet(wrapperTextStyles(), initial.policy, 'TextLoader')}{@html markSheet(
    wrapperTextMarkStyles,
    initial.policy,
    'TextLoader',
    mark,
  )}<span
    slot="placeholder"
    data-dotquilt-text-placeholder=""
    aria-hidden="true"
    inert>{initial.mask}</span
  ><span
    data-dotquilt-text-content=""
    aria-hidden={initial.pending ? 'true' : undefined}
    inert={initial.pending}>{@render children?.()}</span
  ></dotquilt-text-loader
>
