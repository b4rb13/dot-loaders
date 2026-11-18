import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { DocumentPolicy } from './policy';
export default async function Layout({ children }: { children: ReactNode }) {
  const request = await headers();
  const nonce = request.get('x-nonce');
  if (!nonce) throw new Error('The CSP proxy must run before rendering');
  const policy =
    request.get('x-style-mode') === 'nonce'
      ? { mode: 'inline' as const, nonce }
      : { mode: 'external' as const, href: '/dotquilt/region.css' };
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/app.css" />
      </head>
      <body>
        <DocumentPolicy value={policy}>{children}</DocumentPolicy>
      </body>
    </html>
  );
}
