import { describe, expect, test } from 'bun:test';
import { catalog } from './catalog';
import { checkPreviewStyles, previewStyleFiles } from './preview-assets';

describe('website preview stylesheet guard', () => {
  test('Quickstart requires exactly the two styles used by its composition', () => {
    expect(previewStyleFiles('quickstart')).toEqual([
      '/dotquilt/region.css',
      '/dotquilt/skeleton-text.css',
    ]);
  });
  test('each component checks only its own fixed same-origin stylesheet set', async () => {
    for (const item of catalog) {
      const urls: string[] = [];
      const signal = new AbortController().signal;
      await checkPreviewStyles(item.slug, signal, async (url, init) => {
        urls.push(url);
        expect(init.signal).toBe(signal);
        return new Response(':host{display:block}', {
          headers: { 'content-type': 'text/css; charset=utf-8' },
        });
      });
      expect(urls).toEqual(previewStyleFiles(item.slug));
      expect(new Set(urls).size).toBe(urls.length);
      expect(urls.every((url) => /^\/dotquilt\/[a-z-]+\.css$/.test(url))).toBe(
        true,
      );
      expect(urls).toHaveLength(
        item.family === 'text' ? 1 : item.family === 'typing' ? 2 : 3,
      );
    }
  });
  test('HTTP failures, HTML replacements, empty CSS and aborted requests cannot enable a preview', async () => {
    for (const response of [
      new Response('not found', { status: 404 }),
      new Response('<!doctype html>', {
        headers: { 'content-type': 'text/html' },
      }),
      new Response('  ', { headers: { 'content-type': 'text/css' } }),
    ])
      await expect(
        checkPreviewStyles(
          'text-loader',
          new AbortController().signal,
          async () => response,
        ),
      ).rejects.toThrow();
    const controller = new AbortController();
    controller.abort();
    await expect(
      checkPreviewStyles(
        'text-loader',
        controller.signal,
        async (_url, init) => {
          init.signal.throwIfAborted();
          throw new Error('unreachable');
        },
      ),
    ).rejects.toThrow();
  });
});
