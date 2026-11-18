'use client';
import Link from 'next/link';
import { Component, type ReactNode, Suspense, useState } from 'react';
import { type GalleryRecipe, gallerySettings } from '../lib/gallery';
import { usePreviewAssets } from '../lib/use-preview-assets';
import { CatalogStatic } from './catalog-static';
import { galleryComponents } from './gallery-examples';
import { useMotion } from './motion';

class ExampleBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GalleryPreview({ recipe }: { recipe: GalleryRecipe }) {
  const [moduleFailed, setModuleFailed] = useState(false);
  const assets = usePreviewAssets(recipe.component);
  const { ready, paused, reduced } = useMotion();
  const Example = galleryComponents[recipe.id];
  const live = ready && assets === 'ready' && Example;
  const content = <CatalogStatic settings={gallerySettings(recipe)} />;
  return (
    <section id="example" aria-label="Selected animation example">
      <h2>{recipe.title}</h2>
      <p>{recipe.description}</p>
      <div className="gallery-specimen" data-testid="gallery-specimen">
        {live ? (
          <ExampleBoundary
            onFailure={() => setModuleFailed(true)}
            fallback={
              <>
                {content}
                <p role="status">
                  The interactive example could not load. Content and code
                  remain available.{' '}
                  <a href={`/docs/gallery/${recipe.id}`}>Reload this example</a>
                  .
                </p>
              </>
            }
          >
            <Suspense fallback={content}>
              <Example motion={paused || reduced ? 'paused' : 'system'} />
            </Suspense>
          </ExampleBoundary>
        ) : (
          <>
            {content}
            <p>
              Static example. The loading controls become available after
              enhancement.
            </p>
          </>
        )}
      </div>
      <p
        className="caption gallery-enhancement"
        role={moduleFailed ? undefined : 'status'}
        data-testid="gallery-enhancement"
      >
        {moduleFailed ? (
          'This preview is static. Use the reload link above to retry; code and content remain available.'
        ) : assets === 'failed' || assets === 'unsupported' ? (
          <>
            The live preview is unavailable. Content and code remain useful.{' '}
            <Link href={`/docs/gallery/${recipe.id}`}>Reload this example</Link>
            .
          </>
        ) : (
          'Open still. Start loading, then reveal when the example’s current result is ready. Idle motion has the engine’s four-second window; pause and reduced motion take priority.'
        )}
      </p>
    </section>
  );
}
