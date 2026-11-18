import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/website',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: '.artifacts/m5-start/browser',
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m5-start/browser-results.json' }],
  ],
  use: { baseURL: 'http://127.0.0.1:4210', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'bun run --cwd apps/website start',
    url: 'http://127.0.0.1:4210',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
