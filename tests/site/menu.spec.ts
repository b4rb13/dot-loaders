import { expect, type Page, test } from '@playwright/test';

// On phones the header's main links move into a menu. Pages without a
// sidebar (the splash pages) get their own menu button; docs pages keep
// Starlight's, which opens the sidebar.

const phone = { width: 375, height: 812 };
const sections = [
  ['Docs', '/docs/'],
  ['Components', '/docs/components/skeleton/'],
  ['Guides', '/docs/guides/react/'],
  ['Examples', '/examples/'],
  ['Playground', '/playground/'],
  ['Pricing', '/pricing/'],
] as const;

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

const menuButton = (page: Page) => page.getByRole('button', { name: 'Menu' });
const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Main' });

for (const [path, current] of [
  ['/', undefined],
  ['/pricing/', 'Pricing'],
  ['/examples/', 'Examples'],
  ['/playground/', 'Playground'],
] as const) {
  test(`on a phone, ${path} opens a menu with every main section`, async ({
    page,
  }) => {
    await page.setViewportSize(phone);
    await page.goto(path);
    const button = menuButton(page);
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(mainNav(page)).toBeHidden();
    const heading = await page.locator('h1').first().boundingBox();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const links = mainNav(page).getByRole('link');
    await expect(links).toHaveText(sections.map(([name]) => name));
    for (const [index, [name, href]] of sections.entries()) {
      const link = links.nth(index);
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toBeInViewport({ ratio: 1 });
      if (name === current)
        await expect(link).toHaveAttribute('aria-current', 'page');
      else await expect(link).not.toHaveAttribute('aria-current');
    }
    // The panel opens over the page: nothing under it moves.
    expect(await page.locator('h1').first().boundingBox()).toEqual(heading);

    // A tap outside closes it.
    await page.mouse.click(phone.width / 2, phone.height - 40);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(mainNav(page)).toBeHidden();
  });
}

test('the phone menu works from the keyboard and closes on Escape', async ({
  page,
}) => {
  await page.setViewportSize(phone);
  await page.goto('/');
  const button = menuButton(page);
  const nav = mainNav(page);

  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  // Focus stays on the button, and the links come next.
  await expect(button).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'Docs' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'Components' })).toBeFocused();

  // Escape closes it and returns focus to the button, with a visible ring.
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toBeHidden();
  await expect(button).toBeFocused();
  expect(
    await button.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe('none');

  // Escape on the button itself closes it too.
  await page.keyboard.press('Space');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();

  // Tabbing on past the last control closes it.
  await page.keyboard.press('Enter');
  await page.getByRole('combobox', { name: 'Select theme' }).focus();
  await page.keyboard.press('Tab');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toBeHidden();
});

test('a link in the phone menu goes to its section', async ({ page }) => {
  await page.setViewportSize(phone);
  await page.goto('/');
  await menuButton(page).click();
  await mainNav(page).getByRole('link', { name: 'Pricing' }).click();
  await expect(page).toHaveURL(/\/pricing\/$/);
  // Back on the home page, the menu is closed.
  await page.goBack();
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(mainNav(page)).toBeHidden();
});

test('the phone menu holds the theme switch', async ({ page }) => {
  await page.setViewportSize(phone);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/pricing/');
  await menuButton(page).click();
  await page
    .getByRole('combobox', { name: 'Select theme' })
    .selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test("docs pages keep Starlight's menu, and the splash button sits in its place", async ({
  page,
}) => {
  await page.setViewportSize(phone);
  await page.goto('/docs/');
  // One menu button, Starlight's, and it opens the sidebar.
  await expect(menuButton(page)).toHaveCount(1);
  await expect(page.locator('[data-menu-button]')).toHaveCount(0);
  const docs = await menuButton(page).boundingBox();
  await menuButton(page).click();
  await expect(
    page.locator('#starlight__sidebar').getByRole('link', {
      name: 'Installation',
    }),
  ).toBeVisible();

  await page.goto('/');
  const splash = await menuButton(page).boundingBox();
  expect(splash).not.toBeNull();
  expect(docs).not.toBeNull();
  if (!splash || !docs) return;
  for (const side of ['x', 'y', 'width', 'height'] as const)
    expect(Math.abs(splash[side] - docs[side]), side).toBeLessThanOrEqual(1);
});

test('on a wide screen the header shows the links, with no menu', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(menuButton(page)).toBeHidden();
  await expect(mainNav(page).getByRole('link')).toHaveText(
    sections.map(([name]) => name),
  );

  // A menu left open on a phone closes when the page widens.
  await page.setViewportSize(phone);
  await menuButton(page).click();
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('[data-menu-button]')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(mainNav(page).getByRole('link')).toHaveText(
    sections.map(([name]) => name),
  );
});
