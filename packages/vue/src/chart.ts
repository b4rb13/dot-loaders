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
import { defineComponent, h, type PropType } from 'vue';
import {
  hostProps,
  loaderEmits,
  markSheet,
  sheet,
  staticDrawing,
  useHost,
} from './host.js';

/** A field of marks that takes the shape of a chart, then hands over to it. */
export const ChartLoader = /* @__PURE__ */ defineComponent({
  name: 'ChartLoader',
  inheritAttrs: false,
  props: {
    ...hostProps,
    mark: String as PropType<'dot' | 'dash' | 'square'>,
    variant: String as PropType<ChartVariant>,
    speed: Number,
    pointerResponse: String as PropType<'none' | 'lift'>,
    animations: Object as PropType<Animations<'chart'>>,
    preset: Object as PropType<ChartPreset>,
    targetProvider: Function as PropType<TargetProvider>,
  },
  emits: loaderEmits,
  setup(props, { attrs, emit, expose }) {
    const policy = wrapperPolicy(props.stylePolicy);
    const variant = props.variant ?? props.preset?.variant ?? 'line';
    const host = useHost<NativeChartLoader>(
      registerChartLoader,
      () => ({
        variant: props.variant,
        speed: props.speed,
        pointerResponse: props.pointerResponse,
        animations: props.animations,
        preset: props.preset,
        targetProvider: props.targetProvider,
        stylePolicy: props.stylePolicy ?? policy,
        motion: props.motion,
      }),
      emit,
    );
    expose({ element: host });
    return () =>
      h(
        'dotquilt-chart-loader',
        {
          ...attrs,
          ...wrapperPolicyAttributes(policy),
          'aria-hidden': 'true',
          'data-dotquilt-surface': '',
          motion: 'paused',
          variant,
          // As an attribute: clearing the property would set an empty, invalid mark.
          '^mark': props.mark,
          ref: host,
        },
        [
          sheet(wrapperChartStyles(), policy, 'ChartLoader'),
          markSheet(wrapperChartMarkStyles, policy, 'ChartLoader', props.mark),
          staticDrawing(),
        ],
      );
  },
});
