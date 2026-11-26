import type { APIRoute } from 'astro';
import { elements } from '../../../../packages/core/meta/elements';
import { customElementsManifest } from '../../../../scripts/element-manifest';

/**
 * /custom-elements.json: the elements' Custom Elements Manifest, from the
 * same element descriptions and generator as the one the `dotquilt` package
 * ships (scripts/build.ts), so agents can read the API without npm.
 */
export const GET: APIRoute = () =>
  new Response(
    `${JSON.stringify(customElementsManifest(elements), null, 2)}\n`,
    { headers: { 'content-type': 'application/json' } },
  );
