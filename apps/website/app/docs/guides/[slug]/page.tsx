import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { docComponents } from '../../../../components/doc-mdx';
import { IntegrationExample } from '../../../../components/integration-example';
import { Shell } from '../../../../components/shell';
import { docsSource } from '../../../../lib/docs-source';
import { integrationGuides } from '../../../../lib/integration-guides';

export const dynamicParams = false;
export function generateStaticParams() {
  return integrationGuides.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = docsSource.getPage(['guides', slug]);
  return { title: page?.data.title, description: page?.data.description };
}
export default async function Guide({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!integrationGuides.some((item) => item.slug === slug)) notFound();
  const page = docsSource.getPage(['guides', slug]);
  if (!page) notFound();
  const Body = page.data.body;
  return (
    <Shell
      active="docs"
      currentGuide={slug}
      contents={page.data.toc
        .filter(({ depth }) => depth === 2)
        .map(({ url, title }) => ({ href: url, label: title }))}
    >
      <h1>{page.data.title}</h1>
      <p className="lead">{page.data.description}</p>
      <Body components={{ ...docComponents, IntegrationExample }} />
    </Shell>
  );
}
