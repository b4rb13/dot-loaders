import { expect, test } from '@playwright/test';
import {
  catalog,
  catalogDefaults,
  catalogQuery,
} from '../../apps/website/lib/catalog';
import { fieldsFor, isRecipeKey } from '../../apps/website/lib/catalog-options';

test('all 19 public factories expose typed controls and commit to the matching native phase', async ({
  page,
}) => {
  for (const component of [
    'text-loader',
    'chart-loader',
    'table-loader',
    'skeleton-block',
  ] as const) {
    const item = catalog.find((item) => item.slug === component);
    if (!item) throw new Error('Missing record');
    await page.goto(`/playground/components/${component}`);
    await page.getByText('Typed animation options', { exact: true }).click();
    const host = page.locator(item.tag).first();
    for (const phase of ['idle', 'handoff'] as const)
      for (const recipe of (phase === 'idle'
        ? item.idles
        : item.reveals
      ).filter((key): key is Exclude<typeof key, 'default'> =>
        isRecipeKey(key),
      )) {
        await page
          .getByRole('combobox', {
            name: phase === 'idle' ? 'Idle recipe' : 'Reveal recipe',
            exact: true,
          })
          .selectOption(recipe);
        for (const [name, spec] of Object.entries(fieldsFor(recipe))) {
          const value =
            spec.kind === 'number'
              ? spec.min
              : (spec.values.at(-1) ?? spec.default);
          if (spec.kind === 'number') {
            const field = page.getByRole('spinbutton', {
              name: `${recipe}.${name}`,
              exact: true,
            });
            await field.fill(String(value));
            await field.press('Tab');
          } else
            await page
              .getByRole('combobox', { name: `${recipe}.${name}`, exact: true })
              .selectOption(String(value));
          await expect
            .poll(() =>
              host.evaluate(
                (el, { phase, name }) =>
                  Reflect.get(el, 'animations')?.[phase]?.options?.[name],
                { phase, name },
              ),
            )
            .toBe(value);
        }
      }
  }
});
test('option edits validate, preserve the owner/cycle and round-trip into complete files', async ({
  page,
}) => {
  await page.goto('/playground/components/text-loader');
  await page
    .getByRole('combobox', { name: 'Idle recipe', exact: true })
    .selectOption('scrambleCharacters');
  await page.getByText('Typed animation options', { exact: true }).click();
  const owner = page.locator('dotquilt-text-loader').first();
  await owner.evaluate((el) => {
    Reflect.set(window, 'catalogOwner', el);
  });
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  const cycle = await owner.getAttribute('cycle');
  const field = page.getByRole('spinbutton', {
    name: 'scrambleCharacters.changesPerSecond',
    exact: true,
  });
  await field.fill('1.1');
  await field.press('Tab');
  await expect(owner).toHaveAttribute('cycle', cycle ?? '');
  expect(
    await owner.evaluate((el) => el === Reflect.get(window, 'catalogOwner')),
  ).toBe(true);
  await field.fill('99');
  await field.press('Tab');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(
    await owner.evaluate(
      (el) => Reflect.get(el, 'animations').idle.options.changesPerSecond,
    ),
  ).toBe(1.1);
  await page.reload();
  await expect(owner).toHaveAttribute('state', 'ready');
  await page.getByText('Typed animation options', { exact: true }).click();
  await expect(field).toHaveValue('1.1');
  await page.getByText('Complete example · all files', { exact: true }).click();
  await page
    .locator('summary')
    .filter({ hasText: /^src\/main.tsx$/ })
    .click();
  await expect(
    page
      .locator('details')
      .filter({
        has: page.locator('summary').getByText('src/main.tsx', { exact: true }),
      })
      .last(),
  ).toContainText('"changesPerSecond": 1.1');
  await page
    .getByRole('button', { name: 'Clear option overrides', exact: true })
    .click();
  await expect(field).toHaveValue('');
  expect(
    await owner.evaluate(
      (el) => Reflect.get(el, 'animations').idle.options.changesPerSecond,
    ),
  ).toBe(2.8);
});
test('local presets inherit per phase, explicit values override, and clearing restores without remount', async ({
  page,
}) => {
  await page.goto('/playground/components/text-loader');
  const owner = page.locator('dotquilt-text-loader').first();
  await page
    .getByRole('combobox', { name: 'Animation mode', exact: true })
    .selectOption('preset');
  await expect
    .poll(() => owner.evaluate((el) => Reflect.get(el, 'speed')))
    .toBe(0.5);
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  const cycle = await owner.getAttribute('cycle');
  await page
    .getByRole('combobox', { name: 'Idle speed', exact: true })
    .selectOption('2');
  await expect
    .poll(() => owner.evaluate((el) => Reflect.get(el, 'speed')))
    .toBe(2);
  await page
    .getByRole('combobox', { name: 'Idle speed', exact: true })
    .selectOption('auto');
  await expect
    .poll(() => owner.evaluate((el) => Reflect.get(el, 'speed')))
    .toBe(0.5);
  await page
    .getByRole('combobox', { name: 'Idle recipe', exact: true })
    .selectOption('labelPulse');
  expect(
    await owner.evaluate((el) => Reflect.get(el, 'animations').idle.id),
  ).toContain('label-pulse');
  expect(
    await owner.evaluate(
      (el) => Reflect.get(el, 'preset').animations.handoff.id,
    ),
  ).toContain('print');
  await page
    .getByRole('combobox', { name: 'Idle recipe', exact: true })
    .selectOption('default');
  expect(
    await owner.evaluate((el) => Reflect.get(el, 'animations').idle),
  ).toBeUndefined();
  expect(
    await owner.evaluate((el) => Reflect.get(el, 'preset').animations.idle.id),
  ).toContain('words');
  await expect(owner).toHaveAttribute('cycle', cycle ?? '');
});
test('all five custom families hand off through the engine, keep content, settle pause and cancel', async ({
  page,
}) => {
  for (const component of [
    'text-loader',
    'chart-loader',
    'table-loader',
    'skeleton-block',
    'loading-region',
  ] as const) {
    const settings = {
      ...catalogDefaults(component),
      mode: 'custom' as const,
      duration: '900' as const,
    };
    await page.goto(
      `/playground/components/${component}?${catalogQuery(settings)}`,
    );
    const owner = page
      .locator(
        component === 'text-loader'
          ? 'dotquilt-text-loader'
          : 'dotquilt-region',
      )
      .first();
    await owner.evaluate((el) => {
      Reflect.set(window, 'handoffEvents', []);
      for (const type of [
        'dotquilt-handoff-start',
        'dotquilt-handoff-end',
        'dotquilt-handoff-cancel',
      ])
        el.addEventListener(type, (event) =>
          Reflect.get(window, 'handoffEvents').push({
            type,
            ...(event as CustomEvent).detail,
          }),
        );
    });
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await page.waitForTimeout(80);
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await expect
      .poll(() =>
        owner.evaluate(
          () =>
            Reflect.get(window, 'handoffEvents').filter(
              (event: { type: string }) =>
                event.type === 'dotquilt-handoff-start',
            ).length,
        ),
      )
      .toBe(1);
    expect(
      await owner.evaluate(
        () => Reflect.get(window, 'handoffEvents')[0].animation,
      ),
    ).toContain(
      `examples/${component === 'loading-region' ? 'region' : component === 'skeleton-block' ? 'skeleton' : component.replace('-loader', '')}/soft-reveal`,
    );
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
    expect(
      await owner.evaluate(
        () =>
          Reflect.get(window, 'handoffEvents').filter(
            (event: { type: string }) => event.type === 'dotquilt-handoff-end',
          ).length,
      ),
    ).toBe(1);
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Reveal content', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Pause motion', exact: true })
      .click();
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
    await page
      .getByRole('button', { name: 'Motion paused', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Start loading', exact: true })
      .click();
    await page
      .getByText('Request outcomes and measurement refresh', { exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Cancel request', exact: true })
      .click();
    await expect(owner).toHaveAttribute('data-presentation', 'ready');
  }
});
test('binding edits during a captured handoff preserve immutable options and cycle identity', async ({
  page,
}) => {
  const settings = {
    ...catalogDefaults('text-loader'),
    idle: 'scramble',
    reveal: 'lock',
    duration: '900' as const,
    options: { lock: { pop: 0.1 } },
  };
  await page.goto(
    `/playground/components/text-loader?${catalogQuery(settings)}`,
  );
  const owner = page.locator('dotquilt-text-loader').first();
  await owner.evaluate((el) => {
    Reflect.set(window, 'beforeEdit', Reflect.get(el, 'animations').handoff);
    Reflect.set(window, 'terminal', []);
    for (const type of ['dotquilt-handoff-end', 'dotquilt-handoff-cancel'])
      el.addEventListener(type, () =>
        Reflect.get(window, 'terminal').push(type),
      );
  });
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  const cycle = await owner.getAttribute('cycle');
  await page.getByText('Typed animation options', { exact: true }).click();
  await page
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  const field = page.getByRole('spinbutton', { name: 'lock.pop', exact: true });
  await field.fill('0.25');
  await field.press('Tab');
  expect(
    await owner.evaluate(
      (el) => Reflect.get(el, 'animations').handoff.options.pop,
    ),
  ).toBe(0.25);
  expect(
    await owner.evaluate(() => Reflect.get(window, 'beforeEdit').options.pop),
  ).toBe(0.1);
  await expect(owner).toHaveAttribute('cycle', cycle ?? '');
  await expect(owner).toHaveAttribute('data-presentation', 'ready');
  expect(await owner.evaluate(() => Reflect.get(window, 'terminal'))).toEqual([
    'dotquilt-handoff-end',
  ]);
});
test('custom option links respect system reduction and do not execute code or restore requests', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const settings = {
    ...catalogDefaults('loading-region'),
    mode: 'custom' as const,
    options: { customReveal: { duration: 320, liftPx: 4 } },
  };
  await page.goto(`/docs/components/loading-region?${catalogQuery(settings)}`);
  await page
    .getByRole('link', {
      name: 'Open this configuration in playground',
      exact: true,
    })
    .click();
  await expect(page.locator('dotquilt-region').first()).toHaveAttribute(
    'state',
    'ready',
  );
  await page.getByText('Typed animation options', { exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'customReveal.liftPx', exact: true }),
  ).toHaveValue('4');
  await page
    .getByRole('button', { name: 'Start loading', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Reveal content', exact: true })
    .click();
  await expect(page.locator('dotquilt-region').first()).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  const query = new URLSearchParams(catalogQuery(settings));
  query.set('options', '{"customReveal":{"duration":"javascript:alert(1)"}}');
  await page.goto(`/playground/components/loading-region?${query}`);
  await expect(page.getByRole('status').first()).toContainText('unsupported');
});
test('schema2 shared links retain their settings with an explicit static migration notice', async ({
  page,
}) => {
  const query = new URLSearchParams(
    catalogQuery({
      ...catalogDefaults('chart-loader'),
      speed: 2,
      variant: 'bar',
      idle: 'scan',
    }),
  );
  query.set('schema', '2');
  query.delete('mode');
  query.delete('options');
  await page.goto(`/playground/components/chart-loader?${query}`);
  await expect(page.getByRole('status').first()).toContainText('migrated');
  await expect(
    page.getByRole('combobox', { name: 'Chart geometry', exact: true }),
  ).toHaveValue('bar');
  await expect(page.locator('dotquilt-region').first()).toHaveAttribute(
    'state',
    'ready',
  );
});
test('320px typed controls, property references and static complete custom source remain reachable', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/docs/components/text-loader');
  await page
    .getByRole('combobox', { name: 'Animation mode', exact: true })
    .selectOption('custom');
  await page.getByText('Typed animation options', { exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'customReveal.liftPx', exact: true })
    .focus();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (!baseURL) throw new Error('Missing baseURL');
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const staticPage = await context.newPage();
  await staticPage.goto('/docs/components/text-loader');
  await expect(
    staticPage.getByRole('heading', {
      name: 'Typed factory options',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    staticPage.getByText('Custom definitions and local presets', {
      exact: true,
    }),
  ).toBeVisible();
  await staticPage
    .getByText('Complete example · all files', { exact: true })
    .click();
  await expect(
    staticPage
      .locator('summary')
      .getByText('src/lib/catalog-authoring.ts', { exact: true }),
  ).toBeVisible();
  await context.close();
});
