import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
import base from './playwright.m4.config.js';

const reference = process.env.DOTQUILT_CHART_REFERENCE === '1';
const dir = `.artifacts/m4/chart-size-development/deterministic-${reference ? 'reference' : 'current'}`;
const port = reference ? 4195 : 4194;
const packet = JSON.parse(
  readFileSync(
    new URL(
      reference
        ? './.artifacts/evidence-runs/m4-chart-8f199142cd4d-1792206523796/.artifacts/m4/packed-report.json'
        : './.artifacts/m4/packed-report.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
export default defineConfig({
  ...base,
  metadata: {
    ...base.metadata,
    artifacts: packet.artifacts,
    inspection:
      'Final idle refresh at paused time; immutable original captures retained; no renderer qualification',
  },
  testMatch: 'chart.spec.ts',
  grep: /all six idle silhouettes and all three final geometries/,
  outputDir: `${dir}/test-results`,
  reporter: [['list'], ['json', { outputFile: `${dir}/results.json` }]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: reference
      ? 'bun .artifacts/m4/chart-size-development/baseline/server.ts'
      : 'bun tests/m4/server.ts',
    port,
    reuseExistingServer: true,
  },
});
