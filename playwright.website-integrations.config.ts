import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const report = JSON.parse(
  readFileSync('.artifacts/m5-semantic-guides/examples.json', 'utf8'),
);
export default defineConfig({
  testDir: 'tests/website-integrations',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  retries: 0,
  outputDir: '.artifacts/m5-semantic-guides/apps-browser',
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m5-semantic-guides/apps-browser.json' }],
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  use: { trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'bun run start',
      cwd: report.consumers['react-ssr'],
      port: 4233,
      reuseExistingServer: false,
    },
    {
      command: 'bun run start',
      cwd: report.consumers['semantic-mixed'],
      port: 4236,
      reuseExistingServer: false,
    },
    {
      command:
        'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4234',
      cwd: report.consumers['next-app'],
      port: 4234,
      reuseExistingServer: false,
    },
  ],
});
