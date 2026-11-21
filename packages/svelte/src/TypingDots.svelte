<script lang="ts">
import {
  type TypingDots as NativeTypingDots,
  registerTypingDots,
  type TypingPreset,
} from 'dotquilt/typing';
import {
  wrapperPolicy,
  wrapperPolicyAttributes,
  wrapperTypingMarkStyles,
  wrapperTypingStyles,
} from 'dotquilt/wrapper';
import { untrack } from 'svelte';
import {
  type HostProps,
  type MarkProps,
  markSheet,
  sheet,
  useHost,
} from './host.svelte.js';

interface Props extends HostProps<NativeTypingDots>, MarkProps {
  /** How many dots, up to 8. */
  count?: number | undefined;
  speed?: number | undefined;
  preset?: TypingPreset | undefined;
}
let {
  stylePolicy,
  motion,
  mark,
  count,
  speed,
  preset,
  onHandoffStart,
  onHandoffEnd,
  onHandoffCancel,
  onLoaderError,
  element = $bindable(),
  ...attributes
}: Props = $props();

const initial = untrack(() => {
  const dots = count ?? preset?.count ?? 3;
  return {
    policy: wrapperPolicy(stylePolicy),
    count: Number.isInteger(dots) && dots > 0 ? Math.min(dots, 8) : 3,
    speed: speed ?? preset?.speed ?? 1,
  };
});
useHost(
  () => element,
  registerTypingDots,
  () => ({
    count,
    speed,
    preset,
    motion,
    stylePolicy: stylePolicy ?? initial.policy,
  }),
  () => ({ onHandoffStart, onHandoffEnd, onHandoffCancel, onLoaderError }),
);
</script>

<dotquilt-typing-dots
  bind:this={element}
  aria-hidden="true"
  {...attributes}
  {...wrapperPolicyAttributes(initial.policy)}
  data-dotquilt-surface=""
  count={initial.count}
  speed={initial.speed}
  motion="paused"
  {mark}
  >{@html sheet(wrapperTypingStyles(), initial.policy, 'TypingDots')}{@html markSheet(
    wrapperTypingMarkStyles,
    initial.policy,
    'TypingDots',
    mark,
  )}<span data-dotquilt-wrapper-static aria-hidden="true"
    ><span data-dotquilt-static
      >{#each { length: initial.count }, index (index)}<i class="dot"></i>{/each}</span
    ></span
  ></dotquilt-typing-dots
>
