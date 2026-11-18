import type { CatalogComponent } from './catalog';

export function componentControls(
  item: CatalogComponent,
): readonly (readonly string[])[] {
  return [
    ...item.controls,
    ...(item.family !== 'region'
      ? [['speed', 'positive number, at most 4', '1']]
      : []),
    ...(item.family !== 'typing' && item.family !== 'region'
      ? [
          ['pointerResponse', 'none | lift', 'none'],
          [
            'animations',
            'independent typed idle / handoff bindings',
            'built-in phases',
          ],
        ]
      : item.family === 'region'
        ? [['animations', 'handoff-only region binding', 'built-in handoff']]
        : []),
    ['preset', `immutable ${item.family} preset`, 'omitted'],
    ['motion', 'system | paused', 'system'],
    ['stylePolicy', 'inline with optional nonce | external href', 'inline'],
  ];
}
