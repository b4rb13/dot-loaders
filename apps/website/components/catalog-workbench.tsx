'use client';
import type { HandoffDetail, LoadingState } from '@dotquilt-internal/core';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  type ComponentSlug,
  catalogDefaults,
  catalogQuery,
  parseCatalogQuery,
  requireComponent,
} from '../lib/catalog';
import {
  catalogExcerpt,
  catalogFiles,
  type ExampleSources,
} from '../lib/catalog-files';
import type { CatalogSettings } from '../lib/catalog-model';
import { isRecipeKey, type RecipeKey } from '../lib/catalog-options';
import { usePreviewAssets } from '../lib/use-preview-assets';
import { CatalogOptionEditor } from './catalog-option-editor';
import { CatalogScene, type SceneHandle } from './catalog-scene';
import { CatalogStatic } from './catalog-static';
import { useMotion } from './motion';
export interface CatalogExcerptProps {
  settings: CatalogSettings;
  enhanced: boolean;
  onIntegrationChange: (integration: CatalogSettings['integration']) => void;
  copy: (text: string, message: string) => Promise<void>;
}
export function CatalogWorkbench({
  component,
  sources,
  playground = false,
  renderExcerpt,
}: {
  component: ComponentSlug;
  sources: ExampleSources;
  playground?: boolean;
  renderExcerpt?: (props: CatalogExcerptProps) => ReactNode;
}) {
  const [settings, setSettings] = useState(() => catalogDefaults(component));
  const [state, setState] = useState<LoadingState>('ready');
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState('Content');
  const [outcome, setOutcome] = useState('');
  const [notice, setNotice] = useState('');
  const [feedback, setFeedback] = useState('');
  const [fallback, setFallback] = useState('');
  const [enhanced, setEnhanced] = useState(false);
  const assets = usePreviewAssets(component);
  const scene = useRef<SceneHandle>(null);
  const { paused, ready } = useMotion();
  const model = requireComponent(component);
  const live = enhanced && assets === 'ready';
  useEffect(() => {
    const read = () => {
      const next = parseCatalogQuery(location.search, component);
      setSettings(next.settings);
      setNotice(next.notice);
    };
    read();
    setEnhanced(true);
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [component]);
  function configure(patch: Partial<CatalogSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setNotice('');
    setFeedback('');
    setFallback('');
    try {
      history.replaceState(
        null,
        '',
        `${location.pathname}?${catalogQuery(next)}`,
      );
    } catch {
      setFeedback(
        'The address could not update. Use Copy configuration link to share these settings.',
      );
    }
  }
  function start(next: LoadingState) {
    setCycle((c) => c + 1);
    setState(next);
    setOutcome('');
    setPhase(next === 'pending' ? 'Idle' : 'Refreshing');
  }
  function settle(message: string) {
    setOutcome(message);
    setState('ready');
    setPhase('Content');
  }
  function handoff(event: CustomEvent<HandoffDetail>) {
    if (event.detail.cycle !== String(cycle)) return;
    setPhase(event.type === 'dotquilt-handoff-start' ? 'Handoff' : 'Content');
  }
  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFallback('');
      setFeedback(message);
    } catch {
      setFallback(text);
      setFeedback(
        'Clipboard unavailable. Select the text below to copy it manually.',
      );
    }
  }
  const files = catalogFiles(settings, sources);
  const editableRecipes: RecipeKey[] =
    settings.mode === 'custom'
      ? model.family === 'region'
        ? ['customReveal']
        : ['customIdle', 'customReveal']
      : [settings.idle, settings.reveal].filter(isRecipeKey);
  return (
    <section className="workbench" aria-label={`${model.name} example`}>
      {notice && (
        <p className="notice" role="status">
          {notice}{' '}
          <button
            type="button"
            onClick={() => configure(catalogDefaults(component))}
          >
            Reset settings
          </button>
        </p>
      )}
      <p
        className="caption enhancement-status"
        data-testid="enhancement-status"
        aria-live="polite"
      >
        {!enhanced
          ? 'Interactive preview has not started. Documentation and complete code remain available.'
          : assets === 'unsupported'
            ? 'Preview capabilities are unavailable. Current content, settings and complete code remain available.'
            : assets === 'failed'
              ? 'Preview styles could not load. Current content, settings and complete code remain available.'
              : assets === 'loading'
                ? 'Checking preview styles. Current content stays available.'
                : 'Preview ready. Requests and outcomes belong to this example.'}{' '}
        {!live && (
          <a
            href={`${playground ? '/playground' : '/docs'}/components/${component}?${catalogQuery(settings)}`}
          >
            Reload this page
          </a>
        )}
      </p>
      <div className="preview-header">
        <span>Live {model.name}</span>
        <span>Illustrative content</span>
      </div>
      <div className="catalog-preview" data-testid="catalog-preview">
        {live ? (
          <CatalogScene
            ref={scene}
            settings={settings}
            state={state}
            cycle={String(cycle)}
            motion={paused || !ready || !live ? 'paused' : 'system'}
            immediate={Boolean(outcome)}
            onHandoff={handoff}
          />
        ) : (
          <CatalogStatic settings={settings} />
        )}
      </div>
      <div className="preview-controls">
        <button
          className="primary"
          type="button"
          disabled={!live}
          onClick={() => start('pending')}
        >
          Start loading
        </button>
        <button
          type="button"
          disabled={!live}
          onClick={() => start('refreshing')}
        >
          Refresh content
        </button>
        <button
          type="button"
          disabled={!live}
          onClick={() => {
            setState('ready');
            setPhase('Content');
          }}
        >
          Reveal content
        </button>
        <span className="state-label">
          {state} · {phase}
        </span>
      </div>
      <p className="caption">
        Change settings during a cycle without restarting it. Explicit reveal
        starts the real handoff; the system preference, visitor pause and
        four-second motion window take priority. Opening this page or a shared
        link never restores a request or starts motion.
      </p>
      <details className="catalog-details">
        <summary>Request outcomes and measurement refresh</summary>
        <p>
          The application owns failure/cancellation and stale-result rejection.
          These controls stop replacement loading and keep the current content,
          without a celebratory reveal. Start another cycle to inspect
          interruption.
        </p>
        <div className="preview-controls">
          <button
            type="button"
            disabled={!live}
            onClick={() =>
              settle('Request cancelled; current content retained.')
            }
          >
            Cancel request
          </button>
          <button
            type="button"
            disabled={!live}
            onClick={() => settle('Request failed; showing current content.')}
          >
            Simulate failure
          </button>
          <button
            type="button"
            disabled={!live}
            onClick={() => scene.current?.refresh()}
          >
            Refresh measurements
          </button>
        </div>
      </details>
      <p className="catalog-events" role="status">
        {outcome}
      </p>
      <fieldset className="catalog-options" disabled={!enhanced}>
        <legend>Preview and code settings</legend>
        <label>
          Code integration
          <select
            value={settings.integration}
            onChange={(e) =>
              configure({
                integration: e.target.value as CatalogSettings['integration'],
              })
            }
          >
            <option value="react">React</option>
            <option value="native">Native Web Components</option>
          </select>
        </label>
        <label>
          Idle recipe
          <select
            disabled={settings.mode === 'custom'}
            value={settings.idle}
            onChange={(e) => configure({ idle: e.target.value })}
          >
            {model.idles.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reveal recipe
          <select
            disabled={settings.mode === 'custom'}
            value={settings.reveal}
            onChange={(e) => configure({ reveal: e.target.value })}
          >
            {model.reveals.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Idle speed
          <select
            value={settings.speed}
            onChange={(e) =>
              configure({
                speed:
                  e.target.value === 'auto'
                    ? 'auto'
                    : (Number(e.target.value) as CatalogSettings['speed']),
              })
            }
          >
            <option value="auto">Library / preset default</option>
            {[0.5, 1, 2].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
        {model.family !== 'typing' && model.family !== 'region' && (
          <label>
            Pointer response
            <select
              value={settings.pointer}
              onChange={(e) =>
                configure({
                  pointer: e.target.value as CatalogSettings['pointer'],
                })
              }
            >
              <option value="none">None</option>
              <option value="lift">Lift · fine-hover devices</option>
            </select>
          </label>
        )}
        <label>
          Handoff duration
          <select
            value={settings.duration}
            onChange={(e) =>
              configure({
                duration: e.target.value as CatalogSettings['duration'],
              })
            }
          >
            <option value="auto">Library / preset default</option>
            <option value="0">Immediate</option>
            <option value="300">300 ms total</option>
            <option value="900">900 ms total</option>
          </select>
        </label>
        {model.family === 'chart' && (
          <label>
            Chart geometry
            <select
              value={settings.variant}
              onChange={(e) =>
                configure({
                  variant: e.target.value as CatalogSettings['variant'],
                })
              }
            >
              {['line', 'bar', 'scatter'].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        {model.family === 'table' && (
          <label>
            Table rows
            <select
              value={settings.rows}
              onChange={(e) =>
                configure({
                  rows: Number(e.target.value) as CatalogSettings['rows'],
                })
              }
            >
              {[3, 5].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        {(component === 'skeleton-text' || component === 'loading-region') && (
          <label>
            Placeholder lines
            <select
              value={settings.lines}
              onChange={(e) =>
                configure({
                  lines: Number(e.target.value) as CatalogSettings['lines'],
                })
              }
            >
              {[1, 3, 5].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        {model.family === 'typing' && (
          <label>
            Dot count
            <select
              value={settings.count}
              onChange={(e) =>
                configure({
                  count: Number(e.target.value) as CatalogSettings['count'],
                })
              }
            >
              {[3, 5, 8].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        {model.family === 'text' && (
          <label>
            Text sample
            <select
              value={settings.sample}
              onChange={(e) =>
                configure({
                  sample: e.target.value as CatalogSettings['sample'],
                })
              }
            >
              <option value="latin">Words · precise glyphs</option>
              <option value="zero">Zero · meaningful value</option>
              <option value="international">Japanese · generic fallback</option>
            </select>
          </label>
        )}
      </fieldset>
      <fieldset className="catalog-options" disabled={!enhanced}>
        <legend>Animation authoring</legend>
        <label>
          Animation mode
          <select
            value={settings.mode}
            onChange={(event) =>
              configure({ mode: event.target.value as CatalogSettings['mode'] })
            }
          >
            <option value="direct">First-party recipes</option>
            <option value="preset">Local immutable preset</option>
            {model.family !== 'typing' && (
              <option value="custom">Custom typed definitions</option>
            )}
          </select>
        </label>
      </fieldset>
      <p className="caption">
        {settings.mode === 'preset'
          ? 'The included local preset supplies its phases and 0.5× idle speed (Region has no idle speed). An explicit recipe overrides only that phase; Library / preset default clears a speed or total-duration override. Select default to restore the preset phase.'
          : settings.mode === 'custom'
            ? 'Custom breathing and soft reveal run on the engine clock. Region supplies handoff only; TypingDots has no custom map. The full typed source is included below.'
            : 'Choose an explicit recipe to edit its typed options. Default leaves that phase to the library. Idle speed multiplies its authored pace.'}
      </p>
      <details className="catalog-details">
        <summary>Typed animation options</summary>
        {editableRecipes.length ? (
          editableRecipes.map((recipe) => (
            <CatalogOptionEditor
              key={recipe}
              recipe={recipe}
              options={settings.options}
              onChange={(options) => configure({ options })}
            />
          ))
        ) : (
          <p>
            Choose an explicit idle or reveal recipe to edit its options. Preset
            and library phases remain inherited while default is selected.
          </p>
        )}
        <button
          type="button"
          disabled={!enhanced}
          onClick={() => configure({ options: {} })}
        >
          Clear option overrides
        </button>
        <p className="caption">
          These values configure a factory binding. The loading owner’s explicit
          handoff duration overrides the whole total. Edits do not start a
          request or renew the motion window; captured handoffs keep their prior
          options until the next cycle.
        </p>
      </details>
      <p className="caption">
        Code integration changes the files below. The live website uses the thin
        React adapter over the same native engine; both standalone integrations
        are checked separately. “Default” leaves that phase to the library;
        explicit recipes override only their own phase.
      </p>
      <div className="preview-controls">
        <button
          type="button"
          disabled={!enhanced}
          onClick={() =>
            void copy(
              `${location.origin}${location.pathname}?${catalogQuery(settings)}`,
              'Configuration link copied. Opens static.',
            )
          }
        >
          Copy configuration link
        </button>
        {!playground && (
          <Link
            href={`/playground/components/${component}?${catalogQuery(settings)}`}
          >
            Open this configuration in playground
          </Link>
        )}
      </div>
      {renderExcerpt ? (
        renderExcerpt({
          settings,
          enhanced,
          onIntegrationChange: (integration) => configure({ integration }),
          copy,
        })
      ) : (
        <details className="code-panel">
          <summary>Component excerpt · {settings.integration}</summary>
          <p className="caption">
            The excerpt is a composition sketch. All state, recipes,
            projections, registration and files are included in the complete
            example.
          </p>
          <button
            type="button"
            className="copy-button"
            disabled={!enhanced}
            onClick={() =>
              void copy(catalogExcerpt(settings), 'Component code copied.')
            }
          >
            Copy code
          </button>
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Overflowing code needs keyboard scrolling. */}
          <pre tabIndex={0}>
            <code>{catalogExcerpt(settings)}</code>
          </pre>
        </details>
      )}
      <p className="feedback" aria-live="polite">
        {feedback}
      </p>
      {fallback && (
        <label className="copy-fallback">
          Copy manually
          <textarea
            readOnly
            value={fallback}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      )}
      <details id="complete-example" className="complete-example">
        <summary>Complete example · all files</summary>
        <p>
          Use the exact private tarballs from <a href="/docs#setup">Setup</a>.
          All application helpers are included. These are client-only examples
          with useful static HTML, not pending SSR. Save each file under its
          shown path.
        </p>
        {Object.entries(files).map(([name, source]) => (
          <details key={name}>
            <summary>{name}</summary>
            {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Overflowing code needs keyboard scrolling. */}
            <pre tabIndex={0}>
              <code>{source}</code>
            </pre>
          </details>
        ))}
      </details>
      <noscript>
        <p>
          Current content, documentation and default code remain readable.
          Enable JavaScript to operate loading and configuration controls.
        </p>
      </noscript>
    </section>
  );
}
