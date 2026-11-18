import {
  type IntegrationExample as ExampleName,
  integrationExamples,
} from '../lib/integration-guides';
import { integrationSources } from '../lib/integration-sources';

export async function IntegrationExample({ name }: { name: ExampleName }) {
  const files = await integrationSources(name);
  return (
    <details className="complete-example" id={`example-${name}`}>
      <summary>{integrationExamples[name].label} · all files</summary>
      <p>
        Save every file under its shown path. Add the exact reviewed private
        tarballs in <code>vendor/</code>, then follow README.md. These files are
        independently installed, built and exercised in the integration checks;
        the documentation website is a separate application.
      </p>
      {Object.entries(files).map(([path, source]) => (
        <details key={path}>
          <summary>{path}</summary>
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Overflowing source needs keyboard scrolling. */}
          <pre tabIndex={0}>
            <code>{source}</code>
          </pre>
        </details>
      ))}
    </details>
  );
}
