import { expect, test } from '@playwright/test';
import type {} from '../m2/catalog-client';

for (const family of ['chart-line', 'table']) {
  test(`${family} provider preflight avoids a discarded rich snapshot and keeps final bounds fresh`, async ({
    page,
  }) => {
    await page.goto(
      `/m2/catalog?profile=individual&phase=handoff&candidate=native&family=${family}`,
    );
    await page.waitForFunction(() => !!window.catalogFixture);
    const result = await page.evaluate(async () => {
      await window.catalogFixture.prepare();
      const host = document.querySelector<HTMLElement>(
        'dotquilt-chart-loader,dotquilt-table-loader',
      );
      if (!host) throw Error('Missing rich surface');
      const field = host.shadowRoot?.querySelector('.surface');
      const provider = Reflect.get(host, 'targetProvider');
      const key = Symbol.for('dotquilt.surface.v1');
      const read = Reflect.get(host, key);
      const style = document.createElement('style');
      style.textContent =
        '.preflight-wide{width:427.5px!important;height:189.5px!important;padding:7.25px!important;border:2.5px solid transparent!important;box-sizing:border-box!important}';
      document.head.append(style);
      let fieldReads = 0,
        providerCalled = false;
      const observed: { width: number; height: number; frozen: boolean }[] = [];
      let before:
        | { fieldReads: number; frozen: boolean; width: number; height: number }
        | undefined;
      let expected: { width: number; height: number } | undefined;
      const computed = window.getComputedStyle;
      const handoffKey = Symbol.for('dotquilt.chart-handoff.v1');
      const handoffSource = Reflect.get(host, handoffKey);
      Reflect.set(
        host,
        handoffKey,
        function (this: HTMLElement, ...args: unknown[]) {
          fieldReads = 0;
          return handoffSource.apply(this, args);
        },
      );
      window.getComputedStyle = function (element, pseudo) {
        if (element === field) fieldReads++;
        return computed.call(this, element, pseudo);
      };
      Reflect.set(host, key, function (this: HTMLElement, ...args: unknown[]) {
        const value = read.apply(this, args);
        if (providerCalled)
          observed.push({
            width: value.width,
            height: value.height,
            frozen: Object.isFrozen(value),
          });
        return value;
      });
      Reflect.set(
        host,
        'targetProvider',
        (bounds: { width: number; height: number }) => {
          before = {
            fieldReads,
            frozen: Object.isFrozen(bounds),
            width: bounds.width,
            height: bounds.height,
          };
          providerCalled = true;
          host.classList.add('preflight-wide');
          const css = computed.call(window, host);
          expected = {
            width:
              parseFloat(css.width) -
              parseFloat(css.paddingLeft) -
              parseFloat(css.paddingRight) -
              parseFloat(css.borderLeftWidth) -
              parseFloat(css.borderRightWidth),
            height:
              parseFloat(css.height) -
              parseFloat(css.paddingTop) -
              parseFloat(css.paddingBottom) -
              parseFloat(css.borderTopWidth) -
              parseFloat(css.borderBottomWidth),
          };
          return provider(bounds);
        },
      );
      let outcome: Awaited<ReturnType<typeof window.catalogFixture.run>>;
      try {
        outcome = await window.catalogFixture.run(true);
      } finally {
        window.getComputedStyle = computed;
      }
      const fresh = observed.some(
        (s) =>
          s.width === expected?.width &&
          s.height === expected.height &&
          s.frozen,
      );
      await window.catalogFixture.teardown();
      style.remove();
      return {
        before,
        expected,
        fresh,
        errors: outcome.errors,
        violations: outcome.final.violations,
        identities: outcome.final.catalog.identitiesRetained,
        ready: outcome.final.ready,
      };
    });
    expect(result.before?.frozen).toBe(true);
    expect(result.before?.width).toBeGreaterThan(0);
    expect(result.expected?.width).not.toBe(result.before?.width);
    expect(result.fresh).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.violations).toEqual([]);
    expect(result.identities).toBe(true);
    expect(result.ready).toBe(1);
    expect(result.before?.fieldReads).toBe(0);
  });
}
