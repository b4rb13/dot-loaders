import { ManagedElement } from './element.js';
import type { PresetKind } from './preset.js';

/** Event ownership is needed by controllers and dense surfaces, not decoration. */
export abstract class EventElement<
  K extends PresetKind,
> extends ManagedElement<K> {
  #listeners: AbortController | undefined;
  protected listen(
    target: EventTarget | null | undefined,
    type: string,
    listener: EventListener,
    capture = false,
  ): void {
    if (!target) return;
    this.#listeners ??= new AbortController();
    target.addEventListener(type, listener, {
      capture,
      signal: this.#listeners.signal,
    });
  }
  override disconnectedCallback(): void {
    // Private listener cleanup has no error result to report.
    this.#listeners?.abort(null);
    this.#listeners = undefined;
    super.disconnectedCallback();
  }
}
