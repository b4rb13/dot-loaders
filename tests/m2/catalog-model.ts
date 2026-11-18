export const individualFamilies = [
  'block',
  'line',
  'circle',
  'multiline',
  'text',
  'chart-line',
  'chart-bar',
  'chart-scatter',
  'table',
  'typing',
  'region',
] as const;
export type CatalogFamily = (typeof individualFamilies)[number];
export const dashboardGroups = [
  ['chart-line', 'block', 'line'],
  ['chart-bar', 'block', 'line'],
  ['chart-scatter', 'block', 'line'],
  ['table', 'block', 'line'],
  ['table', 'circle', 'multiline', 'typing'],
  ['table', 'circle', 'multiline', 'typing'],
] as const satisfies readonly (readonly CatalogFamily[])[];
export const dashboardFamilies: readonly CatalogFamily[] = [
  ...dashboardGroups.flat(),
  'text',
  'text',
  'text',
  'text',
];
export const catalogCounts = (families: readonly CatalogFamily[]) =>
  Object.fromEntries(
    individualFamilies.map((family) => [
      family,
      families.filter((f) => f === family).length,
    ]),
  );
