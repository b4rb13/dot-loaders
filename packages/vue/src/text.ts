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
import {
  defineComponent,
  h,
  isVNode,
  type PropType,
  Text,
  type VNode,
} from 'vue';
import { hostProps, loaderEmits, markSheet, sheet, useHost } from './host.js';

/** The plain text of slot content, for the placeholder's first shape. */
function textOf(nodes: readonly unknown[] | undefined): string {
  let text = '';
  for (const node of nodes ?? []) {
    if (typeof node === 'string' || typeof node === 'number') text += node;
    else if (isVNode(node)) {
      if (node.type === Text) text += String(node.children ?? '');
      else if (Array.isArray(node.children))
        text += textOf(node.children as VNode[]);
      else if (typeof node.children === 'string') text += node.children;
    }
  }
  return text;
}

/**
 * A value in the making: characters in marks that lock into the real text.
 * The default slot is the value.
 */
export const TextLoader = /* @__PURE__ */ defineComponent({
  name: 'TextLoader',
  inheritAttrs: false,
  props: {
    ...hostProps,
    mark: String as PropType<'dot' | 'dash' | 'square'>,
    mask: String,
    state: {
      type: String as PropType<LoadingState>,
      default: 'ready',
    },
    cycle: String,
    delay: Number,
    minDisplay: Number,
    timing: Object as PropType<Timing>,
    speed: Number,
    pointerResponse: String as PropType<'none' | 'lift'>,
    animations: Object as PropType<Animations<'text'>>,
    preset: Object as PropType<TextPreset>,
  },
  emits: loaderEmits,
  setup(props, { attrs, emit, expose, slots }) {
    const policy = wrapperPolicy(props.stylePolicy);
    const state = props.state;
    const pending = state === 'pending';
    // Read on the first render, where slots belong.
    let mask: string | undefined;
    const host = useHost<NativeTextLoader>(
      registerTextLoader,
      () => ({
        state: props.state,
        cycle: props.cycle,
        delay: props.delay,
        minDisplay: props.minDisplay,
        timing: props.timing,
        speed: props.speed,
        pointerResponse: props.pointerResponse,
        animations: props.animations,
        preset: props.preset,
        mask: props.mask,
        motion: props.motion,
        stylePolicy: props.stylePolicy ?? policy,
      }),
      emit,
    );
    expose({ element: host });
    // Host and content attributes are the first render's only: from then on
    // the element owns them.
    return () => {
      const value = slots.default?.();
      if (mask === undefined) {
        const text = props.mask ?? textOf(value);
        mask = text.length <= 256 ? text : '';
      }
      return h(
        'dotquilt-text-loader',
        {
          ...attrs,
          ...wrapperPolicyAttributes(policy),
          role: attrs.role ?? 'group',
          state,
          mask,
          motion: 'paused',
          mark: props.mark,
          ref: host,
        },
        [
          sheet(wrapperTextStyles, policy, 'TextLoader'),
          markSheet(
            () => wrapperTextMarkStyles,
            policy,
            'TextLoader',
            props.mark,
          ),
          h(
            'span',
            {
              slot: 'placeholder',
              'data-dotquilt-text-placeholder': '',
              'aria-hidden': 'true',
              inert: '',
            },
            mask,
          ),
          h(
            'span',
            {
              'data-dotquilt-text-content': '',
              'aria-hidden': pending ? 'true' : undefined,
              inert: pending ? '' : undefined,
            },
            value,
          ),
        ],
      );
    };
  },
});
