import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComponentReference } from '../../../../components/component-reference';
import { catalog, findComponent } from '../../../../lib/catalog';
import { docsSource } from '../../../../lib/docs-source';
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
  const page = docsSource.getPage(['components', slug]);
  return {
    title: page?.data.title ?? findComponent(slug)?.name ?? 'Component',
    ...(page ? { description: page.data.description } : {}),
  };
}
export default async function ComponentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = findComponent(slug);
  if (!item) notFound();
  return <ComponentReference item={item} />;
}
