'use client';
import { CodeBlock } from 'fumadocs-ui/components/codeblock';
import { type ReactNode, useEffect, useState } from 'react';

export function GalleryCode({
  source,
  highlighted,
  filename,
}: {
  source: string;
  highlighted: ReactNode;
  filename: string;
}) {
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [fallback, setFallback] = useState('');
  useEffect(() => setReady(true), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setFallback('');
      setFeedback('Complete React component copied.');
    } catch {
      setFallback(source);
      setFeedback(
        'Clipboard unavailable. Select the complete source below to copy manually.',
      );
    }
  }
  return (
    <section
      id="code"
      className="reference-code not-fumadocs-codeblock not-fumadocs-code"
      aria-label="Complete React source"
    >
      <h2>Take the whole component.</h2>
      <p>
        These are the exact imports, geometry, state and handlers used by the
        live example. Paste the file into a React app with the private packages
        installed. The controls simulate application outcomes; replace them with
        your current request’s lifecycle.
      </p>
      <CodeBlock
        title={filename}
        allowCopy={false}
        viewportProps={{ 'aria-label': 'Complete React component code' }}
        Actions={() => (
          <button type="button" disabled={!ready} onClick={() => void copy()}>
            Copy component
          </button>
        )}
      >
        {highlighted}
      </CodeBlock>
      <p className="feedback" role="status">
        {feedback}
      </p>
      {fallback && (
        <label>
          Copy manually
          <textarea
            aria-label="Copy manually"
            readOnly
            value={fallback}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </section>
  );
}
