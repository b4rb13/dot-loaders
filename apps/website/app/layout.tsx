import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MotionProvider } from '../components/motion';
import './globals.css';
import './catalog.css';
import './docs-theme.css';

export const metadata: Metadata = {
  title: {
    default: 'Dotquilt — Loading, considered.',
    template: '%s · Dotquilt',
  },
  description:
    'Composable skeleton replacements. Private documentation and playground preview.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
