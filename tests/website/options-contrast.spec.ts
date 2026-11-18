import { expect, test } from '@playwright/test';

test('numeric option defaults retain readable placeholder contrast', async ({
  page,
}) => {
  await page.goto('/playground/components/table-loader');
  await page
    .getByRole('combobox', { name: 'Animation mode', exact: true })
    .selectOption('custom');
  await page.getByText('Typed animation options', { exact: true }).click();
  const colors = await page
    .getByRole('spinbutton', { name: 'customReveal.duration', exact: true })
    .evaluate((el) => ({
      foreground: getComputedStyle(el, '::placeholder').color,
      background: getComputedStyle(el).backgroundColor,
      opacity: getComputedStyle(el, '::placeholder').opacity,
    }));
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)?.map(Number);
    if (!channels || channels.length < 3)
      throw new Error(`Unexpected color: ${color}`);
    return channels.slice(0, 3).reduce((sum, value, index) => {
      const c = value / 255;
      return (
        sum +
        (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) *
          ([0.2126, 0.7152, 0.0722][index] ?? 0)
      );
    }, 0);
  };
  expect(Number(colors.opacity)).toBe(1);
  const a = luminance(colors.foreground),
    b = luminance(colors.background);
  expect(
    (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
  ).toBeGreaterThanOrEqual(4.5);
});
