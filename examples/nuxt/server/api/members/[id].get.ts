const members: Record<string, { name: string; role: string; bio: string }> = {
  ada: {
    name: 'Ada Lovelace',
    role: 'Engineering lead',
    bio: 'Wrote the first program, long before there was a machine to run it.',
  },
};

// A slow API, so the placeholders show for a moment.
export default defineEventHandler(async (event) => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const member = members[getRouterParam(event, 'id') ?? ''];
  if (!member)
    throw createError({ statusCode: 404, statusMessage: 'No such member' });
  return member;
});
