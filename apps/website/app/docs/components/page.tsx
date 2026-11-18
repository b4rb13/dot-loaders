import type { Metadata } from 'next';
import Link from 'next/link';
import { Shell } from '../../../components/shell';
import { catalog } from '../../../lib/catalog';
export const metadata: Metadata = { title: 'Component catalog' };
export default function Components() {
  return (
    <Shell
      active="docs"
      contents={[
        { href: '#catalog', label: 'Choose a component' },
        { href: '#composition', label: 'Composition' },
      ]}
    >
      <h1>Loading, composed.</h1>
      <p className="lead">
        Start with the shape of your content. Add motion where it helps, then
        hand off to the real interface.
      </p>
      <p>
        All nine exports use the same native engine. The React adapter forwards
        configuration and preserves your application nodes. This is the private
        preview; installation, support and qualification limits remain in{' '}
        <Link href="/docs#setup">Setup</Link>.
      </p>
      <section id="catalog">
        <h2>Choose a component</h2>
        <ul className="catalog-index">
          {catalog.map((item) => (
            <li key={item.slug}>
              <Link href={`/docs/components/${item.slug}`}>{item.name}</Link>
              <p>{item.summary}</p>
            </li>
          ))}
        </ul>
      </section>
      <section id="composition">
        <h2>Two owners, one clear handoff.</h2>
        <p>
          LoadingRegion owns pending, refreshing and ready. Skeletons,
          chart/table loaders and typing dots are decoration in its placeholder.
          TextLoader owns the same loading lifecycle around its own text.
        </p>
        <p>
          Your application owns requests, data, errors, status messages and
          stale-result rejection. The engine never infers readiness from a
          value, chart geometry or a completed idle animation.
        </p>
        <Link href="/playground/components/text-loader">
          Explore the component playground
        </Link>
      </section>
    </Shell>
  );
}
