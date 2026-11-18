import { asset } from './catalog-files';
import type { ComponentSlug } from './catalog-model';

export type PreviewComponent = ComponentSlug | 'quickstart';
export function previewStyleFiles(
  component: PreviewComponent,
): readonly string[] {
  if (component === 'quickstart')
    return ['/dotquilt/region.css', '/dotquilt/skeleton-text.css'];
  const families =
    component === 'text-loader'
      ? ['text']
      : ['region', asset(component), 'typing'];
  return [...new Set(families)].map((family) => `/dotquilt/${family}.css`);
}
type StyleRequest = (
  url: string,
  init: { signal: AbortSignal },
) => Promise<Response>;
// Website enhancement guard only. It never controls package readiness or its clock.
export async function checkPreviewStyles(
  component: PreviewComponent,
  signal: AbortSignal,
  request: StyleRequest = fetch,
): Promise<void> {
  await Promise.all(
    previewStyleFiles(component).map(async (url) => {
      const response = await request(url, { signal });
      if (
        !response.ok ||
        !response.headers
          .get('content-type')
          ?.toLowerCase()
          .startsWith('text/css') ||
        !(await response.text()).trim()
      )
        throw new Error('Preview stylesheet unavailable');
    }),
  );
}
