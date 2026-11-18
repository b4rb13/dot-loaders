import {
  registerChartLoader,
  registerLoadingRegion,
  registerSkeletonBlock,
  registerSkeletonCircle,
  registerSkeletonLine,
  registerSkeletonText,
  registerTableLoader,
  registerTextLoader,
  registerTypingDots,
} from '@dotquilt-internal/core';

registerSkeletonBlock();
registerLoadingRegion();

registerSkeletonLine();
registerSkeletonCircle();
registerSkeletonText();
registerTypingDots();
registerTextLoader();
registerChartLoader();
registerTableLoader();
