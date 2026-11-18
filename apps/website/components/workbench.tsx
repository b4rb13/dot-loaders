'use client';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { SkeletonText } from '@dotquilt-internal/react/skeleton';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ExampleSettings } from '../lib/example';
import {
  completeExample,
  componentCode,
  defaults,
  parseSettings,
  sample,
  settingsQuery,
} from '../lib/example';
import { usePreviewAssets } from '../lib/use-preview-assets';
import { useMotion } from './motion';

export function Workbench() {
  const [settings, setSettings] = useState(defaults);
  const [notice, setNotice] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copyFallback, setCopyFallback] = useState('');
  const [state, setState] = useState<'ready' | 'pending'>('ready');
  const [cycle, setCycle] = useState('example-0');
  const nextCycle = useRef(0);
  const { paused, ready } = useMotion();
  const assets = usePreviewAssets('quickstart');
  const pathname = usePathname();
  const live = assets === 'ready';
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const read = () => {
      const parsed = parseSettings(location.search);
      setSettings(parsed.settings);
      setNotice(parsed.notice);
    };
    read();
    if (disclosure.current)
      disclosure.current.open = matchMedia('(min-width: 801px)').matches;
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  function configure(next: ExampleSettings) {
    setSettings(next);
    setNotice('');
    setFeedback('');
    setCopyFallback('');
    try {
      history.replaceState(
        null,
        '',
        `${location.pathname}?${settingsQuery(next)}`,
      );
    } catch {
      setFeedback(
        'The address could not update. Use Copy configuration link to share these settings.',
      );
    }
  }
  async function copy(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFallback('');
      setFeedback(success);
    } catch {
      setCopyFallback(text);
      setFeedback(
        'Clipboard unavailable. Select the text below to copy it manually.',
      );
    }
  }
  const files = completeExample(settings);
  return (
    <section className="workbench" aria-label="Loading region example">
      {notice && (
        <p className="notice" role="status">
          {notice}{' '}
          <button type="button" onClick={() => configure(defaults)}>
            Reset settings
          </button>
        </p>
      )}
      <p
        className="caption enhancement-status"
        data-testid="enhancement-status"
        aria-live="polite"
      >
        {assets === 'loading'
          ? 'Checking preview styles. Current content stays available.'
          : assets === 'failed'
            ? 'Preview styles could not load. Current content, settings and complete code remain available.'
            : assets === 'unsupported'
              ? 'Preview capabilities are unavailable. Current content, settings and complete code remain available.'
              : 'Preview ready. Requests and outcomes belong to this example.'}{' '}
        {!live && (
          <a href={`${pathname}?${settingsQuery(settings)}`}>
            Reload this page
          </a>
        )}
      </p>
      <div className="preview-header">
        <span>Live preview</span>
        <span>Illustrative article</span>
      </div>
      <div className="preview" data-testid="preview">
        {live ? (
          <LoadingRegion
            className="summary"
            state={state}
            cycle={cycle}
            motion={paused || !ready ? 'paused' : 'system'}
            stylePolicy={{ mode: 'external', href: '/dotquilt/region.css' }}
            placeholder={
              <SkeletonText
                lines={settings.lines}
                stylePolicy={{
                  mode: 'external',
                  href: '/dotquilt/skeleton-text.css',
                }}
              />
            }
          >
            <article>
              <h3>A quieter loading state</h3>
              <p>{sample}</p>
            </article>
          </LoadingRegion>
        ) : (
          <article data-testid="preview-fallback">
            <h3>A quieter loading state</h3>
            <p>{sample}</p>
          </article>
        )}
      </div>
      <div className="preview-controls">
        <button
          type="button"
          className="primary"
          disabled={!live}
          onClick={() => {
            setCycle(`example-${++nextCycle.current}`);
            setState('pending');
          }}
        >
          Start loading
        </button>
        <button
          type="button"
          disabled={!live}
          onClick={() => setState('ready')}
        >
          Reveal content
        </button>
        <span className="state-label">
          {state === 'pending' ? 'Pending' : 'Ready'}
        </span>
      </div>
      <p className="caption">
        Start a cycle to see the real idle and reveal. Motion becomes static
        after four seconds; loading can continue. Your system motion preference
        and pause setting take priority.
      </p>
      <fieldset className="settings">
        <legend>Example settings</legend>
        <label>
          Integration
          <select
            value={settings.integration}
            onChange={(event) =>
              configure({
                ...settings,
                integration:
                  event.target.value === 'native' ? 'native' : 'react',
              })
            }
          >
            <option value="react">React</option>
            <option value="native">Native Web Components</option>
          </select>
        </label>
        <label>
          Placeholder lines
          <select
            value={settings.lines}
            onChange={(event) =>
              configure({ ...settings, lines: Number(event.target.value) })
            }
          >
            {[1, 2, 3, 4, 5].map((lines) => (
              <option key={lines} value={lines}>
                {lines}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() =>
            void copy(
              `${location.origin}${location.pathname}?${settingsQuery(settings)}`,
              'Configuration link copied. Opens static.',
            )
          }
        >
          Copy configuration link
        </button>
      </fieldset>
      <details ref={disclosure} className="code-panel">
        <summary>
          Component code{' '}
          <span>
            {settings.integration === 'react'
              ? 'React · TSX'
              : 'Native · TypeScript'}
          </span>
        </summary>
        <p className="caption">
          This excerpt needs application-owned state and the setup below.
        </p>
        <button
          className="copy-button"
          type="button"
          onClick={() =>
            void copy(componentCode(settings), 'Component code copied.')
          }
        >
          Copy code
        </button>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Overflowing code needs keyboard scrolling. */}
        <pre tabIndex={0}>
          <code>{componentCode(settings)}</code>
        </pre>
      </details>
      <p className="feedback" aria-live="polite">
        {feedback}
      </p>
      {copyFallback && (
        <label className="copy-fallback">
          Copy manually
          <textarea
            readOnly
            value={copyFallback}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
      <details id="complete-example" className="complete-example">
        <summary>Complete example · all files</summary>
        <p>
          Use the reviewed private tarballs described in Setup. This client-only
          example includes its own controls, build, styles and local server. It
          does not implement SSR.
        </p>
        {Object.entries(files).map(([name, content]) => (
          <details key={name}>
            <summary>{name}</summary>
            {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Overflowing code needs keyboard scrolling. */}
            <pre tabIndex={0}>
              <code>{content}</code>
            </pre>
          </details>
        ))}
        <p>
          Save each file under the shown path. The same files are compiled and
          run in the website example checks.
        </p>
      </details>
      <noscript>
        <p>
          The article and code remain readable. Enable JavaScript to operate the
          preview or change settings.
        </p>
      </noscript>
    </section>
  );
}
