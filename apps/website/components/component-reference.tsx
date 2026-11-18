import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  type CatalogComponent,
  type ComponentSlug,
  catalogDefaults,
  requireComponent,
} from '../lib/catalog';
import { catalogExcerpt } from '../lib/catalog-files';
import { catalogSources } from '../lib/catalog-sources';
import { docsSource } from '../lib/docs-source';
import { componentRecipe } from '../lib/gallery';
import { gallerySource } from '../lib/gallery-source';
import { highlightExcerpt } from '../lib/highlight-excerpt';
import {
  ComponentAnimations,
  ComponentControls,
} from './component-reference-data';
import { docComponents } from './doc-mdx';
import { ReferenceWorkbench } from './reference-workbench';
import { Shell } from './shell';
import './reference-code.css';

async function ComponentExample({ component }: { component: ComponentSlug }) {
  const settings = catalogDefaults(component);
  const [sources, reactSource, native] = await Promise.all([
    catalogSources(),
    gallerySource(componentRecipe(component).id),
    highlightExcerpt(catalogExcerpt({ ...settings, integration: 'native' })),
  ]);
  return (
    <ReferenceWorkbench
      key={component}
      component={component}
      sources={sources}
      reactSource={reactSource}
      snippets={{ react: await highlightExcerpt(reactSource), native }}
    />
  );
}

function ComponentPurpose({ component }: { component: ComponentSlug }) {
  return <p>{requireComponent(component).use}</p>;
}

function ComponentPhases({ component }: { component: ComponentSlug }) {
  const item = requireComponent(component);
  return (
    <p>
      {item.family === 'region' ? (
        'LoadingRegion has no idle recipe of its own. Its animation map accepts handoff only; the child placeholder owns idle motion.'
      ) : (
        <>
          Idle:{' '}
          {item.idles.filter((v) => v !== 'default').join(', ') ||
            'built-in activity'}
          . Reveal:{' '}
          {item.reveals.filter((v) => v !== 'default').join(', ') ||
            'the owning region’s built-in handoff'}
          . “Default” omits an explicit binding; it is not a separate public
          factory.
        </>
      )}
    </p>
  );
}

function PublicControls({ component }: { component: ComponentSlug }) {
  return <ComponentControls item={requireComponent(component)} />;
}

function ComponentLimits({ component }: { component: ComponentSlug }) {
  return <p>{requireComponent(component).limits}</p>;
}

function AnimationOptions({ component }: { component: ComponentSlug }) {
  return (
    <ComponentAnimations item={requireComponent(component)} heading={false} />
  );
}

const referenceComponents = {
  ...docComponents,
  ComponentExample,
  ComponentPurpose,
  ComponentPhases,
  AnimationOptions,
  PublicControls,
  ComponentLimits,
};

export function ComponentReference({ item }: { item: CatalogComponent }) {
  const page = docsSource.getPage(['components', item.slug]);
  if (!page) notFound();
  const Body = page.data.body;
  return (
    <Shell
      active="docs"
      currentComponent={item.slug}
      contents={[
        ...page.data.toc
          .filter(({ depth }) => depth === 2)
          .map(({ url, title }) => ({ href: url, label: title })),
        { href: '#component-code', label: 'Component code' },
        { href: '#complete-example', label: 'Complete example' },
      ]}
    >
      <h1>{page.data.title}</h1>
      <p className="lead">{page.data.description}</p>
      <div className="catalog-section-links">
        <a href="#example">Try the handoff</a>
        <a href="#api">Public controls</a>
        <Link href={`/playground/components/${item.slug}`}>
          Open in playground
        </Link>
      </div>
      <Body components={referenceComponents} component={item.slug} />
    </Shell>
  );
}
