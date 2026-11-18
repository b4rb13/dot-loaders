import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogNavigation } from '../../../../components/catalog-navigation';
import { CatalogWorkbench } from '../../../../components/catalog-workbench';
import { Shell } from '../../../../components/shell';
import { catalog, findComponent } from '../../../../lib/catalog';
import { catalogSources } from '../../../../lib/catalog-sources';
export const dynamicParams = false;
export function generateStaticParams() {
  return catalog.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${findComponent(slug)?.name ?? 'Component'} playground` };
}
export default async function ComponentPlayground({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = findComponent(slug);
  if (!item) notFound();
  const sources = await catalogSources();
  return (
    <Shell
      active="playground"
      currentComponent={item.slug}
      contents={[
        { href: '#example', label: 'Live example' },
        { href: '#complete-example', label: 'Complete files' },
      ]}
    >
      <CatalogNavigation current={item.slug} playground />
      <h1>{item.name} playground</h1>
      <p className="lead">{item.summary}</p>
      <p>
        Start a cycle, choose an idle and reveal, then take the complete
        application-owned files. Shared links open static.{' '}
        <Link href={`/docs/components/${item.slug}`}>
          Read the component reference
        </Link>
        .
      </p>
      <section id="example">
        <h2 className="sr-only">Live example</h2>
        <CatalogWorkbench
          key={item.slug}
          component={item.slug}
          playground
          sources={sources}
        />
      </section>
      <p className="caption">
        Illustrative content. No request, live motion or cycle identity is
        restored from a link. Private preview; qualification remains open.
      </p>
    </Shell>
  );
}
