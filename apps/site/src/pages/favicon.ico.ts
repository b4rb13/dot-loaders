import type { APIRoute } from 'astro';
import { faviconIco } from '../lib/icons';

/** /favicon.ico, for crawlers and apps that ask for it by name (lib/icons.ts). */
export const GET: APIRoute = () =>
  new Response(faviconIco(), {
    headers: { 'content-type': 'image/x-icon' },
  });
