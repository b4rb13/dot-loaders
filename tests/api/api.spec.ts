import { expect, test } from '@playwright/test';
import type {
  LoadingRegion,
  SkeletonText,
} from '../../packages/core/dist/index';

const tags = [
  'skeleton-block',
  'skeleton-line',
  'skeleton-circle',
  'skeleton-text',
  'typing-dots',
  'text-loader',
  'chart-loader',
  'table-loader',
  'region',
].map((name) => `dotquilt-${name}`);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.set(window, 'apiViolations', []);
    Reflect.set(window, 'apiErrors', []);
    document.addEventListener('securitypolicyviolation', (event) =>
      Reflect.get(window, 'apiViolations').push(event.violatedDirective),
    );
    window.addEventListener('error', (event) =>
      Reflect.get(window, 'apiErrors').push(event.message),
    );
  });
});
test.afterEach(async ({ page }) => {
  expect(
    await page.evaluate(() => ({
      violations: Reflect.get(window, 'apiViolations'),
      errors: Reflect.get(window, 'apiErrors'),
    })),
  ).toEqual({ violations: [], errors: [] });
});

test('register-all import is inert, repeats safely, and a second copy is refused', async ({
  page,
}) => {
  await page.goto('/?empty');
  expect(
    await page.evaluate(async (tags) => {
      const first = await import(String('/copy-one/register-all.js'));
      const second = await import(String('/copy-two/register-all.js'));
      const inert = tags.every((tag) => !customElements.get(tag));
      first.registerAll();
      const definitions = tags.map((tag) => customElements.get(tag));
      first.registerAll();
      let code: string | undefined;
      try {
        second.registerAll();
      } catch (error) {
        code = (error as { code: string }).code;
      }
      return {
        inert,
        code,
        kept: tags.every(
          (tag, i) =>
            customElements.get(tag) === definitions[i] && !!definitions[i],
        ),
      };
    }, tags),
  ).toEqual({ inert: true, code: 'registration-conflict', kept: true });
});

for (const [tag, helper] of [
  ['dotquilt-skeleton-block', 'registerSkeletonBlock'],
  ['dotquilt-table-loader', 'registerTableLoader'],
  ['dotquilt-region', 'registerLoadingRegion'],
] as const)
  for (const mode of ['selective', 'all'])
    test(`a subclass of another Dotquilt element cannot take the place of ${tag} (${mode})`, async ({
      page,
    }) => {
      await page.goto('/?empty');
      expect(
        await page.evaluate(
          async ({ tag, helper, mode, tags }) => {
            const library = await import(String('/copy-one/index.js'));
            const { registerAll } = await import(
              String('/copy-one/register-all.js')
            );
            const baseTag =
              tag === 'dotquilt-skeleton-block'
                ? 'dotquilt-region'
                : 'dotquilt-skeleton-block';
            if (baseTag === 'dotquilt-region') library.registerLoadingRegion();
            else library.registerSkeletonBlock();
            const Base = customElements.get(baseTag) as typeof HTMLElement;
            const foreign = class extends Base {};
            customElements.define(tag, foreign);
            let code: string | undefined;
            try {
              if (mode === 'all') registerAll();
              else library[helper]();
            } catch (error) {
              code = (error as { code: string }).code;
            }
            return {
              code,
              preserved: customElements.get(tag) === foreign,
              writes: tags.filter(
                (name) =>
                  name !== baseTag && name !== tag && customElements.get(name),
              ),
            };
          },
          { tag, helper, mode, tags },
        ),
      ).toEqual({ code: 'registration-conflict', preserved: true, writes: [] });
    });

for (const tag of tags)
  test(`batch preflight rejects ${tag} before any avoidable registration`, async ({
    page,
  }) => {
    await page.goto('/?empty');
    expect(
      await page.evaluate(
        async ({ tag, tags }) => {
          const foreign = class extends HTMLElement {};
          customElements.define(tag, foreign);
          const { registerAll } = await import(
            String('/copy-one/register-all.js')
          );
          let failure:
            | { name: string; code: string; elementName: string }
            | undefined;
          try {
            registerAll();
          } catch (error) {
            const e = error as Error & { code: string; elementName: string };
            failure = {
              name: e.name,
              code: e.code,
              elementName: e.elementName,
            };
          }
          return {
            failure,
            preserved: customElements.get(tag) === foreign,
            writes: tags.filter(
              (name) => name !== tag && customElements.get(name),
            ),
          };
        },
        { tag, tags },
      ),
    ).toEqual({
      failure: {
        name: 'LoaderRegistrationError',
        code: 'registration-conflict',
        elementName: tag,
      },
      preserved: true,
      writes: [],
    });
  });

