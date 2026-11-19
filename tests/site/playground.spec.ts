import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

test('a shared link opens the playground with its settings', async ({
  page,
}) => {
  await page.goto(
    '/playground/?component=chart&mark=square&variant=bar&idle=bars&palette=sage',
  );
  const playground = page.locator('[data-playground]');
  await expect(
    playground.getByRole('radio', { name: 'ChartLoader', exact: true }),
  ).toBeChecked();
  await expect(
    playground.getByRole('radio', { name: 'Square', exact: true }),
  ).toBeChecked();
  await expect(
    playground.getByRole('radio', { name: 'Bars', exact: true }).first(),
  ).toBeChecked();
  await expect(
    playground.getByRole('radio', { name: 'Sage', exact: true }),
  ).toBeChecked();
  const chart = playground.locator('[data-demo="chart"][data-variant="bar"]');
  await expect(chart).toBeVisible();
  await expect(chart.locator('dotquilt-chart-loader')).toHaveAttribute(
    'mark',
    'square',
  );
  await expect(playground.locator('[data-code-out]')).toContainText(
    'animations={{ idle: bars() }}',
  );
});

test('unknown or out-of-range settings fall back to the defaults', async ({
  page,
}) => {
  await page.goto('/playground/?component=nope&mark=star&size=999');
  const playground = page.locator('[data-playground]');
  await expect(
    playground.getByRole('radio', { name: 'Skeleton', exact: true }),
  ).toBeChecked();
  await expect(
    playground.getByRole('radio', { name: 'Dot', exact: true }),
  ).toBeChecked();
  await expect(playground.locator('output[name="size-out"]')).toHaveText(
    '7 px',
  );
});

test('changing a setting restyles the stage, rewrites the code and the link', async ({
  page,
}) => {
  await page.goto('/playground/');
  const playground = page.locator('[data-playground]');
  await playground
    .getByRole('radio', { name: 'TextLoader', exact: true })
    .check();
  await playground.getByRole('radio', { name: 'Dash', exact: true }).check();
  await playground
    .getByRole('radio', { name: 'Scramble', exact: true })
    .check();
  await playground.getByRole('radio', { name: 'Plum', exact: true }).check();
  await expect(page).toHaveURL(/component=text/);
  await expect(page).toHaveURL(/mark=dash/);
  await expect(page).toHaveURL(/idle=scramble/);
  await expect(page).toHaveURL(/palette=plum/);
  const loader = playground.locator('[data-demo="text"] dotquilt-text-loader');
  await expect(loader).toHaveAttribute('mark', 'dash');
  const code = playground.locator('[data-code-out]');
  await expect(code).toContainText('mark="dash"');
  await expect(code).toContainText('idle: scramble()');
  await playground.getByRole('tab', { name: 'CSS' }).click();
  await expect(code).toContainText('--dotquilt-color: light-dark(#776479');
  // Squares and dashes have a fixed size: the size sliders step aside.
  await expect(playground.getByText('Dot size')).toBeHidden();
});

test('Reveal hands over at once, and Start loading begins again', async ({
  page,
}) => {
  await page.goto('/playground/?component=typing&delay=6000');
  const playground = page.locator('[data-playground]');
  const region = playground.locator('[data-demo="typing"] dotquilt-region');
  await expect(region).toHaveAttribute('state', 'pending');
  await playground.getByRole('button', { name: 'Reveal' }).click();
  await expect(region).toHaveAttribute('state', 'ready');
  await expect(playground.locator('[data-status]')).toHaveText('Loaded');
  await playground.getByRole('button', { name: 'Start loading' }).click();
  await expect(region).toHaveAttribute('state', 'pending');
  await playground.getByRole('button', { name: 'Reset to defaults' }).click();
  await expect(page).toHaveURL(/\?component=skeleton$/);
});
