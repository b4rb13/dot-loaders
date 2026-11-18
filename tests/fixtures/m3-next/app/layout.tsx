import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { DocumentPolicy, PersistentCounter } from './policy';
export default async function Layout({ children }: { children: ReactNode }) {
  const request = await headers(),
    nonce = request.get('x-nonce') ?? '';
  const policy =
    request.get('x-style-mode') === 'external'
      ? { mode: 'external' as const, href: '/dotquilt/region.css' }
      : { mode: 'inline' as const, nonce };
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/app.css" />
        <script src="/capture.js" nonce={nonce} />
      </head>
      <body>
        <DocumentPolicy value={policy}>
          <PersistentCounter />
          {children}
        </DocumentPolicy>
      </body>
    </html>
  );
}
