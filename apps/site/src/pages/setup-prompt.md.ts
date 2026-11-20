import type { APIRoute } from 'astro';
import prompt from '../prompts/setup.md?raw';

/**
 * The setup prompt as plain Markdown, for coding assistants that fetch it
 * ("Read https://dotquilt.dev/setup-prompt.md and follow it"). The docs page
 * docs/ai-setup shows the same file.
 */
export const GET: APIRoute = () =>
  new Response(prompt, {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
