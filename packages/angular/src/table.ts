import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';
import type { Animations } from 'dotquilt';
import {
  type TableLoader as NativeTableLoader,
  registerTableLoader,
  type TableColumn,
  type TablePreset,
  type TableTargetProvider,
} from 'dotquilt/table';
import { staticTableLayout } from 'dotquilt/wrapper';
import { first, MarkLoader } from './host';
import { tableCss } from './styles.generated';

/** Rows of marks shaped like your columns. */
@Component({
  selector: 'dotquilt-table-loader',
  template: `<span data-dotquilt-wrapper-static aria-hidden="true"
    ><svg
      data-dotquilt-static=""
      width="100%"
      [attr.height]="initial().height"
      [attr.viewBox]="'0 0 100 ' + initial().height"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      opacity="0.25"
    >
      @for (part of initial().layout.parts; track $index) {
        <svg:path
          [attr.d]="part['d']"
          [attr.stroke-width]="part['stroke-width'] ?? null"
          [attr.stroke-dasharray]="part['stroke-dasharray'] ?? null"
        />
      }
    </svg></span
  >`,
  styles: [tableCss],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    'data-dotquilt-surface': '',
    motion: 'paused',
    '[attr.rows]': 'initial().layout.rows',
    '[attr.row-height]': 'initial().layout.rowHeight',
    '[attr.mark]': 'mark() ?? null',
    '[attr.nonce]': "policyAttribute('nonce')",
    '[attr.data-dotquilt-style-href]':
      "policyAttribute('data-dotquilt-style-href')",
  },
})
export class TableLoader extends MarkLoader<NativeTableLoader> {
  /** How many rows to show, up to 100. */
  readonly rows = input<number>();
  /** Row height in pixels. */
  readonly rowHeight = input<number>();
  /** What each column holds and its share of the width. */
  readonly columns = input<readonly TableColumn[]>();
  /** How fast the glow moves, up to 4. */
  readonly speed = input<number>();
  readonly pointerResponse = input<'none' | 'lift'>();
  readonly animations = input<Animations<'table'>>();
  readonly preset = input<TablePreset>();
  /** Where the real cells are, for the `rows` handoff. */
  readonly targetProvider = input<TableTargetProvider>();
  // The static outline is drawn once, from the first options; the element
  // redraws in its shadow root once defined.
  protected readonly initial = first(() => {
    const layout = staticTableLayout(
      this.rows(),
      this.rowHeight(),
      this.columns(),
    );
    return { layout, height: layout.rows * layout.rowHeight };
  });
  constructor() {
    super();
    this.connect(registerTableLoader, () => ({
      rows: this.rows(),
      rowHeight: this.rowHeight(),
      columns: this.columns(),
      speed: this.speed(),
      pointerResponse: this.pointerResponse(),
      animations: this.animations(),
      preset: this.preset(),
      targetProvider: this.targetProvider(),
    }));
  }
}
