import { getEntry } from 'astro:content';
import type { APIRoute } from 'astro';
import { cardFor } from '../lib/cards';
import { renderCard } from '../lib/og';

/**
 * The home page's card at a fixed address, /og.png: the image named in the
 * JSON-LD, and the one links shared before per-page cards existed point to.
 */
export const GET: APIRoute = async () => {
  const home = await getEntry('docs', 'index');
  if (!home) throw new Error('The home page entry is missing.');
  return new Response(await renderCard(cardFor(home)), {
    headers: { 'content-type': 'image/png' },
  });
};
