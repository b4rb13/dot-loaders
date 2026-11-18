import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const report = JSON.parse(
  readFileSync(
    new URL('./.artifacts/m3/next-consumers.json', import.meta.url),
    'utf8',
  ),
);
export default defineConfig({
  metadata: {
    nativeArtifactSha256: report.nativeSha256,
    reactArtifactSha256: report.reactSha256,
    versions: report.versions,
  },
  outputDir: '.artifacts/m3/next-test-results',
  testDir: './tests/next',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m3/next-browser-results.json' }],
  ],
  use: { headless: true, reducedMotion: 'no-preference' },
  projects: ['current', 'floor'].flatMap((line) =>
    (['chromium', 'firefox', 'webkit'] as const).map((browserName) => ({
      name: `${browserName}-${line}`,
      use: {
        browserName,
        baseURL: `http://127.0.0.1:${line === 'floor' ? '4193' : '4192'}`,
      },
    })),
  ),
  webServer: [
    {
      command: 'bun scripts/start-next.ts current',
      port: 4192,
      reuseExistingServer: false,
    },
    {
      command: 'bun scripts/start-next.ts floor',
      port: 4193,
      reuseExistingServer: false,
    },
  ],
});
