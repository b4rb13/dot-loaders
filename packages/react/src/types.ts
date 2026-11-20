import type {
  HandoffDetail,
  LoaderErrorDetail,
  Mark,
  Motion,
  StylePolicy,
} from 'dotquilt';
import type { CSSProperties, HTMLAttributes } from 'react';
export interface DotquiltStyle extends CSSProperties {
  '--dotquilt-color'?: string | undefined;
  '--dotquilt-accent-color'?: string | undefined;
  '--dotquilt-dot-size'?: string | undefined;
  '--dotquilt-dot-gap'?: string | undefined;
  '--dotquilt-radius'?: string | undefined;
}
export interface LoaderEvents {
  onHandoffStart?: ((event: CustomEvent<HandoffDetail>) => void) | undefined;
  onHandoffEnd?: ((event: CustomEvent<HandoffDetail>) => void) | undefined;
  onHandoffCancel?: ((event: CustomEvent<HandoffDetail>) => void) | undefined;
  onLoaderError?: ((event: CustomEvent<LoaderErrorDetail>) => void) | undefined;
}
export interface HostProps<E extends HTMLElement>
  extends Omit<
      HTMLAttributes<E>,
      'style' | 'children' | 'dangerouslySetInnerHTML'
    >,
    LoaderEvents {
  style?: DotquiltStyle | undefined;
  stylePolicy?: StylePolicy | undefined;
  motion?: Motion | undefined;
  /** The shape the loader draws (design/SPEC.md); passed as the `mark` attribute. */
  mark?: Mark | undefined;
}
export type {
  HandoffDetail,
  LoaderErrorDetail,
  LoadingState,
  Mark,
  Motion,
  StylePolicy,
  Timing,
} from 'dotquilt';