test('native multiline override removal restores the default without diagnosing valid omission', async ({
  page,
}) => {
  await page.goto('/');
  expect(
    await page.evaluate(async () => {
      const { app } = await import(String('/native.js'));
      const errors: string[] = [];
      const text = document.querySelector(
        'dotquilt-skeleton-text',
      ) as SkeletonText;
      text.addEventListener('dotquilt-error', (event) =>
        errors.push(event.detail.code),
      );
      text.update({ lines: 5, widths: [0.4] });
      text.update({ lines: undefined, widths: undefined });
      return {
        lines: text.lines,
        widths: [...text.widths],
        explicit: text.hasAttribute('lines'),
        errors,
        state: (app.region as LoadingRegion).state,
      };
    }),
  ).toEqual({
    lines: 3,
    widths: [],
    explicit: false,
    errors: [],
    state: 'ready',
  });
});

test('scoped stylesheet refresh safely skips static hosts before lazy registration', async ({
  page,
}) => {
  await page.goto('/');
  expect(
    await page.evaluate(async () => {
      const { refreshStyles } = await import(String('/copy-one/index.js'));
      const region = document.querySelector('dotquilt-region') as LoadingRegion;
      const content = document.querySelector('input');
      const shell = document.createElement('section');
      const root = shell.attachShadow({ mode: 'open' });
      const lazy = document.createElement('dotquilt-typing-dots');
      lazy.setAttribute('data-dotquilt-surface', '');
      root.append(lazy);
      document.body.append(shell);
      refreshStyles(document);
      refreshStyles(region);
      refreshStyles(root);
      const before =
        !customElements.get('dotquilt-region') &&
        !customElements.get('dotquilt-typing-dots');
      await import(String('/native.js'));
      refreshStyles(document);
      refreshStyles(region);
      refreshStyles(root);
      shell.remove();
      return {
        before,
        state: region.state,
        content: region.contains(content),
        typingStillUnregistered: !customElements.get('dotquilt-typing-dots'),
      };
    }),
  ).toEqual({
    before: true,
    state: 'ready',
    content: true,
    typingStillUnregistered: true,
  });
});

test('batch setup preserves a reentrant conflicting definition and promises no rollback', async ({
  page,
}) => {
  await page.goto('/?empty');
  expect(
    await page.evaluate(async () => {
      const { registerAll } = await import(String('/copy-one/register-all.js'));
      const block = document.createElement('dotquilt-skeleton-block');
      Reflect.set(block, 'stylePolicy', {
        mode: 'external',
        href: '/styles/skeleton-text.css',
      });
      block.setAttribute('speed', 'invalid');
      const foreign = class extends HTMLElement {};
      block.addEventListener(
        'dotquilt-error',
        () => customElements.define('dotquilt-table-loader', foreign),
        { once: true },
      );
      document.body.append(block);
      let code: string | undefined;
      try {
        registerAll();
      } catch (error) {
        code = (error as { code: string }).code;
      }
      block.remove();
      return {
        code,
        preserved: customElements.get('dotquilt-table-loader') === foreign,
        priorWritesRemain: !!customElements.get('dotquilt-chart-loader'),
        stopped: !customElements.get('dotquilt-region'),
      };
    }),
  ).toEqual({
    code: 'registration-conflict',
    preserved: true,
    priorWritesRemain: true,
    stopped: true,
  });
});

test('all recipe examples preserve typed options and custom authoring uses public capabilities', async ({
  page,
}) => {
  await page.goto('/');
  expect(
    await page.evaluate(async () => {
      const { recipes, rise, app } = await import(String('/native.js'));
      const bindings = Object.values(recipes).flatMap((family) =>
        Object.values(family as Record<string, unknown[]>).flat(),
      ) as { id: string; family: string; phase: string; options: object }[];
      const custom = rise({ distance: 400 });
      const failures: string[] = [];
      for (const value of [Number.NaN, Infinity, '4px'])
        try {
          rise({ distance: value });
        } catch (error) {
          failures.push((error as { code: string }).code);
        }
      const region = app.region as LoadingRegion;
      region.update({
        animations: { handoff: rise({ distance: 4 }) },
        cycle: 'authored',
        state: 'pending',
        timing: { duration: 0 },
      });
      await new Promise<void>((done) => requestAnimationFrame(() => done()));
      region.update({ state: 'ready' });
      await new Promise<void>((done) => requestAnimationFrame(() => done()));
      return {
        count: bindings.length,
        textIdles: bindings
          .filter(
            (binding) => binding.family === 'text' && binding.phase === 'idle',
          )
          .map((binding) => binding.id),
        captured: bindings.every(
          (binding) =>
            Object.isFrozen(binding) && Object.isFrozen(binding.options),
        ),
        families: [
          ...new Set(bindings.map((binding) => binding.family)),
        ].sort(),
        distance: custom.options.distance,
        failures,
        state: region.presentation,
      };
    }),
  ).toEqual({
    count: 13,
    textIdles: ['dotquilt/scramble', 'dotquilt/label-pulse'],
    captured: true,
    families: ['chart', 'skeleton', 'table', 'text'],
    distance: 8,
    failures: ['invalid-options', 'invalid-options', 'invalid-options'],
    state: 'ready',
  });
});

