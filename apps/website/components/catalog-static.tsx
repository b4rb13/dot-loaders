import { projectChart, projects } from '../lib/catalog-geometry';
import { type CatalogSettings, textSamples } from '../lib/catalog-model';

// Useful HTML before enhancement and after asset failure. The values and
// projections match CatalogScene; this representation owns no loading cycle.
export function CatalogStatic({ settings: s }: { settings: CatalogSettings }) {
  const geometry = projectChart({ width: 320, height: 180 }, s.variant);
  return (
    <div data-testid="preview-fallback">
      {s.component === 'text-loader' ? (
        <p className="catalog-text">{textSamples[s.sample]}</p>
      ) : s.component === 'chart-loader' ? (
        <svg
          viewBox="0 0 320 180"
          className="catalog-chart"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Illustrative ${s.variant} chart with eight rising samples`}
        >
          {geometry.kind === 'bar' ? (
            geometry.bars.map((b, i) => (
              <rect key={projects[i] ?? i} {...b} fill="currentColor" />
            ))
          ) : geometry.kind === 'line' ? (
            <path
              d={geometry.points
                .map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`)
                .join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          ) : (
            geometry.points.map((p, i) => (
              <circle
                key={projects[i] ?? i}
                cx={p.x}
                cy={p.y}
                r={4}
                fill="currentColor"
              />
            ))
          )}
        </svg>
      ) : s.component === 'table-loader' ? (
        <table className="catalog-table">
          <caption>Illustrative project data</caption>
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Items</th>
            </tr>
          </thead>
          <tbody>
            {projects.slice(0, s.rows).map((name, i) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{i * 4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <article data-testid="catalog-content">
          <h3>Your content stays here.</h3>
          <p>The data in this example is illustrative.</p>
        </article>
      )}
      <p className="caption">
        Static example. The live preview needs JavaScript and its styles;
        documentation and complete code remain available.
      </p>
    </div>
  );
}
