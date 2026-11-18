import { expect, test } from 'bun:test';
import { renderStatic } from '../dist/server.js';

test('static catalog defaults and admitted maxima fit raw markup ceilings', () => {
  for (const kind of [
    'skeleton-line',
    'skeleton-circle',
    'skeleton-text',
    'typing-dots',
  ] as const) {
    const html = renderStatic({ kind });
    const raw = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
    expect(new TextEncoder().encode(raw).length).toBeLessThanOrEqual(1024);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('style=');
    expect(html).not.toContain('animation:');
  }
  const multiline = renderStatic({
    kind: 'skeleton-text',
    lines: 500000,
    widths: [0.25, 0, Number.NaN],
  });
  expect(multiline.match(/data-dotquilt-static-line/g)?.length).toBe(52); // markup plus two exact CSS selectors
  expect(multiline).toContain('width="25%"');
  expect(multiline).toContain('width="60%"');
  expect(multiline).not.toContain('NaN');
  expect(
    multiline.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '').length,
  ).toBeLessThanOrEqual(16384);
  const typing = renderStatic({ kind: 'typing-dots', count: 100000 });
  expect(typing.match(/<i /g)?.length).toBe(8);
});

test('static catalog scopes CSS by host and carries request policies without inline attributes', () => {
  for (const kind of [
    'skeleton-line',
    'skeleton-circle',
    'skeleton-text',
    'typing-dots',
  ] as const) {
    const html = renderStatic({
      kind,
      stylePolicy: { mode: 'inline', nonce: '<one>' },
    });
    expect(html).toContain('nonce="&lt;one&gt;"');
    const external = renderStatic({
      kind,
      stylePolicy: { mode: 'external', href: '/catalog.css' },
    });
    expect(external).toContain('href="/catalog.css"');
    expect(external).not.toContain('<style');
  }
});
