// A slow API, so the placeholders show for a moment.
export default defineEventHandler(async (event) => {
  const { question } = (await readBody<{ question?: unknown }>(event)) ?? {};
  if (typeof question !== 'string' || !question)
    throw createError({ statusCode: 400, statusMessage: 'Ask a question' });
  await new Promise((resolve) => setTimeout(resolve, 900));
  return { reply: 'The Globex invoice was due on Oct 28 and is now overdue.' };
});
