// JSX names for the native hosts this adapter renders. A declaration file is
// never emitted by tsc, so this augmentation stays inside the package build and
// does not change the JSX namespace of applications that use the adapter.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type NativeHost = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  [attribute: string]: unknown;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dotquilt-region': NativeHost;
      'dotquilt-skeleton-block': NativeHost;
      'dotquilt-skeleton-line': NativeHost;
      'dotquilt-skeleton-circle': NativeHost;
      'dotquilt-skeleton-text': NativeHost;
      'dotquilt-typing-dots': NativeHost;
      'dotquilt-text-loader': NativeHost;
      'dotquilt-chart-loader': NativeHost;
      'dotquilt-table-loader': NativeHost;
    }
  }
}
