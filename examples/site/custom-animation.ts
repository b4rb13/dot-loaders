import {
  defineAnimation,
  definePreset,
} from '@dotquilt-internal/core/animations';
import type { SkeletonBlock } from '@dotquilt-internal/core/skeleton';

/**
 * An idle for skeletons: a slow tide of brighter marks rolling across each
 * shape. `frame` draws one moment; `still` draws the resting picture used for
 * reduced motion, a pause and server rendering.
 */
export const tide = defineAnimation({
  contractVersion: 1,
  id: 'example/tide',
  family: 'skeleton',
  phase: 'idle',
  options: {
    // Options are parsed once and frozen; reject or default anything odd here.
    parse: (value: Readonly<Partial<{ wavelength: number }>>) => ({
      wavelength: Math.max(40, value.wavelength ?? 120),
    }),
  },
  frame({ surface, frame, dot }, { wavelength }) {
    for (const shape of surface.input.shapes)
      for (let x = shape.x + 4.5; x < shape.x + shape.width; x += 9)
        for (let y = shape.y + 4.5; y < shape.y + shape.height; y += 9) {
          const wave = Math.sin((x - frame.timeMs / 12) / (wavelength / 6.28));
          dot({ x, y, size: 2.2, opacity: 0.37 + 0.2 * wave, tone: 'base' });
        }
  },
  still({ surface, dot }) {
    for (const shape of surface.input.shapes)
      for (let x = shape.x + 4.5; x < shape.x + shape.width; x += 9)
        for (let y = shape.y + 4.5; y < shape.y + shape.height; y += 9)
          dot({ x, y, size: 2.2, opacity: 0.37, tone: 'base' });
  },
});

/**
 * A handoff for regions: content rises 8 px while it fades in. `duration`
 * says how long it takes; `frame` is called with the progress, from 0 to 1.
 */
export const rise = defineAnimation({
  contractVersion: 1,
  id: 'example/rise',
  family: 'region',
  phase: 'handoff',
  options: {
    parse: (value: Readonly<Partial<{ distance: number }>>) => ({
      distance: value.distance ?? 8,
    }),
  },
  duration: () => 700,
  prepare: () => undefined,
  frame({ frame, reveal }, { distance }) {
    reveal({
      opacity: frame.progress,
      translateY: (1 - frame.progress) * distance,
    });
  },
});

/** A preset bundles options you reuse: here, a calmer skeleton. */
export const calm = definePreset({
  kind: 'skeleton',
  speed: 0.6,
  animations: { idle: tide({ wavelength: 200 }) },
});

const block = document.querySelector<SkeletonBlock>('dotquilt-skeleton-block');
if (block) block.preset = calm;
