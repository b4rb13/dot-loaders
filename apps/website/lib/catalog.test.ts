import { describe, expect, test } from 'bun:test';
import {
  catalog,
  catalogDefaults,
  catalogQuery,
  parseCatalogQuery,
} from './catalog';
import { catalogFiles } from './catalog-files';
import { projectChart } from './catalog-geometry';

describe('catalog configuration and complete files', () => {
  test('all nine components round-trip bounded configuration without requests or motion state', () => {
    expect(catalog).toHaveLength(9);
    expect(new Set(catalog.map((x) => x.slug)).size).toBe(9);
    for (const item of catalog)
      for (const integration of ['native', 'react'] as const) {
        const settings = {
          ...catalogDefaults(item.slug),
          integration,
          idle: item.idles.at(-1) ?? 'default',
          reveal: item.reveals.at(-1) ?? 'default',
        };
        expect(
          parseCatalogQuery(`?${catalogQuery(settings)}`, item.slug),
        ).toEqual({ settings, notice: '' });
        expect(catalogQuery(settings)).not.toContain('cycle=');
        expect(catalogQuery(settings)).not.toContain('state=');
      }
  });
  test('malformed, duplicate, unknown, mismatched and executable-looking links recover statically', () => {
    const base = catalogQuery(catalogDefaults('chart-loader'));
    for (const q of [
      `?${base}&idle=scan`,
      `?${base}&state=pending`,
      `?${base.replace('variant=line', 'variant=javascript%3Aalert(1)')}`,
      `?${base.replace('schema=3', 'schema=9')}`,
      `?${base.replace('component=chart-loader', 'component=table-loader')}`,
      `?${'a'.repeat(1025)}`,
    ]) {
      const result = parseCatalogQuery(q, 'chart-loader');
      expect(result.notice).not.toBe('');
      expect(result.settings).toEqual(catalogDefaults('chart-loader'));
    }
  });
  test('three chart providers describe the same explicit eight-sample application geometry', () => {
    for (const variant of ['line', 'bar', 'scatter'] as const) {
      const geometry = projectChart({ width: 320, height: 180 }, variant);
      expect(geometry.kind).toBe(variant);
      if (geometry.kind === 'bar') {
        expect(geometry.bars).toHaveLength(8);
        expect(geometry.bars.every((b) => b.width > 0 && b.height > 0)).toBe(
          true,
        );
      } else expect(geometry.points).toHaveLength(8);
    }
  });
  test('every file set has explicit private setup and includes application helpers', () => {
    const sources = {
      'src/lib/catalog-model.ts': 'model source',
      'src/components/catalog-scene.tsx': 'scene source',
      'public/catalog.css': 'styles',
    };
    for (const item of catalog)
      for (const integration of ['native', 'react'] as const) {
        const files = catalogFiles(
          { ...catalogDefaults(item.slug), integration },
          sources,
        );
        expect(JSON.parse(files['package.json'] ?? '{}').private).toBe(true);
        expect(files['styles.ts']).toContain('/styles/');
        expect(files['README.md']).toContain('not published');
        expect(files['src/lib/catalog-model.ts']).toBe('model source');
        expect(
          files[`src/main.${integration === 'react' ? 'tsx' : 'ts'}`],
        ).toContain('ready');
        expect(Boolean(files['src/components/catalog-scene.tsx'])).toBe(
          integration === 'react',
        );
      }
  });
});