for (const framework of ['native', 'react'])
  test(`${framework} summary example preserves input, rejects stale results and commits immediate app outcomes`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(framework === 'react' ? '/?react' : '/');
    await page.evaluate(async (framework) => {
      await import(String(`/${framework}.js`));
      (window as unknown as { violations: string[] }).violations = [];
      document.addEventListener('securitypolicyviolation', (event) =>
        (window as unknown as { violations: string[] }).violations.push(
          event.violatedDirective,
        ),
      );
    }, framework);
    await expect(page.getByRole('textbox')).toBeVisible();
    await page.getByRole('textbox').fill('keep my edit');
    await page.evaluate(() => {
      Reflect.set(window, 'originalInput', document.querySelector('input'));
      const events: {
        type: string;
        cycle: string;
        id: number;
        bubbles: boolean;
        composed: boolean;
        cancelable: boolean;
      }[] = [];
      Reflect.set(window, 'summaryEvents', events);
      for (const type of ['start', 'end', 'cancel'])
        document.addEventListener(`dotquilt-handoff-${type}`, (event) => {
          const detail = (event as CustomEvent).detail;
          events.push({
            type,
            cycle: detail.cycle,
            id: detail.handoffId,
            bubbles: event.bubbles,
            composed: event.composed,
            cancelable: event.cancelable,
          });
        });
    });
    const commit = async (
      state: string,
      cycle: string,
      value: string | number = 'Current summary',
      immediate = false,
    ) => {
      await page.evaluate(
        async ({ framework, state, cycle, value, immediate }) => {
          const example = await import(String(`/${framework}.js`));
          if (framework === 'react')
            example.render(state, cycle, value, immediate);
          else if (state !== 'ready')
            example.app.begin(cycle, state === 'pending');
          else example.app.settle(cycle, value, immediate);
        },
        { framework, state, cycle, value, immediate },
      );
      await expect(page.locator('dotquilt-region')).toHaveAttribute(
        'data-presentation',
        state,
      );
    };
    await commit('refreshing', 'refresh');
    await expect(page.getByRole('textbox')).toHaveValue('keep my edit');
    await expect(page.getByText('Updating', { exact: true })).toBeVisible();
    await commit('ready', 'refresh', 'Retained outcome', true);
    for (const [cycle, value] of [
      ['zero', 0],
      ['empty', ''],
      ['failure', 'Could not load'],
      ['cancel', 'Canceled'],
    ] as const) {
      await commit('pending', cycle);
      await expect(page.getByRole('textbox')).toBeHidden();
      if (framework === 'native')
        expect(
          await page.evaluate(async () =>
            (await import(String('/native.js'))).app.settle(
              'obsolete',
              'WRONG',
              true,
            ),
          ),
        ).toBe(false);
      await commit('ready', cycle, value, true);
      await expect(page.locator('[data-result]')).toHaveText(String(value));
      await expect(page.getByRole('textbox')).toHaveValue('keep my edit');
    }
    expect(
      await page.evaluate(() => {
        const events = Reflect.get(window, 'summaryEvents') as {
          type: string;
          cycle: string;
          id: number;
          bubbles: boolean;
          composed: boolean;
          cancelable: boolean;
        }[];
        return {
          identity:
            document.querySelector('input') ===
            Reflect.get(window, 'originalInput'),
          events,
          violations: Reflect.get(window, 'violations'),
        };
      }),
    ).toMatchObject({
      identity: true,
      violations: [],
      events: ['zero', 'empty', 'failure', 'cancel'].flatMap((cycle) => [
        {
          type: 'start',
          cycle,
          bubbles: true,
          composed: true,
          cancelable: false,
        },
        {
          type: 'end',
          cycle,
          bubbles: true,
          composed: true,
          cancelable: false,
        },
      ]),
    });
    expect(errors).toEqual([]);
  });

test('geometry examples use actual CSS-pixel coordinates and bounded explicit rows', async ({
  page,
}) => {
  await page.goto('/');
  expect(
    await page.evaluate(async () => {
      const { sampleChart, tableTargets } = await import(String('/native.js'));
      const placeholder = document.querySelector(
        'dotquilt-region',
      ) as HTMLElement;
      placeholder.classList.add('measurement');
      const row = document.querySelector('[data-result]') as HTMLElement;
      const box = placeholder.getBoundingClientRect();
      const projection = tableTargets(
        placeholder,
        Array.from({ length: 200 }, () => row),
      )({ width: box.width, height: box.height });
      return {
        chart: sampleChart({ width: 320, height: 200 }),
        count: projection.rects.length,
        local: projection.rects[0].x === 0,
        untouched: row.textContent,
      };
    }),
  ).toEqual({
    chart: {
      kind: 'line',
      points: [
        { x: 0, y: 200 },
        { x: 160, y: 50 },
        { x: 320, y: 100 },
      ],
      baseline: 200,
    },
    count: 100,
    local: true,
    untouched: 'Current summary',
  });
});

