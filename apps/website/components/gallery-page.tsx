import Link from 'next/link';
import { catalogQuery, requireComponent } from '../lib/catalog';
import {
  type GalleryRecipe,
  galleryRecipes,
  gallerySettings,
} from '../lib/gallery';
import { gallerySource } from '../lib/gallery-source';
import { highlightExcerpt } from '../lib/highlight-excerpt';
import { GalleryCode } from './gallery-code';
import { GalleryPreview } from './gallery-preview';
import { Shell } from './shell';
import './reference-code.css';
import './gallery.css';

const groups = [
  'text',
  'chart',
  'table',
  'skeleton',
  'typing',
  'region',
] as const;
const groupNames = {
  text: 'Text',
  chart: 'Charts',
  table: 'Tables',
  skeleton: 'Skeletons',
  typing: 'Typing dots',
  region: 'Coordination',
};

export async function GalleryPage({ recipe }: { recipe: GalleryRecipe }) {
  const source = await gallerySource(recipe.id);
  const highlighted = await highlightExcerpt(source);
  const model = requireComponent(recipe.component);
  const settings = gallerySettings(recipe);
  return (
    <Shell
      active="docs"
      contents={[
        { href: '#example', label: 'Try this animation' },
        { href: '#recipes', label: 'Browse recipes' },
        { href: '#code', label: 'Complete React component' },
        { href: '#setup', label: 'Use it in your app' },
      ]}
    >
      <h1>Animation gallery</h1>
      <p className="lead">Find the motion. Keep the content.</p>
      <p>
        Twenty-four starting points, one native engine. Choose a recipe, try its
        loading and reveal, then take the real React component.
      </p>
      <div className="gallery-layout">
        <div>
          <GalleryPreview key={recipe.id} recipe={recipe} />
          <p className="gallery-destinations">
            <Link href={`/docs/components/${recipe.component}`}>
              Read {model.name} docs
            </Link>
            <Link
              href={`/playground/components/${recipe.component}?${catalogQuery(settings)}`}
            >
              Customize in playground
            </Link>
          </p>
          <p className="caption">
            Playground retains the component and supported first-party recipe
            settings; it uses its existing illustrative application. Gallery
            source has default inline styles, not a deployment CSP guarantee.
          </p>
        </div>
        <nav
          id="recipes"
          className="gallery-browser"
          aria-label="Animation recipes"
        >
          <h2>Choose an animation</h2>
          {groups.map((group) => (
            <details key={group} open={model.family === group}>
              <summary>{groupNames[group]}</summary>
              <ul>
                {galleryRecipes
                  .filter(
                    (item) => requireComponent(item.component).family === group,
                  )
                  .map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/docs/gallery/${item.id}`}
                        aria-current={
                          item.id === recipe.id ? 'page' : undefined
                        }
                      >
                        <span>{item.title}</span>
                        <small>
                          {item.idle === 'default'
                            ? 'Built-in activity'
                            : item.idle}{' '}
                          ·{' '}
                          {item.reveal === 'default'
                            ? 'Region handoff'
                            : item.reveal}
                        </small>
                      </Link>
                    </li>
                  ))}
              </ul>
            </details>
          ))}
        </nav>
      </div>
      <GalleryCode
        key={recipe.id}
        source={source}
        highlighted={highlighted}
        filename={`${model.name}Example.tsx`}
      />
      <section id="setup">
        <h2>Use it in your app.</h2>
        <p>
          Copy the complete component into a client file and render its default
          export. It starts ready and keeps real content mounted; the example
          buttons own readiness and cycle identity. The optional motion prop can
          restrict it to paused. Do not accept stale request results or infer
          readiness from an animation.
        </p>
        <p>
          This is the private package preview. Follow{' '}
          <Link href="/docs#setup">private installation</Link> first; no public
          npm package is available. For pending SSR, external assets, nonce/hash
          policies or real framework integration, use the{' '}
          <Link href="/docs/guides/react">React</Link>,{' '}
          <Link href="/docs/guides/nextjs">Next.js</Link> and{' '}
          <Link href="/docs/guides/csp">CSP</Link> guides.
        </p>
        <p>
          These examples demonstrate implemented motion. Renderer choices,
          performance, actual browser floors and manual accessibility
          qualification remain open.
        </p>
      </section>
    </Shell>
  );
}
