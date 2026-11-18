'use client';
import {
  CodeBlock,
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import type { ReactNode } from 'react';
import { type ComponentSlug, requireComponent } from '../lib/catalog';
import { catalogExcerpt, type ExampleSources } from '../lib/catalog-files';
import type { CatalogSettings } from '../lib/catalog-model';
import { CatalogWorkbench } from './catalog-workbench';

export function ReferenceWorkbench({
  component,
  sources,
  reactSource,
  snippets,
}: {
  component: ComponentSlug;
  sources: ExampleSources;
  reactSource: string;
  snippets: Record<CatalogSettings['integration'], ReactNode>;
}) {
  const model = requireComponent(component);
  return (
    <CatalogWorkbench
      component={component}
      sources={sources}
      renderExcerpt={({ settings, enhanced, onIntegrationChange, copy }) => (
        <div
          className="reference-code not-fumadocs-codeblock not-fumadocs-code"
          id="component-code"
          data-testid="reference-code"
        >
          <p className="caption">
            {settings.integration === 'react'
              ? 'Complete React starter: imports, state, loading controls and real content. Paste the file into your React app after private package setup. The full application below exports every current playground setting.'
              : 'Native composition excerpt. The complete application below includes markup, registration, properties and every required file.'}
          </p>
          <CodeBlockTabs
            value={settings.integration}
            onValueChange={(value) => {
              if (value === 'react' || value === 'native')
                onIntegrationChange(value);
            }}
          >
            <CodeBlockTabsList aria-label="Code integration tabs">
              <CodeBlockTabsTrigger value="react" disabled={!enhanced}>
                React
              </CodeBlockTabsTrigger>
              <CodeBlockTabsTrigger value="native" disabled={!enhanced}>
                Native Web Components
              </CodeBlockTabsTrigger>
            </CodeBlockTabsList>
            {(['react', 'native'] as const).map((integration) => (
              <CodeBlockTab key={integration} value={integration}>
                <CodeBlock
                  title={
                    integration === 'react'
                      ? `${model.name}Example.tsx · complete component`
                      : 'main.ts · composition'
                  }
                  allowCopy={false}
                  viewportProps={{
                    'aria-label': `${integration === 'react' ? 'React' : 'Native'} component code`,
                  }}
                  Actions={() => (
                    <button
                      type="button"
                      disabled={!enhanced}
                      onClick={() =>
                        void copy(
                          integration === 'react'
                            ? reactSource
                            : catalogExcerpt({ ...settings, integration }),
                          'Component code copied.',
                        )
                      }
                    >
                      Copy code
                    </button>
                  )}
                >
                  {snippets[integration]}
                </CodeBlock>
              </CodeBlockTab>
            ))}
          </CodeBlockTabs>
          <noscript>
            <details>
              <summary>Native Web Components excerpt</summary>
              <section
                className="reference-code-fallback"
                aria-label="Native component code fallback"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: This viewport owns horizontal code scrolling without JavaScript.
                tabIndex={0}
              >
                {snippets.native}
              </section>
            </details>
          </noscript>
        </div>
      )}
    />
  );
}
