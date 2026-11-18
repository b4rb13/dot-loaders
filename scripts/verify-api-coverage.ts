import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript-min';

const root = resolve(import.meta.dir, '..');
const read = (path: string) => Bun.file(resolve(root, path)).json();
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const registry = await read('docs/implementation/m4/api-coverage.json');
const inventory = await read(registry.sourceInventory);
const originals = new Map<
  string,
  { clause: string; source: string; section: string }
>(
  inventory.requirements.map(
    (row: { id: string; clause: string; source: string; section: string }) => [
      row.id,
      row,
    ],
  ),
);
if (originals.size !== 717 || registry.sourceBlockCount !== 717)
  throw Error('Lossless inventory changed');
const apiIds = inventory.requirements
  .filter((row: { id: string }) => row.id.startsWith('api-'))
  .map((row: { id: string }) => row.id)
  .sort();
if (
  JSON.stringify(apiIds) !==
  JSON.stringify(
    registry.clauses
      .filter((row: { id: string }) => row.id.startsWith('api-'))
      .map((row: { id: string }) => row.id)
      .sort(),
  )
)
  throw Error('Every API clause must have an explicit review disposition');
const ids = new Set<string>();
for (const row of registry.clauses) {
  const original = originals.get(row.id);
  if (
    ids.has(row.id) ||
    !original ||
    row.clauseSha256 !== hash(original.clause) ||
    row.source !== original.source ||
    row.section !== original.section ||
    row.fullClauseStatus !== 'unverified'
  )
    throw Error(`Invalid requirement mapping: ${row.id}`);
  ids.add(row.id);
  if (row.coverageGroup && !registry.coverageGroups[row.coverageGroup])
    throw Error(`Unknown coverage group: ${row.id}`);
}
const referenceFiles: Record<string, string> = {};
for (const references of Object.values(registry.coverageGroups) as {
  path: string;
  contains: string;
}[][])
  for (const reference of references) {
    const text = await readFile(resolve(root, reference.path), 'utf8');
    if (!text.includes(reference.contains))
      throw Error(
        `Stale example/check pointer: ${reference.path}: ${reference.contains}`,
      );
    referenceFiles[reference.path] = hash(text);
  }
if (Object.keys(registry.components).length !== 9)
  throw Error('Incomplete component inventory');
const entries: { key: string; declaration?: string; asset?: string }[] = [];
for (const pkg of ['core', 'react']) {
  const manifest = await read(`packages/${pkg}/package.json`);
  if (
    !manifest.private ||
    manifest.scripts.prepublishOnly !==
      `node -e "throw new Error('npm publishing is disabled during private validation')"`
  )
    throw Error('Publication guard changed');
  for (const [path, target] of Object.entries(manifest.exports) as [
    string,
    string | { types: string },
  ][]) {
    const key = `${pkg}:${path}`;
    if (!registry.entries[key]) throw Error(`Unreviewed export: ${key}`);
    if (typeof target === 'string')
      entries.push({
        key,
        asset: `packages/${pkg}/${target.replace(/^\.\//, '')}`,
      });
    else
      entries.push({
        key,
        declaration: `packages/${pkg}/${target.types.replace(/^\.\//, '')}`,
      });
  }
}
if (entries.length !== Object.keys(registry.entries).length)
  throw Error('Stale export mapping');
const program = ts.createProgram(
  entries.flatMap((entry) =>
    entry.declaration ? [resolve(root, entry.declaration)] : [],
  ),
  {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: false,
  },
);
const checker = program.getTypeChecker();
const exported = [];
for (const entry of entries) {
  const path = entry.declaration ?? entry.asset;
  if (!path) throw Error('Missing export target');
  const text = await readFile(resolve(root, path), 'utf8');
  const source = entry.declaration
    ? program.getSourceFile(resolve(root, path))
    : undefined;
  const symbol = source ? checker.getSymbolAtLocation(source) : undefined;
  if (entry.declaration && !symbol)
    throw Error(`Missing declared module: ${entry.key}`);
  exported.push({
    ...entry,
    sha256: hash(text),
    exports: symbol
      ? checker
          .getExportsOfModule(symbol)
          .map((item) => item.name)
          .sort()
      : [],
  });
}
for (const extension of registry.ownerAuthorizedExtensions ?? []) {
  const entry = exported.find((item) => item.key === extension.entry);
  if (
    !entry ||
    extension.exports.some((name: string) => !entry.exports.includes(name))
  )
    throw Error(`Missing additive API extension: ${extension.id}`);
  for (const ref of extension.references) {
    const text = await readFile(resolve(root, ref.path), 'utf8');
    if (!text.includes(ref.contains))
      throw Error(`Stale additive API example: ${ref.path}`);
    referenceFiles[ref.path] = hash(text);
  }
}
for (const component of Object.values(registry.components) as {
  coverageGroups: string[];
}[])
  for (const group of component.coverageGroups)
    if (!registry.coverageGroups[group])
      throw Error('Incomplete component checks');
const finalReview = await read(
  'docs/implementation/m4/final-review-matrix.json',
);
if (
  finalReview.rows.length !== 10 ||
  finalReview.featureFreeze !== false ||
  finalReview.contractAmendment !== false
)
  throw Error('Invalid final scoped review');
for (const row of finalReview.rows) {
  if (
    !['implemented-local', 'held-owner', 'held-qualification'].includes(
      row.disposition,
    )
  )
    throw Error('Invalid review disposition');
  for (const ref of row.references) {
    const text = await readFile(resolve(root, ref.path), 'utf8');
    if (!text.includes(ref.contains))
      throw Error(`Stale final review: ${ref.path}`);
    referenceFiles[ref.path] = hash(text);
  }
}
for (const key of Object.keys(registry.retiredPrivateEntries))
  if (registry.entries[key] || entries.some((entry) => entry.key === key))
    throw Error('Retired private entry returned');
const report = {
  schemaVersion: 1,
  recordedAt: new Date().toISOString(),
  status: 'index-integrity-pass',
  scope: registry.scope,
  sourceBlocksRetained: 717,
  apiClausesIndexed: apiIds.length,
  selectedMotionClausesIndexed: registry.clauses.length - apiIds.length,
  components: Object.keys(registry.components),
  entries: exported,
  references: referenceFiles,
  ownerAuthorizedExtensions: registry.ownerAuthorizedExtensions ?? [],
  finalReview: {
    path: 'docs/implementation/m4/final-review-matrix.json',
    rows: finalReview.rows,
    sha256: hash(
      await readFile(
        resolve(root, 'docs/implementation/m4/final-review-matrix.json'),
        'utf8',
      ),
    ),
  },
  registrySha256: hash(
    await readFile(
      resolve(root, 'docs/implementation/m4/api-coverage.json'),
      'utf8',
    ),
  ),
  limitations: registry.remaining,
};
await mkdir(resolve(root, '.artifacts/m4-api'), { recursive: true });
await writeFile(
  resolve(root, '.artifacts/m4-api/coverage-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  `API index integrity: ${apiIds.length} API clauses, ${registry.clauses.length - apiIds.length} selected motion blocks, ${entries.length} exports, nine components. This does not qualify whole clauses or omitted environments.`,
);
