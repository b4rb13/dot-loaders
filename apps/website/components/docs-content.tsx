import { DocsBody, DocsPage } from 'fumadocs-ui/layouts/docs/page';
import type { ReactNode } from 'react';
import { previewVersion } from '../lib/example';
import { DocsPageBoundary } from './docs-page-boundary';

const defaultContents = [
  { href: '#setup', label: 'Setup' },
  { href: '#readiness', label: 'Readiness' },
  { href: '#example', label: 'First example' },
  { href: '#boundaries', label: 'Current limits' },
  { href: '#complete-example', label: 'Complete example' },
];

export function DocsContent({
  children,
  contents = defaultContents,
}: {
  children: ReactNode;
  contents?: readonly { href: string; label: ReactNode }[];
}) {
  const body = (
    <DocsBody className="docs-body">
      <div id="main" tabIndex={-1}>
        {children}
      </div>
    </DocsBody>
  );
  const note = (
    <p className="docs-page-note">
      Private preview · {previewVersion}. Qualification in progress; not
      published to npm.
    </p>
  );
  return (
    <DocsPageBoundary
      fallback={
        <main className="docs-static-main">
          <article id="nd-page" className="docs-article docs-static-article">
            <nav aria-label="On this page" className="docs-static-contents">
              <p>On this page</p>
              {contents.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
            {body}
            {note}
          </article>
        </main>
      }
    >
      <DocsPage
        toc={contents.map((item) => ({
          url: item.href,
          title: item.label,
          depth: 2,
        }))}
        className="docs-article"
      >
        {body}
        {note}
      </DocsPage>
    </DocsPageBoundary>
  );
}
