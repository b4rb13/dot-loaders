import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './styles.css';

export const metadata: Metadata = {
  title: 'Dotquilt with Next.js',
  description: 'Server-rendered placeholders that hydrate and hand over.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav aria-label="Pages">
          {/* Client-side navigation: the loaders on the next page start fresh. */}
          <Link href="/">Team</Link>
          <Link href="/revenue">Revenue</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
