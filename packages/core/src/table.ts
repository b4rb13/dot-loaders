import type { AnimationSurface, Animations, Dot, Rect } from './animations.js';
import { definitionOf, validateBindings } from './internal/binding.js';
import {
  chartHandoff as denseHandoff,
  type RichParticipant,
} from './internal/chart-participant.js';
import { contentBox } from './internal/content-box.js';
import { coordinatedHandoff } from './internal/coordinated-handoff.js';
import {
  installDensePainter,
  invalidateDensePainter,
} from './internal/dense/managed-painter.js';
import { EventElement } from './internal/event-element.js';
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
  emptyTableInput as emptyInput,
  tableProjection,
} from './internal/table-projection.js';
import { tableStyles } from './table-styles.js';

const empty: readonly Dot[] = /* @__PURE__ */ Object.freeze([]);

import {
  ancestors,
  installStyles,
  motionRestricted,
  register,
  upgradeProperties,
} from './internal/dom.js';
import { type Activity, ManagedElement } from './internal/element.js';
import type { LoadingController } from './internal/loading-controller.js';
import { pointer } from './internal/painter.js';
import type { Runner } from './internal/runner.js';
import { readSurface } from './internal/surface.js';
import type { LoadingRegion } from './region.js';
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
interface Owner extends HTMLElement {
  activity: Activity;
  state: string;
  presentation: string;
  refresh(): void;
}
export class TableLoader extends EventElement<'table'> {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Private adapter capability; accessed through its versioned symbol from the separately compiled React package.
  private static [tableStatic] = tableStaticData;
  protected override upgrade(): void {
    upgradeProperties(this, [
      'stylePolicy',
      'preset',
      'animations',
      'motion',
      'speed',
      'pointerResponse',
      'targetProvider',
    ]);
  }
  protected override capturePreset(value: Preset<'table'>): Preset<'table'> {
    return capturePresetData(value, 'table', () => tablePreset);
  }
  static override observedAttributes = [
    ...ManagedElement.observedAttributes,
    'rows',
    'row-height',
    'speed',
    'pointer-response',
  ];
  #bindings: Animations<'table'> = {};
  #provider: TableTargetProvider | undefined;
  #runner: Runner | undefined;
  #source: readonly Dot[] = empty;
  #input: TableInput = emptyInput;
  #geometry: AnimationSurface<'table'> | undefined;
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
  get speed(): number {
    const n = Number(this.getAttribute('speed') ?? this.preset?.speed ?? 1);
    return Number.isFinite(n) && n > 0 ? Math.min(4, n) : 1;
  }
  set speed(value: number | undefined) {
    if (value === undefined) this.removeAttribute('speed');
    else this.setAttribute('speed', String(value));
  }
  get pointerResponse(): 'none' | 'lift' {
    return (this.getAttribute('pointer-response') ??
      this.preset?.pointerResponse) === 'lift'
      ? 'lift'
      : 'none';
  }
  set pointerResponse(value: 'none' | 'lift' | undefined) {
    if (value === undefined) this.removeAttribute('pointer-response');
    else this.setAttribute('pointer-response', value);
  }
  get animations(): Animations<'table'> {
    return this.#bindings;
  }
  set animations(value: Animations<'table'> | undefined) {
    try {
      validateBindings(value, 'table');
      this.#bindings = Object.freeze({ ...value });
      this.#runner?.reset?.();
    } catch {
      this.#bindings = {};
      this.report('invalid-binding', 'animations');
    }
    this.requestRender();
  }
  protected override presetChanged(): void {
    this.#runner?.reset?.();
  }
  get targetProvider(): TableTargetProvider | undefined {
    return this.#provider;
  }
  set targetProvider(value: TableTargetProvider | undefined) {
    this.#provider = typeof value === 'function' ? value : undefined;
    if (value !== undefined && !this.#provider)
      this.report('invalid-provider', 'targetProvider');
  }
  get owner(): Owner | undefined {
    const owner = ancestors(this).find(
      (e) => e.localName === 'dotquilt-region',
    ) as Owner | undefined;
    if (!owner) return undefined;
    let top: Element = this;
    while (top.parentElement && top.parentElement !== owner)
      top = top.parentElement;
    return top.getAttribute('slot') === 'placeholder' ? owner : undefined;
  }
  get activity(): Activity {
    return this.owner?.activity ?? this.ownActivity;
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
        (name === 'row-height' &&
          tableHeight(Number(value)) !== Number(value)) ||
        (name === 'pointer-response' && !['none', 'lift'].includes(value)) ||
        (name === 'speed' &&
          !(Number.isFinite(Number(value)) && Number(value) > 0)))
    )
      this.report('invalid-option', name);
    if (old !== value && (name === 'rows' || name === 'row-height')) {
      this.#clear();
      this.#updateStatic();
    }
    super.attributeChangedCallback(name, old, value);
  }
  override connectedCallback(): void {
    installDensePainter(this);
    upgradeProperties(this, ['rows', 'rowHeight', 'columns']);
    super.connectedCallback();
    this.setAttribute('data-dotquilt-surface', '');
    this.setAttribute('aria-hidden', 'true');
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      installStyles(root, tableStyles, this.policy);
      root.append(
        staticTableSVG(
          this.ownerDocument,
          this.rows,
          this.rowHeight,
          this.columns,
        ),
      );
    }
    for (const child of this.querySelectorAll(
      ':scope > [data-dotquilt-style],:scope > [data-dotquilt-static]',
    ))
      child.remove();
    this.listen(this.shadowRoot, 'load', () => this.refresh(), true);
    this.listen(this.ownerDocument.fonts, 'loadingdone', () => {
      this.owner?.refresh();
      this.refresh();
    });
    const pointerHost = this.owner ?? this;
    this.listen(pointerHost, 'pointermove', this.#pointer as EventListener);
    this.listen(pointerHost, 'pointerleave', this.#clearPointer);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#runner?.dispose();
    this.#provider = undefined;
    this.#clearPointer();
    this.#clear();
  }
  update(
    patch: Readonly<{
      rows?: number | undefined;
      rowHeight?: number | undefined;
      columns?: readonly TableColumn[] | undefined;
      speed?: number | undefined;
      pointerResponse?: 'none' | 'lift' | undefined;
      animations?: Animations<'table'> | undefined;
      preset?: TablePreset | undefined;
      targetProvider?: TableTargetProvider | undefined;
      motion?: Motion | undefined;
      stylePolicy?: StylePolicy | undefined;
    }>,
  ): void {
    for (const [key, value] of Object.entries(patch))
      Reflect.set(this, key, value);
  }
  refresh(): void {
    invalidateDensePainter(this);
    this.#runner?.reset?.();
    this.#clear();
    this.resources?.eligible(true);
    this.requestRender();
  }
  [readSurface](
    _family: 'table',
    ids: readonly string[] = [],
  ): AnimationSurface<'table'> {
    if (!this.#geometry) {
      const { width, height } = contentBox(this);
      // Let CSS resolve lengths/calc once per invalidation, never per frame.
      const field = this.shadowRoot?.querySelector('.surface');
      const resolved =
        field && this.ownerDocument.defaultView?.getComputedStyle(field);
      const pitch = parseFloat(resolved?.backgroundSize ?? '') || 6,
        gap = parseFloat(resolved?.gap ?? ''),
        size = Math.max(0, pitch - (gap >= 0 ? gap : 4));
      this.#geometry = Object.freeze({
        family: 'table',
        width,
        height,
        input: this.#input.cells.length
          ? this.#input
          : tableCells(width, this.rows, this.rowHeight, this.columns),
        source: this.#source,
        revealTargetIds: Object.freeze([...ids]),
        [tableAppearance]: Object.freeze({
          pitch: Math.max(2, Math.min(64, pitch)),
          scale: Math.max(0.1, Math.min(8, size / 2)),
        }),
      });
    }
    return this.#geometry;
  }
  [denseHandoff](
    owner: LoadingRegion,
    participants?: readonly RichParticipant[],
  ): ReturnType<LoadingController['handoffSource']> {
    if (participants && participants.length > 1)
      return coordinatedHandoff(
        owner,
        participants.map((child) => child[denseHandoff](owner)),
      );
    this.#clearPointer();
    const binding =
      this.#bindings.handoff ?? this.preset?.animations?.handoff ?? defaultRows;
    const provider = this.#provider,
      easing = owner.timing.easing;
    return [
      binding,
      this,
      binding.id,
      (
        selected,
        host,
        content,
        targets,
        duration,
        current,
        own,
        report,
        scope,
      ) => {
        const bounds = Object.freeze(contentBox(this));
        this.#input = tableProjection(provider, bounds, report);
        this.#source = this.#runner?.capture?.() ?? empty;
        // Release outgoing DOM before admitting the handoff painter. The
        // copied numeric snapshot keeps continuity without a double dot peak.
        this.#runner?.dispose();
        this.#geometry = undefined;
        const valid = () =>
          current() && this.isConnected && this.owner === owner;
        const captured = selected ?? binding;
        let driver: import('./internal/handoff.js').HandoffDriver;
        try {
          driver = (
            definitionOf(captured)
              .handoff as typeof import('./internal/handoff.js').createHandoff
          )(
            captured,
            host,
            content,
            targets,
            duration,
            valid,
            own,
            report,
            scope,
          );
        } catch (error) {
          this.#clear();
          throw error;
        }
        return {
          ...driver,
          restricted: () => motionRestricted(this),
          draw: (linear, eased) =>
            driver.draw?.(linear, easing === undefined ? linear : eased),
          dispose: () => {
            driver.dispose();
            this.#clear();
          },
        };
      },
    ];
  }
  protected override environmentChanged(): void {
    this.refresh();
  }
  #updateStatic(): void {
    const old = this.shadowRoot?.querySelector('[data-table-static]');
    if (old) {
      const next = staticTableSVG(
        this.ownerDocument,
        this.rows,
        this.rowHeight,
        this.columns,
      );
      old.replaceWith(next);
    }
  }
  #clear(): void {
    this.#geometry = undefined;
    this.#source = empty;
    this.#input = emptyInput;
  }
  #clearPointer = () => Reflect.deleteProperty(this, pointer);

  #pointer = (event: PointerEvent) => {
    if (
      this.pointerResponse !== 'lift' ||
      !this.hasAttribute('data-moving') ||
      event.pointerType === 'touch' ||
      !this.ownerDocument.defaultView?.matchMedia(
        '(hover:hover) and (pointer:fine)',
      ).matches
    )
      return;
    const r = (
      this.shadowRoot?.querySelector('svg[data-dotquilt-painter]') ?? this
    ).getBoundingClientRect();
    Reflect.set(this, pointer, {
      x:
        (event.clientX - r.left) *
        ((this.#geometry?.width ?? r.width) / r.width),
      y:
        (event.clientY - r.top) *
        ((this.#geometry?.height ?? r.height) / r.height),
    });
  };
  protected override render(): void {
    const owner = this.owner;
    if (owner && owner.presentation !== 'pending') {
      this.#clearPointer();
      this.removeAttribute('data-moving');
      this.#runner?.dispose();
      this.#clear();
      return;
    }
    const moving = this.allowed(this.activity);
    if (
      this.ownerDocument.defaultView?.matchMedia('(forced-colors: active)')
        .matches
    ) {
      this.#runner?.dispose();
      this.removeAttribute('data-moving');
      this.#clearPointer();
      return;
    }
    this.toggleAttribute('data-moving', moving);
    if (!moving || this.pointerResponse !== 'lift') this.#clearPointer();
    if (moving && (this.activity.started === undefined || !this.deadline))
      this.arm(this.activity);
    const binding =
      this.#bindings.idle ?? this.preset?.animations?.idle ?? defaultTypeOn;
    this.#runner ??= definitionOf(binding).runner?.(
      this,
      (code) => this.report(code, 'animations'),
      () => this.requestRender(),
    );
    this.#runner?.draw(binding, !moving, this.speed);
  }
}
export function registerTableLoader(): void {
  register('dotquilt-table-loader', TableLoader);
}
export { refreshStyles } from './internal/element.js';
