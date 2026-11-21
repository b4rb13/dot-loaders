import { json } from '@sveltejs/kit';

// A slow API, so the placeholders show for a moment.
export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return json({ total: 48120 });
}
