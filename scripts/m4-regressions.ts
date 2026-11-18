interface SizeRow {
  gzip: number;
  external: number;
  sharedExternal?: number;
}

/** Compare complete matched closures; a new ceiling never erases the reference. */
export function m4SizeRegressions(
  current: Readonly<Record<string, SizeRow>>,
  reference: Readonly<Record<string, SizeRow>>,
): { key: string; metric: string; before: number; after: number }[] {
  const regressions = [];
  for (const [key, previous] of Object.entries(reference)) {
    const next = current[key];
    if (!next) throw new Error(`Missing regression consumer: ${key}`);
    for (const metric of ['gzip', 'external', 'sharedExternal'] as const) {
      const before = previous[metric];
      if (before === undefined && metric === 'sharedExternal') continue;
      const after = next[metric];
      if (
        before === undefined ||
        after === undefined ||
        !Number.isSafeInteger(before) ||
        !Number.isSafeInteger(after) ||
        before < 0 ||
        after < 0
      )
        throw new Error(`Invalid regression measurement: ${key}/${metric}`);
      const delta = after - before;
      if (delta >= 256 && delta * 100 >= before * 5)
        regressions.push({ key, metric, before, after });
    }
  }
  if (Object.keys(current).some((key) => !(key in reference)))
    throw new Error('New consumer needs explicit baseline review');
  return regressions;
}
