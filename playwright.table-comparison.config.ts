import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
import base from './playwright.table.config.js';

export function tableComparison(reference = false) {
  const dir = `.artifacts/m4/table-size-work/deterministic/${reference ? 'reference' : 'current'}`;
  const packet = JSON.parse(
    readFileSync(
      new URL(
        reference
          ? './.artifacts/m4/table-size-work/before-packed.json'
          : './.artifacts/m4/packed-report.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const port = reference ? 4198 : 4197;
  return defineConfig({
    ...base,
    metadata: {
      artifacts: packet.artifacts,
      inspection:
        'Controlled final idle refresh and explicit handoff/WAAPI presentation time; owner visual approval separate',
    },
    testMatch: 'comparison.check.ts',
    outputDir: `${dir}/test-results`,
    reporter: [['list'], ['json', { outputFile: `${dir}/results.json` }]],
    use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
    webServer: {
      command: reference
        ? 'bun .artifacts/m4/table-size-work/deterministic/reference/server.ts'
        : 'bun tests/table/server.ts',
      port,
      reuseExistingServer: false,
    },
  });
}
export default tableComparison();
