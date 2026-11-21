import {
  type SkeletonCircle as NativeSkeletonCircle,
  type SkeletonLine as NativeSkeletonLine,
  type SkeletonText as NativeSkeletonText,
  registerSkeletonCircle,
  registerSkeletonLine,
  registerSkeletonText,
} from 'dotquilt/skeleton';
import {
  wrapperCircleMarkStyles,
  wrapperCircleStyles,
  wrapperLineMarkStyles,
  wrapperLineStyles,
  wrapperPolicy,
  wrapperPolicyAttributes,
  wrapperSkeletonLines,
  wrapperSkeletonTextMarkStyles,
  wrapperSkeletonTextStyles,
} from 'dotquilt/wrapper';
import { defineComponent, h, type PropType } from 'vue';
import {
  loaderEmits,
  markSheet,
  sheet,
  staticDrawing,
  useHost,
} from './host.js';
import { shape, shapeProps } from './shape.js';

/** One line of text, drawn in marks. */
export const SkeletonLine = /* @__PURE__ */ shape<NativeSkeletonLine>(
  'SkeletonLine',
  'dotquilt-skeleton-line',
  registerSkeletonLine,
  wrapperLineStyles,
  wrapperLineMarkStyles,
);
/** A circle of marks for avatars and icons. */
export const SkeletonCircle = /* @__PURE__ */ shape<NativeSkeletonCircle>(
  'SkeletonCircle',
  'dotquilt-skeleton-circle',
  registerSkeletonCircle,
  wrapperCircleStyles,
  wrapperCircleMarkStyles,
);

/** A paragraph of lines, drawn in marks. */
export const SkeletonText = /* @__PURE__ */ defineComponent({
  name: 'SkeletonText',
  inheritAttrs: false,
  props: {
    ...shapeProps,
    lines: Number,
    widths: Array as PropType<readonly number[]>,
  },
  emits: loaderEmits,
  setup(props, { attrs, emit, expose }) {
    const policy = wrapperPolicy(props.stylePolicy);
    const initial = {
      speed: props.speed ?? props.preset?.speed ?? 1,
      pointerResponse:
        props.pointerResponse ?? props.preset?.pointerResponse ?? 'none',
      ...wrapperSkeletonLines(props.lines, props.widths),
    };
    const host = useHost<NativeSkeletonText>(
      registerSkeletonText,
      () => ({
        stylePolicy: props.stylePolicy ?? policy,
        animations: props.animations,
        preset: props.preset,
        speed: props.speed,
        pointerResponse: props.pointerResponse,
        motion: props.motion,
        lines: props.lines,
        widths: props.widths,
      }),
      emit,
    );
    expose({ element: host });
    return () =>
      h(
        'dotquilt-skeleton-text',
        {
          ...attrs,
          ...wrapperPolicyAttributes(policy),
          'aria-hidden': attrs['aria-hidden'] ?? 'true',
          'data-dotquilt-surface': '',
          motion: 'paused',
          speed: initial.speed,
          'pointer-response': initial.pointerResponse,
          lines: initial.count,
          mark: props.mark,
          ref: host,
        },
        [
          sheet(wrapperSkeletonTextStyles(), policy, 'SkeletonText'),
          markSheet(
            wrapperSkeletonTextMarkStyles,
            policy,
            'SkeletonText',
            props.mark,
          ),
          staticDrawing(
            initial.widths.map((width) =>
              h('svg', {
                'data-dotquilt-static-line': '',
                width: `${width * 100}%`,
                height: 14,
              }),
            ),
          ),
        ],
      );
  },
});
