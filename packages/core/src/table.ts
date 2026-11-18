import type { Animations, Rect } from './animations.js';
import {
  DenseLoader,
  type PointerResponse,
  type Projector,
} from './internal/dense-loader.js';
import { register, upgradeProperties } from './internal/dom.js';
import type { Preset } from './internal/preset.js';
import { tablePreset } from './internal/preset.js';
import { capturePresetData } from './internal/preset-data.js';
import { defaultRows, defaultTypeOn } from './internal/table-definitions.js';
import { tableAppearance } from './internal/table-field.js';
import {
  staticTableSVG,
  tableCells,
  tableColumns,
  tableHeight,
  tableRows,
  tableStatic,
  tableStaticData,
} from './internal/table-model.js';
import {
  emptyTableInput,
  tableProjection,
} from './internal/table-projection.js';
import { tableStyles } from './table-styles.js';
import type { Motion, StylePolicy } from './types.js';
export type TableCellKind = 'text' | 'number' | 'badge' | 'date';
export interface TableColumn {
  readonly kind: TableCellKind;
  readonly width?: number;
}
export interface TableCell {
  readonly bounds: Rect;
  readonly text: string;
  readonly baseline: number;
  readonly tone: 'base' | 'accent';
  readonly rowId: string;
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly kind: TableCellKind;
  readonly glyphs: readonly import('./animations.js').GlyphCell[];
}
export interface TableInput {
  readonly kind: 'table';
  readonly cells: readonly TableCell[];
}
export type TableTargetGeometry =
  | TableInput
  | Readonly<{ kind: 'points'; points: readonly import('./chart.js').Point[] }>
  | Readonly<{ kind: 'rects'; rects: readonly Rect[] }>;
export type TableTargetProvider = (
  bounds: Readonly<{ width: number; height: number }>,
) => TableTargetGeometry | null;
export type TablePreset = import('./internal/preset.js').Preset<'table'>;

export class TableLoader extends DenseLoader<'table', TableTargetProvider> {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Private adapter capability; accessed through its versioned symbol from the separately compiled React package.
  private static [tableStatic] = tableStaticData;
  static override observedAttributes = [
    ...DenseLoader.observedAttributes,
    'rows',
    'row-height',
  ];
  protected readonly family = 'table';
  protected readonly styles = tableStyles;
  protected readonly appearanceKey = tableAppearance;
  protected readonly emptyInput = emptyTableInput;
  protected defaultIdle() {
    return defaultTypeOn;
  }
  protected defaultHandoff() {
    return defaultRows;
  }
  protected createSurface(document: Document): Node {
    return staticTableSVG(document, this.rows, this.rowHeight, this.columns);
  }
  protected projector(
    provider: TableTargetProvider | undefined,
  ): Projector<'table'> {
    return (bounds, report) => tableProjection(provider, bounds, report);
  }
  /** Before a handoff projects real cells, idle motion draws placeholder rows. */
  protected override surfaceInput(input: TableInput, width: number) {
    return input.cells.length
      ? input
      : tableCells(width, this.rows, this.rowHeight, this.columns);
  }
  protected override capturePreset(value: Preset<'table'>): Preset<'table'> {
    return capturePresetData(value, 'table', () => tablePreset);
  }
  protected override prepareConnection(): void {
    upgradeProperties(this, ['rows', 'rowHeight', 'columns']);
  }
  protected override settled(): void {
    this.clearSurface();
  }

  #columns: readonly TableColumn[] = tableColumns(undefined);
  get columns(): readonly TableColumn[] {
    return this.#columns;
  }
  set columns(value: readonly TableColumn[] | undefined) {
    this.#columns = tableColumns(value, (code) => this.report(code, 'columns'));
    this.refresh();
  }
  get rows(): number {
    return tableRows(
      Number(this.getAttribute('rows') ?? 5),
      this.#columns.length,
    );
  }
  set rows(value: number | undefined) {
    if (value === undefined) this.removeAttribute('rows');
    else this.setAttribute('rows', String(value));
  }
  get rowHeight(): number {
    return tableHeight(Number(this.getAttribute('row-height') ?? 32));
  }
  set rowHeight(value: number | undefined) {
    if (value === undefined) this.removeAttribute('row-height');
    else this.setAttribute('row-height', String(value));
  }

  override attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (
      value !== null &&
      ((name === 'rows' &&
        !(
          Number.isInteger(Number(value)) &&
          Number(value) > 0 &&
          Number(value) <=
            Math.min(100, Math.floor(1000 / this.#columns.length))
        )) ||
        (name === 'row-height' && tableHeight(Number(value)) !== Number(value)))
    )
      this.invalidOption(name);
    if (old !== value && (name === 'rows' || name === 'row-height')) {
      this.clearSurface();
      this.#updateStatic();
    }
    super.attributeChangedCallback(name, old, value);
  }
  override connectedCallback(): void {
    super.connectedCallback();
    // Text metrics change once web fonts arrive.
    this.listen(this.ownerDocument.fonts, 'loadingdone', () => {
      this.owner?.refresh();
      this.refresh();
    });
  }

  update(
    patch: Readonly<{
      rows?: number | undefined;
      rowHeight?: number | undefined;
      columns?: readonly TableColumn[] | undefined;
      speed?: number | undefined;
      pointerResponse?: PointerResponse | undefined;
      animations?: Animations<'table'> | undefined;
      preset?: TablePreset | undefined;
      targetProvider?: TableTargetProvider | undefined;
      motion?: Motion | undefined;
      stylePolicy?: StylePolicy | undefined;
    }>,
  ): void {
    this.applyOptions(patch);
  }
  protected override get optionNames(): readonly string[] {
    return [...super.optionNames, 'rows', 'rowHeight', 'columns'];
  }

  #updateStatic(): void {
    const old = this.shadowRoot?.querySelector('[data-table-static]');
    if (old)
      old.replaceWith(
        staticTableSVG(
          this.ownerDocument,
          this.rows,
          this.rowHeight,
          this.columns,
        ),
      );
  }
}
export function registerTableLoader(): void {
  register('dotquilt-table-loader', TableLoader);
}
export { refreshStyles } from './internal/element.js';
