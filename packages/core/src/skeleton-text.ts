import { skeletonTextStyles } from './catalog-styles.js';
import { boundedCount, lineWidths } from './internal/count.js';
import { node, register, upgradeProperties } from './internal/dom.js';
import { SkeletonBlock } from './skeleton-block.js';

export class SkeletonText extends SkeletonBlock {
  static override observedAttributes = [
    ...SkeletonBlock.observedAttributes,
    'lines',
  ];
  #widths: readonly number[] = [];
  #geometry = '';
  get lines(): number {
    return boundedCount(this.getAttribute('lines') ?? 3, 3, 50);
  }
  set lines(value: number | undefined) {
    if (value === undefined) this.removeAttribute('lines');
    else this.setAttribute('lines', String(value));
  }
  get widths(): readonly number[] {
    return this.#widths;
  }
  set widths(value: readonly number[] | undefined) {
    if (value !== undefined && !Array.isArray(value)) {
      this.report('invalid-widths', 'widths');
      this.#widths = [];
    } else {
      const source = value ?? [];
      if (source.length > this.lines) this.report('excess-widths', 'widths');
      this.#widths = Object.freeze(
        source.slice(0, 50).map((width) => {
          if (
            typeof width === 'number' &&
            Number.isFinite(width) &&
            width > 0 &&
            width <= 1
          )
            return width;
          this.report('invalid-width', 'widths');
          return Number.NaN;
        }),
      );
    }
    this.requestRender();
  }
  protected override get styles(): readonly string[] {
    return skeletonTextStyles;
  }
  override connectedCallback(): void {
    upgradeProperties(this, ['lines', 'widths']);
    super.connectedCallback();
    this.#geometry = '';
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#geometry = '';
  }
  override attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (name === 'lines' && value !== null) {
      const count = Number(value);
      if (!Number.isInteger(count) || count <= 0 || !Number.isFinite(count))
        this.report('invalid-count', 'lines');
      else if (count > 50) this.report('line-limit', 'lines');
    }
    super.attributeChangedCallback(name, old, value);
  }
  override update(
    patch: Parameters<SkeletonBlock['update']>[0] & {
      readonly lines?: number | undefined;
      readonly widths?: readonly number[] | undefined;
    },
  ): void {
    super.update(patch);
  }
  protected override render(): void {
    const widths = lineWidths(this.lines, this.#widths);
    const geometry = widths.join(',');
    if (geometry !== this.#geometry && this.shadowRoot) {
      const layers = this.shadowRoot.querySelectorAll('.lines');
      if (!layers.length)
        for (const layer of [...this.shadowRoot.children])
          if (layer.localName === 'div') layer.remove();
      for (const pulse of [false, true]) {
        const layer =
          layers[pulse ? 1 : 0] ??
          node(this.ownerDocument, 'div', {
            class: pulse ? 'lines pulse' : 'lines',
            'aria-hidden': 'true',
          });
        layer.replaceChildren();
        for (const width of widths) {
          const line = this.ownerDocument.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg',
          );
          line.setAttribute('class', 'line surface');
          line.setAttribute('part', 'surface');
          line.setAttribute('width', `${width * 100}%`);
          line.setAttribute('height', '14');
          layer.append(line);
        }
        this.shadowRoot.append(layer);
      }
      this.#geometry = geometry;
    }
    super.render();
  }
}
export function registerSkeletonText(): void {
  register('dotquilt-skeleton-text', SkeletonText);
}
