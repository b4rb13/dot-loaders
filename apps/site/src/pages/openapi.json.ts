import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import core from '../../../../packages/core/package.json';
import { openApi } from '../lib/agent-api';

/**
 * /openapi.json: the OpenAPI 3.1 description of the site's read-only
 * endpoints for agents (lib/agent-api.ts). vercel.json serves it as
 * application/vnd.oai.openapi+json.
 */
export const GET: APIRoute = async () => {
  const ids = (await getCollection('docs'))
    .map((entry) => entry.id)
    .filter((id) => id !== '404');
  return new Response(
    `${JSON.stringify(openApi(ids, core.version), null, 2)}\n`,
    { headers: { 'content-type': 'application/json' } },
  );
};
