import { defineConfig } from '@playwright/test';
import base from './playwright.m4.config.js';
export default defineConfig({
  ...base,
  testMatch: 'chart-options.check.ts',
  reporter: [
    ['list'],
    ['json', { outputFile: '.artifacts/m4/chart-options-results.json' }],
  ],
  outputDir: '.artifacts/m4/chart-options-results',
});
