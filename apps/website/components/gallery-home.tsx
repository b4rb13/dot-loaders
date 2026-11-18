import Link from 'next/link';
import {
  ChartDemonstration,
  HeroDemonstration,
  TableDemonstration,
} from './gallery-demos';
import { MotionButton } from './motion';

export function GalleryHome() {
  return (
    <div className="gallery-home">
      <header className="gallery-header">
        <Link className="gallery-brand" href="/" aria-label="Dotquilt home">
          <svg viewBox="0 0 30 30" aria-hidden="true">
            {[5, 15, 25].flatMap((y) =>
              [5, 15, 25].map((x) => (
                <circle
                  key={`${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="currentColor"
                />
              )),
            )}
          </svg>
          Dotquilt
        </Link>
        <nav aria-label="Primary">
          <a href="#components">Components</a>
          <Link href="/playground">Playground</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <span className="gallery-private">Private preview</span>
        <MotionButton withIcon />
      </header>
      <main id="main">
        <section className="gallery-opening" aria-labelledby="gallery-heading">
          <h1 id="gallery-heading">Loading, considered.</h1>
          <p className="gallery-description">
            Composable skeletons and expressive loading states for the web.
          </p>
          <div className="gallery-actions">
            <Link className="gallery-primary" href="/playground">
              Try the playground <span aria-hidden="true">→</span>
            </Link>
            <Link className="gallery-docs" href="/docs">
              Read the docs
            </Link>
          </div>
          <HeroDemonstration />
        </section>
        <section
          id="components"
          className="gallery-components"
          aria-labelledby="components-heading"
        >
          <div className="gallery-intro">
            <h2 id="components-heading">From a placeholder to your content.</h2>
            <p>
              Dots become charts, tables, text and more — with a coordinated
              handoff you control.
            </p>
          </div>
          <ChartDemonstration />
          <TableDemonstration />
        </section>
        <p className="gallery-sample-note">
          Illustrative data. Play a specimen to see its handoff.
        </p>
        <section
          className="gallery-expression"
          aria-labelledby="expression-heading"
        >
          <h2 id="expression-heading">
            One engine.
            <br />
            Your expression.
          </h2>
          <div>
            <p className="gallery-expression-lead">
              A few dots. A different way to wait.
            </p>
            <p>
              Compose skeletons, text, typing indicators, charts and tables.
              Choose an idle and a reveal, or bring your own animation through
              the same engine.
            </p>
            <p>
              Your application owns the data and the moment it’s ready. Dotquilt
              coordinates the handoff while your real content stays in place.
            </p>
            <Link href="/docs#readiness">
              Explore the loading contract <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
        <section className="gallery-close" aria-labelledby="close-heading">
          <div>
            <h2 id="close-heading">
              Make the waiting part
              <br />
              worth watching.
            </h2>
            <p>Native Web Components. A thin React adapter. Your interface.</p>
          </div>
          <Link className="gallery-primary" href="/playground">
            Try the playground <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
      <footer className="gallery-footer">
        <span>Dotquilt · Private development preview</span>
        <nav aria-label="Footer">
          <Link href="/docs">Documentation</Link>
          <Link href="/playground">Playground</Link>
          <Link href="/docs#boundaries">Preview limits</Link>
        </nav>
      </footer>
    </div>
  );
}
