import type { Animations } from 'dotquilt';
import {
  type TableLoader as NativeTableLoader,
  registerTableLoader,
  type TableColumn,
  type TablePreset,
  type TableTargetProvider,
} from 'dotquilt/table';
import {
  staticTableLayout,
  wrapperPolicy,
  wrapperPolicyAttributes,
  wrapperStatic,
  wrapperTableStyles,
} from 'dotquilt/wrapper';
import { defineComponent, h, type PropType } from 'vue';
import { hostProps, loaderEmits, sheet, useHost } from './host.js';

/** Rows of marks shaped like your columns. */
export const TableLoader = /* @__PURE__ */ defineComponent({
  name: 'TableLoader',
  inheritAttrs: false,
  props: {
    ...hostProps,
    mark: String as PropType<'dot' | 'dash' | 'square'>,
    rows: Number,
    rowHeight: Number,
    columns: Array as PropType<readonly TableColumn[]>,
    speed: Number,
    pointerResponse: String as PropType<'none' | 'lift'>,
    animations: Object as PropType<Animations<'table'>>,
    preset: Object as PropType<TablePreset>,
    targetProvider: Function as PropType<TableTargetProvider>,
  },
  emits: loaderEmits,
  setup(props, { attrs, emit, expose }) {
    const policy = wrapperPolicy(props.stylePolicy);
    // The static outline is drawn once, from the first options; the element
    // redraws in its shadow root once defined.
    const layout = staticTableLayout(
      props.rows,
      props.rowHeight,
      props.columns,
    );
    const height = layout.rows * layout.rowHeight;
    const host = useHost<NativeTableLoader>(
      registerTableLoader,
      () => ({
        rows: props.rows,
        rowHeight: props.rowHeight,
        columns: props.columns,
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
        'dotquilt-table-loader',
        {
          ...attrs,
          ...wrapperPolicyAttributes(policy),
          'aria-hidden': 'true',
          'data-dotquilt-surface': '',
          motion: 'paused',
          rows: layout.rows,
          'row-height': layout.rowHeight,
          // As an attribute: clearing the property would set an empty, invalid mark.
          '^mark': props.mark,
          ref: host,
        },
        [
          sheet(wrapperTableStyles, policy, 'TableLoader'),
          h('span', { [wrapperStatic]: '', 'aria-hidden': 'true' }, [
            h(
              'svg',
              {
                'data-dotquilt-static': '',
                width: '100%',
                height,
                viewBox: `0 0 100 ${height}`,
                preserveAspectRatio: 'none',
                fill: 'none',
                stroke: 'currentColor',
                opacity: 0.25,
              },
              layout.parts.map((part) => h('path', { ...part })),
            ),
          ]),
        ],
      );
  },
});
