import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const artifact = JSON.parse(
  readFileSync(
    new URL('./.artifacts/m3/packed-react-report.json', import.meta.url),
    'utf8',
  ),
);
export default defineConfig({
  metadata: {
    nativeArtifactSha256: artifact.native.sha256,
    reactArtifactSha256: artifact.sha256,
    versions: artifact.versions,
  },
  outputDir: '.artifacts/m3/react-test-results',
  testDir: './tests/react',
  testMatch: '**/*.spec.ts',
  timeout: 20000,
  workers: 1,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: '.artifacts/m3/browser-results.json',
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4191',
    headless: true,
    reducedMotion: 'no-preference',
  },
  projects: ['current', 'floor', 'minor1', 'minor2'].flatMap((line) =>
    (['chromium', 'firefox', 'webkit'] as const).map((browserName) => ({
      name: `${browserName}-${line}`,
      use: { browserName },
    })),
  ),
  webServer: {
    command: 'bun tests/react/server.ts',
    port: 4191,
    reuseExistingServer: false,
  },
});
