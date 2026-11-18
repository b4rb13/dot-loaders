import type { Metadata } from 'next';
import Link from 'next/link';
import { DocsSearchTrigger } from '../../../components/docs-provider';
import { Shell } from '../../../components/shell';
import { catalog } from '../../../lib/catalog';
import { previewVersion } from '../../../lib/example';
import { integrationGuides } from '../../../lib/integration-guides';

export const metadata: Metadata = {
  title: 'Search documentation',
  description:
    'Local search and a browsable directory of Dotquilt documentation.',
};
export default function SearchDocumentation() {
  return (
    <Shell
      active="docs"
      contents={[
        { href: '#guides', label: 'Integration guides' },
        { href: '#components', label: 'Components' },
        { href: '#examples', label: 'Animation examples' },
      ]}
    >
      <h1>Find your next step.</h1>
      <p className="lead">Search components, controls and loading concepts.</p>
      <p>
        Local search covers the current private version,{' '}
        <code>{previewVersion}</code>. Its index loads when you search; your
        query stays in your browser. If search cannot enhance, every topic below
        is an ordinary link.
      </p>
      <DocsSearchTrigger />
      <section id="guides">
        <h2>Integration guides</h2>
        <ul>
          {integrationGuides.map((guide) => (
            <li key={guide.slug}>
              <Link href={`/docs/guides/${guide.slug}`}>{guide.label}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section id="components">
        <h2>Components</h2>
        <ul>
          {catalog.map((item) => (
            <li key={item.slug}>
              <Link href={`/docs/components/${item.slug}`}>{item.name}</Link> —{' '}
              {item.summary}
            </li>
          ))}
        </ul>
      </section>
      <section id="examples">
        <h2>Animation examples</h2>
        <p>
          <Link href="/docs/gallery">Browse the animation gallery</Link> for
          complete React components, or{' '}
          <Link href="/docs/components">start with the component catalog</Link>.
        </p>
      </section>
      <p>
        <Link href="/docs">Return to the Quickstart</Link>
      </p>
    </Shell>
  );
}
