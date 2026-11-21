import { json } from '@sveltejs/kit';
import { revenue } from '#lib/docs/data.ts';

// A slow API, so the placeholders show for a moment.
export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return json(revenue);
}
