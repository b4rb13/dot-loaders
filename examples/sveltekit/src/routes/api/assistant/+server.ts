import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// A slow API, so the placeholders show for a moment.
export const POST: RequestHandler = async ({ request }) => {
  const { question } = (await request.json()) as { question?: unknown };
  if (typeof question !== 'string' || !question) error(400, 'Ask a question');
  await new Promise((resolve) => setTimeout(resolve, 900));
  return json({
    reply: 'The Globex invoice was due on Oct 28 and is now overdue.',
  });
};
