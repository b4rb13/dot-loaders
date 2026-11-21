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
import { defineComponent, h, type PropType } from 'vue';
import {
  hostProps,
  loaderEmits,
  markSheet,
  sheet,
  staticDrawing,
  useHost,
} from './host.js';

/** A row of dots in a slow wave, for a reply being written. */
export const TypingDots = /* @__PURE__ */ defineComponent({
  name: 'TypingDots',
  inheritAttrs: false,
  props: {
    ...hostProps,
    mark: String as PropType<'dot' | 'dash' | 'square'>,
    count: Number,
    speed: Number,
    preset: Object as PropType<TypingPreset>,
  },
  emits: loaderEmits,
  setup(props, { attrs, emit, expose }) {
    const policy = wrapperPolicy(props.stylePolicy);
    const count = props.count ?? props.preset?.count ?? 3;
    const initial = {
      count: Number.isInteger(count) && count > 0 ? Math.min(count, 8) : 3,
      speed: props.speed ?? props.preset?.speed ?? 1,
    };
    const host = useHost<NativeTypingDots>(
      registerTypingDots,
      () => ({
        count: props.count,
        speed: props.speed,
        preset: props.preset,
        motion: props.motion,
        stylePolicy: props.stylePolicy ?? policy,
      }),
      emit,
    );
    expose({ element: host });
    return () =>
      h(
        'dotquilt-typing-dots',
        {
          ...attrs,
          ...wrapperPolicyAttributes(policy),
          'aria-hidden': attrs['aria-hidden'] ?? 'true',
          'data-dotquilt-surface': '',
          count: initial.count,
          speed: initial.speed,
          motion: 'paused',
          // As an attribute: clearing the property would set an empty, invalid mark.
          '^mark': props.mark,
          ref: host,
        },
        [
          sheet(wrapperTypingStyles(), policy, 'TypingDots'),
          markSheet(wrapperTypingMarkStyles, policy, 'TypingDots', props.mark),
          staticDrawing(
            Array.from({ length: initial.count }, () =>
              h('i', { class: 'dot' }),
            ),
          ),
        ],
      );
  },
});
