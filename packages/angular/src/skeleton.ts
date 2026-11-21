import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  input,
  ViewEncapsulation,
} from '@angular/core';
import type { Animations } from 'dotquilt';
import {
  type SkeletonBlock as NativeSkeletonBlock,
  type SkeletonCircle as NativeSkeletonCircle,
  type SkeletonLine as NativeSkeletonLine,
  type SkeletonText as NativeSkeletonText,
  registerSkeletonBlock,
  registerSkeletonCircle,
  registerSkeletonLine,
  registerSkeletonText,
  type SkeletonPreset,
} from 'dotquilt/skeleton';
import { wrapperSkeletonLines } from 'dotquilt/wrapper';
import { first, MarkLoader } from './host';
import {
  skeletonBlockCss,
  skeletonCircleCss,
  skeletonLineCss,
  skeletonTextCss,
} from './styles.generated';

/** The static drawing the server renders before the element is defined. */
const drawing =
  '<span data-dotquilt-wrapper-static aria-hidden="true"><span data-dotquilt-static></span></span>';

@Directive()
abstract class Shape<E extends HTMLElement> extends MarkLoader<E> {
  /** How fast the idle glow moves, up to 4. */
  readonly speed = input<number>();
  /** `lift` lights the marks around the pointer. */
  readonly pointerResponse = input<'none' | 'lift'>();
  readonly animations = input<Animations<'skeleton'>>();
  readonly preset = input<SkeletonPreset>();
  protected readonly initial = first(() => ({
    speed: this.speed() ?? this.preset()?.speed ?? 1,
    pointerResponse:
      this.pointerResponse() ?? this.preset()?.pointerResponse ?? 'none',
  }));
  protected options(): object {
    return {
      animations: this.animations(),
      preset: this.preset(),
      speed: this.speed(),
      pointerResponse: this.pointerResponse(),
    };
  }
}

/** A rectangle of marks for images, charts and other blocks. */
@Component({
  selector: 'dotquilt-skeleton-block',
  template: drawing,
  styles: [skeletonBlockCss],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    'data-dotquilt-surface': '',
    motion: 'paused',
    '[attr.speed]': 'initial().speed',
    '[attr.pointer-response]': 'initial().pointerResponse',
    '[attr.mark]': 'mark() ?? null',
    '[attr.nonce]': "policyAttribute('nonce')",
    '[attr.data-dotquilt-style-href]':
      "policyAttribute('data-dotquilt-style-href')",
  },
})
export class SkeletonBlock extends Shape<NativeSkeletonBlock> {
  constructor() {
    super();
    this.connect(registerSkeletonBlock, () => this.options());
  }
}

/** One line of text, drawn in marks. */
@Component({
  selector: 'dotquilt-skeleton-line',
  template: drawing,
  styles: [skeletonLineCss],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    'data-dotquilt-surface': '',
    motion: 'paused',
    '[attr.speed]': 'initial().speed',
    '[attr.pointer-response]': 'initial().pointerResponse',
    '[attr.mark]': 'mark() ?? null',
    '[attr.nonce]': "policyAttribute('nonce')",
    '[attr.data-dotquilt-style-href]':
      "policyAttribute('data-dotquilt-style-href')",
  },
})
export class SkeletonLine extends Shape<NativeSkeletonLine> {
  constructor() {
    super();
    this.connect(registerSkeletonLine, () => this.options());
  }
}

/** A circle of marks for avatars and icons. */
@Component({
  selector: 'dotquilt-skeleton-circle',
  template: drawing,
  styles: [skeletonCircleCss],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    'data-dotquilt-surface': '',
    motion: 'paused',
    '[attr.speed]': 'initial().speed',
    '[attr.pointer-response]': 'initial().pointerResponse',
    '[attr.mark]': 'mark() ?? null',
    '[attr.nonce]': "policyAttribute('nonce')",
    '[attr.data-dotquilt-style-href]':
      "policyAttribute('data-dotquilt-style-href')",
  },
})
export class SkeletonCircle extends Shape<NativeSkeletonCircle> {
  constructor() {
    super();
    this.connect(registerSkeletonCircle, () => this.options());
  }
}

/** A paragraph of lines, drawn in marks. */
@Component({
  selector: 'dotquilt-skeleton-text',
  template: `<span data-dotquilt-wrapper-static aria-hidden="true"
    ><span data-dotquilt-static
      >@for (width of lines().widths; track $index) {<svg
          data-dotquilt-static-line=""
          [attr.width]="width * 100 + '%'"
          height="14"
        ></svg>}</span
    ></span
  >`,
  styles: [skeletonTextCss],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    'data-dotquilt-surface': '',
    motion: 'paused',
    '[attr.speed]': 'initial().speed',
    '[attr.pointer-response]': 'initial().pointerResponse',
    '[attr.lines]': 'lines().count',
    '[attr.mark]': 'mark() ?? null',
    '[attr.nonce]': "policyAttribute('nonce')",
    '[attr.data-dotquilt-style-href]':
      "policyAttribute('data-dotquilt-style-href')",
  },
})
export class SkeletonText extends Shape<NativeSkeletonText> {
  /** How many lines, up to 50 (the `lines` input). */
  readonly lineCount = input<number | undefined>(undefined, { alias: 'lines' });
  /** Each line's length as a share of the width. */
  readonly widths = input<readonly number[]>();
  protected readonly lines = first(() =>
    wrapperSkeletonLines(this.lineCount(), this.widths()),
  );
  constructor() {
    super();
    this.connect(registerSkeletonText, () => ({
      ...this.options(),
      lines: this.lineCount(),
      widths: this.widths(),
    }));
  }
}
