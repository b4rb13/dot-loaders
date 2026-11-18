import { registerLoadingRegion } from '@dotquilt-internal/core/region';
import { registerSkeletonText } from '@dotquilt-internal/core/skeleton';

/** Enhance server-rendered markup; the application retains its content and request identity. */
export function summary(root: ParentNode) {
  // Deliver request-local policy before definition/connection installs shadow CSS.
  const regionHost = root.querySelector('dotquilt-region');
  const placeholder = root.querySelector('dotquilt-skeleton-text');
  if (regionHost)
    Reflect.set(regionHost, 'stylePolicy', {
      mode: 'external',
      href: '/styles/region.css',
    });
  if (placeholder)
    Reflect.set(placeholder, 'stylePolicy', {
      mode: 'external',
      href: '/styles/skeleton-text.css',
    });
  registerLoadingRegion();
  registerSkeletonText();
  const region = root.querySelector('dotquilt-region');
  const result = root.querySelector('[data-result]');
  if (!region || !result) throw new Error('Summary markup is required');
  return {
    region,
    begin(requestId: string, replace = false) {
      region.update({
        state: replace ? 'pending' : 'refreshing',
        cycle: requestId,
        timing: undefined,
      });
    },
    settle(requestId: string, value: string | number, immediate = false) {
      if (region.cycle !== requestId) return false;
      result.textContent = String(value);
      // Use immediate settlement for app-owned failure/cancellation outcomes.
      region.update({
        state: 'ready',
        cycle: requestId,
        timing: immediate ? { duration: 0 } : undefined,
      });
      return true;
    },
  };
}
