import { RenderMode, type ServerRoute } from '@angular/ssr';

// Rendered per request, like the Next.js and Nuxt examples.
export const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Server },
];
