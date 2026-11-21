import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const members: Record<string, { name: string; role: string; bio: string }> = {
  ada: {
    name: 'Ada Lovelace',
    role: 'Engineering lead',
    bio: 'Ada leads the platform team and writes the first draft of every plan.',
  },
};

// A slow API, so the placeholders show for a moment.
export const GET: RequestHandler = async ({ params }) => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const member = members[params.id];
  if (!member) error(404, 'No such member');
  return json(member);
};
