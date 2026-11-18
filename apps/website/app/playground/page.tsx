import type { Metadata } from 'next';
import { Shell } from '../../components/shell';
import { Workbench } from '../../components/workbench';
export const metadata: Metadata = { title: 'Loading playground' };
export default function Playground() {
  return (
    <Shell active="playground">
      <h1>A place to try loading.</h1>
      <p className="lead">
        Start, pause and reveal. Then take the same configuration into your own
        interface.
      </p>
      <p>
        One real loading region with skeleton text. Shared links restore
        settings and open static; requests and motion activity are never
        restored.
      </p>
      <section id="example">
        <h2 className="sr-only">Live example</h2>
        <Workbench />
      </section>
      <p className="caption">
        Explore{' '}
        <a href="/playground/components/text-loader">
          all nine components and rich motion controls
        </a>
        . Read <a href="/docs#boundaries">current preview limits</a> before
        using this private build.
      </p>
    </Shell>
  );
}
