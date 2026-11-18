import { expect, test } from '@playwright/test';
import type { EventElement as EventElementType } from '../../packages/core/dist/internal/event-element.js';
import type { Preset } from '../../packages/core/dist/internal/preset.js';
import type {} from '../m2/catalog-client';

test.beforeEach(async ({ page }) => {
  await page.goto(
    '/m2/catalog?profile=individual&phase=idle&candidate=native&family=table',
  );
  await page.waitForFunction(() => !!window.catalogFixture);
});

test('owned listener cleanup avoids a default abort exception and reconnects cleanly', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { EventElement } = (await import(
      String('/pkg/dist/internal/event-element.js')
    )) as { EventElement: typeof EventElementType };
    const Controller = window.AbortController;
    const signals: AbortSignal[] = [];
    let controllers = 0,
      calls = 0;
    window.AbortController = new Proxy(Controller, {
      construct(target, args) {
        controllers++;
        const controller = Reflect.construct(target, args) as AbortController;
        signals.push(controller.signal);
        return controller;
      },
    });
    class OwnedEvents extends EventElement<'skeleton'> {
      protected override upgrade() {}
      protected override render() {}
      protected override capturePreset(value: Preset<'skeleton'>) {
        return value;
      }
      override connectedCallback() {
        super.connectedCallback();
        this.listen(this, 'click', () => calls++);
        this.listen(null, 'click', () => calls++);
      }
    }
    customElements.define('dotquilt-test-listeners', OwnedEvents);
    const host = document.createElement('dotquilt-test-listeners');
    try {
      document.body.append(host);
      host.dispatchEvent(new Event('click'));
      host.remove();
      host.dispatchEvent(new Event('click'));
      document.body.append(host);
      host.dispatchEvent(new Event('click'));
      host.remove();
      host.dispatchEvent(new Event('click'));
      await Promise.resolve();
      return {
        controllers,
        calls,
        connected: host.isConnected,
        aborted: signals.every((signal) => signal.aborted),
        explicitReasons: signals.map((signal) => signal.reason === null),
      };
    } finally {
      host.remove();
      window.AbortController = Controller;
    }
  });
  expect(result).toEqual({
    controllers: 2,
    calls: 2,
    connected: false,
    aborted: true,
    explicitReasons: [true, true],
  });
});

test('owned listener cleanup preserves capture and duplicate registration semantics', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { EventElement } = (await import(
      String('/pkg/dist/internal/event-element.js')
    )) as { EventElement: typeof EventElementType };
    const phases: number[] = [];
    let applicationCalls = 0;
    class OwnedEvents extends EventElement<'skeleton'> {
      protected override upgrade() {}
      protected override render() {}
      protected override capturePreset(value: Preset<'skeleton'>) {
        return value;
      }
      override connectedCallback() {
        super.connectedCallback();
        const listener = (event: Event) => phases.push(event.eventPhase);
        this.listen(this, 'click', listener);
        this.listen(this, 'click', listener);
        this.listen(this, 'click', listener, true);
      }
    }
    customElements.define('dotquilt-test-listener-capture', OwnedEvents);
    const host = document.createElement('dotquilt-test-listener-capture');
    host.addEventListener('click', () => applicationCalls++);
    const button = document.createElement('button');
    host.append(button);
    document.body.append(host);
    button.dispatchEvent(new Event('click', { bubbles: true }));
    host.remove();
    button.dispatchEvent(new Event('click', { bubbles: true }));
    return { phases, applicationCalls };
  });
  expect(result).toEqual({ phases: [1, 3], applicationCalls: 2 });
});
