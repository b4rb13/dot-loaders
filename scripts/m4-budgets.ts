/** Approved hard limits, independent of the producer's reported pass flags. */
// https://github.com/b4rb13/dot-loaders/issues/9#issuecomment-6226666680
const limits: Readonly<Record<string, number>> = {
  block: 6144,
  line: 6144,
  circle: 6144,
  multiline: 8192,
  typing: 4096,
  text: 10240,
  chart: 12288,
  table: 12288,
  skeletonFamily: 10240,
};
interface Row {
  gzip: number;
  external: number;
  limit?: number;
  pass?: boolean;
  sharedExternal?: number;
  sharedPass?: boolean;
  increment?: number;
  externalIncrement?: number;
  sharedExternalIncrement?: number;
  incrementLimit?: number;
  incrementPass?: boolean;
}
export function m4BudgetFailures(sizes: Record<string, Row>): string[] {
  const failures: string[] = [];
  const required = new Set<string>();
  for (const [family, limit] of Object.entries(limits)) {
    for (const entry of ['root', 'family']) {
      const key = `${family}-${entry}`;
      const native = sizes[`${key}-native`];
      const react = sizes[`${key}-react`];
      for (const [name, row] of [
        [`${key}-native`, native],
        [`${key}-react`, react],
      ] as const) {
        required.add(name);
        if (
          !row ||
          !Number.isSafeInteger(row.gzip) ||
          row.gzip < 0 ||
          !Number.isSafeInteger(row.external) ||
          row.external < row.gzip
        )
          throw new Error(`Missing or invalid M4 size row: ${name}`);
        if (
          family === 'skeletonFamily' &&
          (!Number.isSafeInteger(row.sharedExternal) ||
            (row.sharedExternal ?? 0) < row.gzip)
        )
          throw new Error(
            `Missing real shared stylesheet measurement: ${name}`,
          );
      }
      if (!native || !react) throw new Error(`Missing ${key}`);
      const pass = native.external <= limit;
      const sharedPass =
        family !== 'skeletonFamily' ||
        (native.sharedExternal ?? Infinity) <= limit;
      if (
        native.limit !== limit ||
        native.pass !== pass ||
        (family === 'skeletonFamily' && native.sharedPass !== sharedPass)
      )
        throw new Error(`Changed ceiling or inconsistent status: ${key}`);
      if (!pass || !sharedPass) failures.push(`${key}-native`);
      const increment = react.gzip - native.gzip;
      const externalIncrement = react.external - native.external;
      const sharedIncrement =
        family === 'skeletonFamily'
          ? (react.sharedExternal ?? Infinity) - (native.sharedExternal ?? 0)
          : 0;
      const incrementPass =
        Math.max(increment, externalIncrement, sharedIncrement) <= 2048;
      if (
        react.increment !== increment ||
        react.externalIncrement !== externalIncrement ||
        react.incrementLimit !== 2048 ||
        react.incrementPass !== incrementPass ||
        (family === 'skeletonFamily' &&
          react.sharedExternalIncrement !== sharedIncrement)
      )
        throw new Error(`Invalid matched React measurement: ${key}`);
      if (!incrementPass) failures.push(`${key}-react`);
    }
  }
  if (Object.keys(sizes).some((key) => !required.has(key)))
    throw new Error(
      'Unexpected M4 budget row; update the explicit policy before changing coverage',
    );
  return failures;
}
