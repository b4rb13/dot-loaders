import type { Animations, LoadingState, RevealTarget, Timing } from 'dotquilt';
import {
  type LoadingRegion as NativeLoadingRegion,
  type RegionPreset,
  registerLoadingRegion,
} from 'dotquilt/region';
import {
  wrapperEmpty,
  wrapperPolicy,
  wrapperPolicyAttributes,
  wrapperRegionStyles,
  wrapperSlot,
} from 'dotquilt/wrapper';
import { defineComponent, h, type PropType, type VNode } from 'vue';
import { hostProps, loaderEmits, sheet, useHost } from './host.js';

/**
 * Wraps content that loads: shows the `placeholder` slot while pending,
 * keeps the content inert and hidden from assistive technology, then hands
 * over to it. The default slot is your content; `refresh-indicator` is an
 * optional cue while refreshing.
 */
export const LoadingRegion = /* @__PURE__ */ defineComponent({
  name: 'LoadingRegion',
  inheritAttrs: false,
  props: {
    ...hostProps,
    state: {
      type: String as PropType<LoadingState>,
      default: 'ready',
    },
    cycle: String,
    /** Milliseconds to wait before showing the placeholder. */
    delay: Number,
    /** Milliseconds a placeholder stays once shown. */
    minDisplay: Number,
    timing: Object as PropType<Timing>,
    animations: Object as PropType<Pick<Animations<'region'>, 'handoff'>>,
    preset: Object as PropType<RegionPreset>,
    revealTargets: Array as PropType<readonly RevealTarget[]>,
  },
  emits: loaderEmits,
  setup(props, { attrs, emit, expose, slots }) {
    const policy = wrapperPolicy(props.stylePolicy);
    const initialState = props.state;
    const host = useHost<NativeLoadingRegion>(
      registerLoadingRegion,
      () => ({
        state: props.state,
        cycle: props.cycle,
        delay: props.delay,
        minDisplay: props.minDisplay,
        timing: props.timing,
        animations: props.animations,
        preset: props.preset,
        revealTargets: props.revealTargets,
        motion: props.motion,
        stylePolicy: props.stylePolicy ?? policy,
      }),
      emit,
    );
    expose({ element: host });
    const slot = (name: string, content: VNode[]) =>
      h(
        'div',
        { slot: name, [wrapperSlot]: '', 'aria-hidden': 'true', inert: '' },
        content,
      );
    return () => {
      const placeholder = slots.placeholder?.() ?? [];
      const refresh = slots['refresh-indicator']?.();
      return h(
        'dotquilt-region',
        {
          ...attrs,
          ...wrapperPolicyAttributes(policy),
          role: attrs.role ?? 'group',
          state: initialState,
          'data-presentation': initialState,
          motion: 'paused',
          [wrapperEmpty]: placeholder.length ? undefined : '',
          ref: host,
        },
        [
          sheet(wrapperRegionStyles, policy, 'LoadingRegion'),
          placeholder.length ? slot('placeholder', placeholder) : null,
          refresh ? slot('refresh-indicator', refresh) : null,
          slots.default?.(),
        ],
      );
    };
  },
});
