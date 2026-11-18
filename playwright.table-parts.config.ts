import { defineConfig } from '@playwright/test';
import base from './playwright.table.config.js';
export default defineConfig({
  ...base,
  testMatch: 'parts.check.ts',
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m4/table-parts-results.json' }],
  ],
  outputDir: '.artifacts/m4/table-parts-results',
});
