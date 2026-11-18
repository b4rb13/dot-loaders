import { describe, expect, test } from 'bun:test';
import {
  completeExample,
  defaults,
  parseSettings,
  previewVersion,
  settingsQuery,
} from './example';

describe('website example settings', () => {
  test('round-trips both integrations and all bounded line counts', () => {
    for (const integration of ['native', 'react'] as const)
      for (let lines = 1; lines <= 5; lines++) {
        const settings = { integration, lines };
        expect(parseSettings(settingsQuery(settings))).toEqual({
          settings,
          notice: '',
        });
      }
  });
  test('rejects oversized, duplicate, unknown and malformed values without executing input', () => {
    const base = `schema=1&version=${previewVersion}&integration=react&lines=`;
    for (const search of [
      'x'.repeat(513),
      `${base}0`,
      `${base}99`,
      `${base}3&lines=3`,
      `${base}3&autoplay=1`,
      `${base}%3Cscript%3E`,
      'schema=0',
    ]) {
      const parsed = parseSettings(search);
      expect(parsed.settings).toEqual(defaults);
      expect(parsed.notice).not.toBe('');
    }
  });
  test('empty query is static default configuration with no replay fields', () => {
    expect(parseSettings('')).toEqual({ settings: defaults, notice: '' });
    expect(settingsQuery(defaults)).not.toMatch(
      /motion|cycle|state|timer|focus|request/,
    );
  });
  test('complete native and React files include all local setup and explicit private dependencies', () => {
    for (const integration of ['native', 'react'] as const) {
      const files = completeExample({ integration, lines: 5 });
      expect(Object.keys(files)).toHaveLength(7);
      expect(
        files[`src/main.${integration === 'react' ? 'tsx' : 'ts'}`],
      ).toContain(integration === 'react' ? 'lines={5}' : 'skeleton.lines = 5');
      expect(files['package.json']).toContain('file:./vendor/');
      expect(
        JSON.parse(files['package.json'] ?? '{}').overrides[
          '@dotquilt-internal/core'
        ],
      ).toContain('file:./vendor/');
      expect(files['README.md']).toContain('Not published to npm');
      expect(files['public/index.html']).toContain('Loading should feel');
      expect(files['serve.ts']).toContain('new Set');
    }
  });
});