test('presentation events cross an application shadow boundary and cannot gate readiness', async ({
  page,
}) => {
  await page.goto('/');
  expect(
    await page.evaluate(async () => {
      await import(String('/native.js'));
      const wrapper = document.createElement('section');
      const shadow = wrapper.attachShadow({ mode: 'open' });
      const region = document.createElement('dotquilt-region');
      region.stylePolicy = { mode: 'external', href: '/styles/region.css' };
      region.state = 'pending';
      const placeholder = document.createElement('span');
      placeholder.slot = 'placeholder';
      placeholder.textContent = 'Loading';
      const content = document.createElement('button');
      content.textContent = 'Current';
      region.append(placeholder, content);
      shadow.append(region);
      document.body.append(wrapper);
      const events: {
        type: string;
        composed: boolean;
        canceled: boolean;
        retargeted: boolean;
      }[] = [];
      for (const name of ['start', 'end', 'cancel'])
        document.addEventListener(`dotquilt-handoff-${name}`, (event) => {
          event.preventDefault();
          events.push({
            type: name,
            composed: event.composed,
            canceled: event.defaultPrevented,
            retargeted: event.target === wrapper,
          });
        });
      await new Promise<void>((done) => requestAnimationFrame(() => done()));
      region.update({
        state: 'ready',
        cycle: 'shadow',
        timing: { duration: 0 },
      });
      await new Promise<void>((done) => requestAnimationFrame(() => done()));
      const result = {
        state: region.presentation,
        inert: region.shadowRoot?.querySelector('.c')?.hasAttribute('inert'),
        same: content.parentNode === region,
        events,
      };
      wrapper.remove();
      return result;
    }),
  ).toEqual({
    state: 'ready',
    inert: false,
    same: true,
    events: [
      { type: 'start', composed: true, canceled: false, retargeted: true },
      { type: 'end', composed: true, canceled: false, retargeted: true },
    ],
  });
});

test('approved custom drift and fanReveal examples play on the engine clock and clean up', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    // One copy: the chart comes from the same bundle as the region and animations.
    const { app, drift, fanReveal, registerChartLoader } = await import(
      String('/native.js')
    );
    registerChartLoader();
    const chart = document.createElement('dotquilt-chart-loader');
    chart.className = 'chart-example';
    chart.stylePolicy = { mode: 'external', href: '/styles/chart.css' };
    chart.animations = { idle: drift({ wavelength: 120 }) };
    app.region.querySelector('[slot=placeholder]').append(chart);
    const result = document.querySelector('[data-result]') as HTMLElement;
    app.region.update({
      animations: { handoff: fanReveal({ spread: 30 }) },
      revealTargets: [{ id: 'result', element: result }],
      timing: { duration: 180 },
    });
    const events: { type: string; reason?: string; animation: string }[] = [];
    Reflect.set(window, 'customEvents', events);
    for (const name of ['start', 'end', 'cancel'])
      app.region.addEventListener(
        `dotquilt-handoff-${name}`,
        (event: CustomEvent) => events.push({ type: name, ...event.detail }),
      );
    app.begin('custom', true);
  });
  await expect(
    page
      .locator('dotquilt-chart-loader [data-dotquilt-painter] circle')
      .first(),
  ).toBeAttached();
  await page.evaluate(async () =>
    (await import(String('/native.js'))).app.settle(
      'custom',
      'Current custom outcome',
    ),
  );
  await expect(page.locator('dotquilt-region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.getByRole('textbox')).toBeVisible();
  expect(
    await page.evaluate(() => {
      const events = Reflect.get(window, 'customEvents') as {
        type: string;
        reason?: string;
        animation: string;
      }[];
      const output = {
        events: events.map(({ type, reason, animation }) => ({
          type,
          reason,
          animation,
        })),
        painters: document
          .querySelector('dotquilt-chart-loader')
          ?.shadowRoot?.querySelectorAll('[data-dotquilt-painter]').length,
      };
      document.getElementById('app')?.remove();
      return output;
    }),
  ).toEqual({
    events: [
      { type: 'start', reason: undefined, animation: 'example/fanReveal' },
      { type: 'end', reason: 'complete', animation: 'example/fanReveal' },
    ],
    painters: 0,
  });
});
