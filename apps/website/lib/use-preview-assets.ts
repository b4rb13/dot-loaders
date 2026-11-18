'use client';
import { useEffect, useState } from 'react';
import { checkPreviewStyles, type PreviewComponent } from './preview-assets';

export function usePreviewAssets(component: PreviewComponent) {
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'failed' | 'unsupported'
  >('loading');
  useEffect(() => {
    if (
      [
        window.ResizeObserver,
        window.IntersectionObserver,
        window.MutationObserver,
      ].some((api) => typeof api !== 'function')
    ) {
      setStatus('unsupported');
      return;
    }
    let active = true;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 4000);
    void checkPreviewStyles(component, controller.signal)
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('failed');
      })
      .finally(() => {
        clearTimeout(deadline);
        controller.abort();
      });
    return () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [component]);
  return status;
}
