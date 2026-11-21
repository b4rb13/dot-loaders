import {
  type SkeletonBlock as NativeSkeletonBlock,
  registerSkeletonBlock,
} from 'dotquilt/skeleton';
import {
  wrapperSkeletonMarkStyles,
  wrapperSkeletonStyles,
} from 'dotquilt/wrapper';
import { shape } from './shape.js';

/** A rectangle of marks for images, charts and other blocks. */
export const SkeletonBlock = /* @__PURE__ */ shape<NativeSkeletonBlock>(
  'SkeletonBlock',
  'dotquilt-skeleton-block',
  registerSkeletonBlock,
  wrapperSkeletonStyles,
  wrapperSkeletonMarkStyles,
);
export {
  SkeletonCircle,
  SkeletonLine,
  SkeletonText,
} from './skeleton-shapes.js';
