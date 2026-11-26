import type { APIRoute } from 'astro';
import { touchIcon } from '../lib/icons';

/** /apple-touch-icon.png: iOS home screens and iMessage (lib/icons.ts). */
export const GET: APIRoute = () =>
  new Response(touchIcon(), {
    headers: { 'content-type': 'image/png' },
  });
