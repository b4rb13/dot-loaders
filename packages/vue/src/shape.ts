import type { Animations } from 'dotquilt';
import type { SkeletonPreset } from 'dotquilt/skeleton';
import { wrapperPolicy, wrapperPolicyAttributes } from 'dotquilt/wrapper';
import { defineComponent, h, type PropType } from 'vue';
import {
  type Host,
  hostProps,
  loaderEmits,
  markSheet,
  sheet,
  staticDrawing,
  useHost,
} from './host.js';

export const shapeProps = {
  ...hostProps,
  mark: String as PropType<'dot' | 'dash' | 'square'>,
  speed: Number,
  pointerResponse: String as PropType<'none' | 'lift'>,
  animations: Object as PropType<Animations<'skeleton'>>,
  preset: Object as PropType<SkeletonPreset>,
};

export function shape<E extends Host>(
  name: string,
  tag: string,
  register: () => void,
  css: () => readonly string[],
  markCss: () => readonly string[],
) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: shapeProps,
    emits: loaderEmits,
    setup(props, { attrs, emit, expose }) {
      const policy = wrapperPolicy(props.stylePolicy);
      const initial = {
        speed: props.speed ?? props.preset?.speed ?? 1,
        pointerResponse:
          props.pointerResponse ?? props.preset?.pointerResponse ?? 'none',
      };
      const host = useHost<E>(
        register,
        () => ({
          stylePolicy: props.stylePolicy ?? policy,
          animations: props.animations,
          preset: props.preset,
          speed: props.speed,
          pointerResponse: props.pointerResponse,
          motion: props.motion,
        }),
        emit,
      );
      expose({ element: host });
      return () =>
        h(
          tag,
          {
            ...attrs,
            ...wrapperPolicyAttributes(policy),
            'aria-hidden': attrs['aria-hidden'] ?? 'true',
            'data-dotquilt-surface': '',
            motion: 'paused',
            speed: initial.speed,
            'pointer-response': initial.pointerResponse,
            // As an attribute: clearing the property would set an empty, invalid mark.
            '^mark': props.mark,
            ref: host,
          },
          [
            sheet(css(), policy, name),
            markSheet(markCss, policy, name, props.mark),
            staticDrawing(),
          ],
        );
    },
  });
}
