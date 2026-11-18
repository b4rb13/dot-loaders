import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { docComponents } from '../../components/doc-mdx';
import { Shell } from '../../components/shell';
import { Workbench } from '../../components/workbench';
import { docsSource } from '../../lib/docs-source';

function ArtifactIdentities() {
  return (
    <details className="artifact-details">
      <summary>Exact private artifact identities</summary>
      <p>
        Both packages are version <code>0.0.0-m2.0</code>. Do not substitute
        another build and assume these observations apply.
      </p>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Overflowing code needs keyboard scrolling. */}
      <pre tabIndex={0}>
        <code>{`core   ac9c33b4e372c6969e88822769ca39aaf877f8673959a2a4a1ca38735685e3cf\nreact  39a0d1b6bfb23c95026a0747593da454235f84ecee4f7a1b74098967ffd203ec`}</code>
      </pre>
    </details>
  );
}

export function generateMetadata(): Metadata {
  const page = docsSource.getPage([]);
  return { title: page?.data.title, description: page?.data.description };
}

export default function Quickstart() {
  const page = docsSource.getPage([]);
  if (!page) notFound();
  const Body = page.data.body;
  return (
    <Shell
      active="docs"
      contents={[
        ...page.data.toc
          .filter(({ depth }) => depth === 2)
          .map(({ url, title }) => ({ href: url, label: title })),
        { href: '#complete-example', label: 'Complete example' },
      ]}
    >
      <Body components={{ ...docComponents, ArtifactIdentities, Workbench }} />
    </Shell>
  );
}
