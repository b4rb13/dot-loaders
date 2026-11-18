import { defineConfig } from '@playwright/test';
import base from './playwright.table.config.js';
export default defineConfig({
  ...base,
  testMatch: 'options.check.ts',
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m4/table-options-results.json' }],
  ],
  outputDir: '.artifacts/m4/table-options-results',
});
