import { expect, test } from '@playwright/test';
import { type ElementSpec, elements } from '../../packages/core/meta/elements';
import { components } from './pages';

// The API reference (/docs/api/) is generated from the element descriptions
// in packages/core/meta/elements.ts. Nothing there may be missing from the
// page or its Markdown copy, and the docs link to it.

/** What an element's section must show, each as code. */
const expected = (element: ElementSpec) => [
  `<${element.tag}>`,
  element.className,
  element.register,
  ...element.properties.flatMap((property) =>
    property.attribute ? [property.name, property.attribute] : [property.name],
  ),
  ...element.connectAttributes.map((attribute) => attribute.name),
  ...element.events.flatMap((event) => [event.name, event.detail.name]),
  ...element.slots.flatMap((slot) => (slot.name ? [slot.name] : [])),
  ...element.parts.map((part) => part.name),
  ...element.cssProperties.map((css) => css.name),
];
const fields = [
  ...new Set(
    elements.flatMap((element) =>
      element.events.flatMap((event) =>
        event.detail.fields.map(
          (field) => `${field.name}${field.optional ? '?' : ''}`,
        ),
      ),
    ),
  ),
];

test('the API reference shows every element, attribute and event in elements.ts', async ({
  page,
}) => {
  await page.goto('/docs/api/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Dotquilt API reference',
  );
  // The code under each section heading, in page order.
  const sections = await page.evaluate(() => {
    const found: Record<string, string[]> = {};
    let heading = '';
    for (const node of document.querySelectorAll(
      '.sl-markdown-content :is(h2, code)',
    ))
      if (node.localName === 'h2') {
        heading = node.textContent?.trim() ?? '';
        found[heading] = [];
      } else found[heading]?.push(node.textContent ?? '');
    return found;
  });
  for (const element of elements) {
    const shown = sections[element.className] ?? [];
    expect(
      expected(element).filter((name) => !shown.includes(name)),
      element.tag,
    ).toEqual([]);
  }
  const details = sections['Event detail'] ?? [];
  expect(fields.filter((field) => !details.includes(field))).toEqual([]);

  // Links within the page land on a heading; the guides they name exist.
  const links = await page
    .locator(
      '.sl-markdown-content a[href^="/"], .sl-markdown-content a[href^="#"]',
    )
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute('href') ?? ''),
    );
  for (const href of new Set(links))
    if (href.startsWith('#'))
      await expect(page.locator(`[id="${href.slice(1)}"]`), href).toHaveCount(
        1,
      );
    else expect((await page.request.get(href)).ok(), href).toBe(true);

  // It sits in the sidebar, and only the elements are in "On this page".
  await expect(
    page.locator('nav.sidebar a[href="/docs/api/"][aria-current="page"]'),
  ).toHaveText('API reference');
  await expect(page.locator('starlight-toc a')).toHaveText([
    'Overview',
    'Elements',
    'Framework components',
    'Event detail',
    ...elements.map((element) => element.className),
  ]);
});

test('its Markdown copy holds the same, and llms.txt lists it', async ({
  request,
}) => {
  const markdown = await (await request.get('/docs/api.md')).text();
  expect(markdown.startsWith('# Dotquilt API reference\n')).toBe(true);
  const section = (heading: string) => {
    const start = markdown.indexOf(`\n## ${heading}\n`);
    expect(start, heading).toBeGreaterThan(-1);
    const end = markdown.indexOf('\n## ', start + 1);
    return markdown.slice(start, end < 0 ? undefined : end);
  };
  for (const element of elements) {
    const text = section(element.className);
    expect(
      expected(element).filter((name) => !text.includes(`\`${name}\``)),
      element.tag,
    ).toEqual([]);
  }
  const details = section('Event detail');
  expect(fields.filter((field) => !details.includes(`\`${field}\``))).toEqual(
    [],
  );

  const index = await (await request.get('/llms.txt')).text();
  expect(index).toContain(
    '## Reference\n\n- [Dotquilt API reference](https://dotquilt.dev/docs/api.md)',
  );
});

test('each component page links its options to the API reference', async ({
  page,
}) => {
  for (const name of components) {
    const path = `/docs/components/${name}/`;
    // The elements this page documents, by their section's id.
    const ids = elements
      .filter((element) => new URL(element.docs).pathname === path)
      .map((element) => element.className.toLowerCase());
    expect(ids.length, path).toBeGreaterThan(0);
    await page.goto(path);
    const href = await page
      .locator('.sl-markdown-content')
      .getByRole('link', { name: 'API reference' })
      .getAttribute('href');
    expect(
      ids.map((id) => `/docs/api/#${id}`),
      path,
    ).toContain(href);
  }
});
