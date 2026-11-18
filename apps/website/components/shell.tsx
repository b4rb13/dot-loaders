import Link from 'next/link';
import type { ReactNode } from 'react';
import { type ComponentSlug, catalog } from '../lib/catalog';
import { previewVersion } from '../lib/example';
import { integrationGuides } from '../lib/integration-guides';
import { DocsContent } from './docs-content';
import { MotionButton } from './motion';

export function Shell({
  active,
  children,
  currentComponent,
  currentGuide,
  contents,
}: {
  active: 'docs' | 'playground';
  children: ReactNode;
  currentComponent?: ComponentSlug;
  currentGuide?: string;
  contents?: readonly { href: string; label: ReactNode }[];
}) {
  if (active === 'docs')
    return (
      <DocsContent {...(contents ? { contents } : {})}>{children}</DocsContent>
    );
  const navigation = (
    <>
      <Link href="/docs#setup">Setup</Link>
      <Link href="/docs#readiness">Loading and readiness</Link>
      <Link href="/docs#example">Your first example</Link>
      <Link href="/docs#boundaries">Support and current limits</Link>
      <p>Integration guides</p>
      {integrationGuides.map((guide) => (
        <Link
          key={guide.slug}
          href={`/docs/guides/${guide.slug}`}
          aria-current={currentGuide === guide.slug ? 'page' : undefined}
        >
          {guide.label}
        </Link>
      ))}
      <p>Components</p>
      <Link href="/docs/components">Catalog overview</Link>
      {catalog.map((item) => (
        <Link
          key={item.slug}
          href={`/docs/components/${item.slug}`}
          aria-current={currentComponent === item.slug ? 'page' : undefined}
        >
          {item.name}
        </Link>
      ))}
    </>
  );
  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Dotquilt home">
          <svg viewBox="0 0 30 30" aria-hidden="true">
            {[5, 15, 25].flatMap((y) =>
              [5, 15, 25].map((x) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={3} />
              )),
            )}
          </svg>
          Dotquilt
        </Link>
        <nav aria-label="Primary">
          <Link href="/docs">Docs</Link>
          <Link
            href="/playground"
            aria-current={active === 'playground' ? 'page' : undefined}
          >
            Playground
          </Link>
        </nav>
        <MotionButton />
      </header>
      <div className="version-strip">
        Private preview <span>{previewVersion}</span>
        <span className="version-note">Not published to npm</span>
      </div>
      <div
        className={`page-grid ${active === 'playground' ? 'workbench-layout' : ''}`}
      >
        <aside className="sidebar">
          <nav aria-label="Documentation">
            <p>Getting started</p>
            {navigation}
            <p>Explore</p>
            <Link href="/playground">Loading playground</Link>
          </nav>
        </aside>
        <details className="mobile-navigation">
          <summary>Documentation navigation</summary>
          <nav aria-label="Mobile documentation">
            {navigation}
            <Link href="/playground">Loading playground</Link>
          </nav>
        </details>
        <main id="main">{children}</main>
        <aside className="page-contents">
          <p>On this page</p>
          {contents ? (
            contents.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))
          ) : (
            <>
              <a href="#example">Live example</a>
              <a href="#complete-example">Complete example</a>
            </>
          )}
        </aside>
      </div>
      <footer>
        Dotquilt · Private development preview{' '}
        <span className="footer-note">
          Real components. Qualification in progress.
        </span>
      </footer>
    </>
  );
}
