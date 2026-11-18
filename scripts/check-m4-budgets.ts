import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

import { m4BudgetFailures } from './m4-budgets.js';
import { m4SizeRegressions } from './m4-regressions.js';

const report = await Bun.file(
  new URL('../.artifacts/m4/packed-report.json', import.meta.url),
).json();
for (const artifact of Object.values(report.artifacts) as {
  path: string;
  sha256: string;
}[]) {
  if (
    createHash('sha256')
      .update(await readFile(artifact.path))
      .digest('hex') !== artifact.sha256
  )
    throw new Error('Stale M4 artifact report');
}
const failing = m4BudgetFailures(report.sizes);
const baseline = await Bun.file(
  new URL('../docs/implementation/m4/size-baseline.json', import.meta.url),
).json();
if (
  createHash('sha256')
    .update(await readFile(baseline.immutableReportPath))
    .digest('hex') !== baseline.reportSha256
)
  throw new Error('Durable M4 reference report changed or unavailable');
const introducedEntries = Object.keys(report.sizes).filter(
  (key) => !(key in baseline.sizes),
);
if (
  introducedEntries.some(
    (key) => !/^(text|chart|table)-(root|family)-(native|react)$/.test(key),
  )
)
  throw new Error('Unexpected unreviewed baseline entry');
const regressions = m4SizeRegressions(
  Object.fromEntries(
    Object.entries(report.sizes).filter(([key]) => key in baseline.sizes),
  ) as Parameters<typeof m4SizeRegressions>[0],
  baseline.sizes,
);
const history = await Promise.all(
  (baseline.history ?? []).map(
    async (record: { path: string; reportSha256: string }) => {
      const previous = await Bun.file(
        new URL(`../${record.path}`, import.meta.url),
      ).json();
      if (
        createHash('sha256')
          .update(await readFile(previous.immutableReportPath))
          .digest('hex') !== previous.reportSha256
      )
        throw new Error('Historical reference changed');
      return {
        artifacts: previous.artifacts,
        approval: baseline.source,
        approvalAppliesTo: baseline.artifacts,
        regressions: m4SizeRegressions(
          Object.fromEntries(
            Object.entries(report.sizes).filter(
              ([key]) => key in previous.sizes,
            ),
          ) as Parameters<typeof m4SizeRegressions>[0],
          previous.sizes,
        ),
      };
    },
  ),
);
const changes = Object.entries(report.sizes).flatMap(([key, value]) => {
  const row = value as Record<string, number>;
  return ['gzip', 'external', 'sharedExternal'].flatMap((metric) => {
    const after = row[metric];
    const before = baseline.sizes[key]?.[metric];
    return after === undefined || before === undefined
      ? []
      : [{ key, metric, before, after, delta: after - before }];
  });
});
await writeFile(
  new URL('../.artifacts/m4/size-regressions.json', import.meta.url),
  `${JSON.stringify(
    {
      artifacts: report.artifacts,
      baseline: baseline.artifacts,
      baselineReportSha256: baseline.reportSha256,
      lastRelease: baseline.lastRelease,
      lastReleaseReason: baseline.lastReleaseReason,
      changes,
      historicalComparisons: history,
      introducedEntries: {
        keys: introducedEntries,
        status: introducedEntries.length
          ? 'first measurement; baseline review pending'
          : 'none',
      },
      regressions,
      hardFailures: failing,
      result: failing.length
        ? 'fail'
        : regressions.length
          ? 'review-required'
          : 'pass',
      limitation:
        'Size comparison only; unfinished rich fixtures and M2 do not pass from this result.',
    },
    null,
    2,
  )}\n`,
);
if (failing.length)
  throw new Error(
    `M4 size gates fail (approved M4 amendment): ${failing.join(', ')}`,
  );
if (regressions.length)
  throw new Error(
    `M4 size regressions need explicit review: ${JSON.stringify(regressions)}`,
  );
console.log(
  'All recorded M4 slice size gates pass; full catalog qualification remains separate.',
);
