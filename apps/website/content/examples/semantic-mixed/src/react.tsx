import type { RevealTarget } from '@dotquilt-internal/core/animations';
import type { ChartVariant } from '@dotquilt-internal/core/chart';
import type { LoadingRegion as NativeOwner } from '@dotquilt-internal/core/region';
import type { TextLoader as NativeText } from '@dotquilt-internal/core/text';
import { ChartLoader } from '@dotquilt-internal/react/chart';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { SkeletonBlock } from '@dotquilt-internal/react/skeleton';
import { TableLoader } from '@dotquilt-internal/react/table';
import { TextLoader } from '@dotquilt-internal/react/text';
import { TypingDots } from '@dotquilt-internal/react/typing';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { chartGeometry, reportRows, rowName } from './data';
import { required } from './dom';
import { modes, type ProviderMode } from './projections';
import {
  chartAnimations,
  tableAnimations,
  textAnimations,
  wrapperReveal,
} from './recipes';
import {
  createSession,
  initial,
  policy,
  stylesReady,
  targets,
} from './session';

const columns = [
  { kind: 'text' as const, width: 1.5 },
  { kind: 'badge' as const },
  { kind: 'number' as const },
];
function App() {
  const [model, setModel] = useState(initial);
  const current = useRef(model);
  const root = useRef<HTMLDivElement>(null);
  const owner = useRef<NativeOwner>(null);
  const detail = useRef<NativeText>(null);
  const [session, setSession] = useState<ReturnType<
    typeof createSession
  > | null>(null);
  const [active, setActive] = useState(false);
  const [styleFailed, setStyleFailed] = useState(false);
  const [revealTargets, setTargets] = useState<RevealTarget[]>([]);
  useLayoutEffect(() => {
    current.current = model;
  }, [model]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Recycled row DOM requires a fresh target list.
  useLayoutEffect(() => {
    if (root.current)
      setTargets(targets(root.current, model.mode === 'missing-row'));
  }, [model.mode, model.revision]);
  useEffect(() => {
    if (!root.current) return;
    const mounted = createSession(root.current, () => current.current);
    setSession(mounted);
    let alive = true;
    void stylesReady().then((ok) => {
      if (alive) {
        setActive(ok);
        setStyleFailed(!ok);
      }
    });
    return () => {
      alive = false;
      mounted.dispose();
    };
  }, []);
  useEffect(() => session?.publish(), [session]);
  function begin(state: 'pending' | 'refreshing') {
    session?.reset();
    setModel((m) => ({ ...m, state, cycle: m.cycle + 1 }));
  }
  const geometry = chartGeometry({ width: 320, height: 150 }, model.variant);
  return (
    <div ref={root}>
      <fieldset>
        <legend>Application actions</legend>
        <button
          id="load"
          type="button"
          disabled={!active}
          onClick={() => begin('pending')}
        >
          Load report
        </button>
        <button
          id="refresh"
          type="button"
          disabled={!active}
          onClick={() => begin('refreshing')}
        >
          Refresh report
        </button>
        <button
          id="reveal"
          type="button"
          disabled={!active}
          onClick={() => setModel((m) => ({ ...m, state: 'ready' }))}
        >
          Reveal report
        </button>
        <button
          id="detail-load"
          type="button"
          disabled={!active}
          onClick={() =>
            setModel((m) => ({
              ...m,
              detail: 'pending',
              detailCycle: m.detailCycle + 1,
            }))
          }
        >
          Load detail
        </button>
        <button
          id="detail-ready"
          type="button"
          disabled={!active}
          onClick={() => setModel((m) => ({ ...m, detail: 'ready' }))}
        >
          Reveal detail
        </button>
        <button
          id="measure"
          type="button"
          disabled={!active}
          onClick={() => {
            owner.current?.refresh();
            detail.current?.refresh();
          }}
        >
          Refresh geometry
        </button>
        <button
          id="recycle"
          type="button"
          disabled={!active}
          onClick={() => setModel((m) => ({ ...m, revision: m.revision + 1 }))}
        >
          Recycle table rows
        </button>
        <button
          id="pause"
          type="button"
          disabled={!active}
          aria-pressed={model.paused}
          onClick={() => setModel((m) => ({ ...m, paused: !m.paused }))}
        >
          Pause motion
        </button>
        <label>
          Chart geometry
          <select
            id="variant"
            disabled={!active}
            value={model.variant}
            onChange={(event) =>
              setModel((m) => ({
                ...m,
                variant: event.target.value as ChartVariant,
              }))
            }
          >
            <option>line</option>
            <option>bar</option>
            <option>scatter</option>
          </select>
        </label>
        <label>
          Provider case
          <select
            id="mode"
            disabled={!active}
            value={model.mode}
            onChange={(event) =>
              setModel((m) => ({
                ...m,
                mode: event.target.value as ProviderMode,
              }))
            }
          >
            {modes.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            id="override"
            type="checkbox"
            disabled={!active}
            checked={model.override}
            onChange={(event) =>
              setModel((m) => ({ ...m, override: event.target.checked }))
            }
          />
          Use explicit region handoff
        </label>
      </fieldset>
      <p id="request-status" role="status">
        {active
          ? `Report ${model.state}; detail ${model.detail}. Outcomes are application-owned.`
          : styleFailed
            ? 'Required CSS unavailable. Content remains ready; reload to retry.'
            : 'Content ready. Waiting for styles and enhancement.'}
      </p>
      <LoadingRegion
        id="report-owner"
        ref={owner}
        state={model.state}
        cycle={String(model.cycle)}
        motion={model.paused ? 'paused' : 'system'}
        stylePolicy={policy('region')}
        animations={model.override ? { handoff: wrapperReveal } : undefined}
        revealTargets={revealTargets}
        placeholder={
          <div className="report-placeholder">
            <div className="report-head">
              <SkeletonBlock
                id="heading-source"
                stylePolicy={policy('skeleton')}
              />
            </div>
            <div className="rich-grid">
              <div className="chart-region">
                <ChartLoader
                  id="chart-source"
                  className="chart-box"
                  variant={model.variant}
                  stylePolicy={policy('chart')}
                  animations={chartAnimations}
                  targetProvider={session?.projection.chart}
                />
              </div>
              <TableLoader
                id="table-source"
                className="table-box"
                rows={3}
                rowHeight={36}
                columns={columns}
                stylePolicy={policy('table')}
                animations={tableAnimations}
                targetProvider={session?.projection.table}
              />
            </div>
          </div>
        }
        refreshIndicator={
          <TypingDots id="refresh-source" stylePolicy={policy('typing')} />
        }
      >
        <div className="report-content">
          <div className="report-head">
            <label htmlFor="note">Retained report note</label>
            <input id="note" defaultValue="Keep my note" />
          </div>
          <div className="rich-grid">
            <figure className="chart-region">
              <svg
                id="report-chart"
                viewBox="0 0 320 150"
                preserveAspectRatio="none"
                role="img"
                aria-label="Illustrative usage trend"
              >
                {geometry.kind === 'line' ? (
                  <path
                    d={geometry.points
                      .map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`)
                      .join(' ')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  />
                ) : geometry.kind === 'bar' ? (
                  geometry.bars.map((b) => (
                    <rect key={b.x} {...b} fill="currentColor" />
                  ))
                ) : (
                  geometry.points.map((p) => (
                    <circle
                      key={p.x}
                      cx={p.x}
                      cy={p.y}
                      r={3}
                      fill="currentColor"
                    />
                  ))
                )}
              </svg>
              <figcaption>
                Illustrative usage samples: 20%, 45%, 36%, 75%, 62%, 92%.
              </figcaption>
            </figure>
            <table id="report-table">
              <caption>Illustrative project status</caption>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Status</th>
                  <th scope="col">Items</th>
                </tr>
              </thead>
              <tbody key={model.revision}>
                {reportRows.map((row, index) => (
                  <tr key={row.id} data-row-id={`report-${row.id}`}>
                    <th scope="row">
                      <span data-cell-text>
                        {rowName(index, model.mode === 'international')}
                      </span>
                    </th>
                    <td>
                      <span data-cell-text>{row.status}</span>
                    </td>
                    <td>
                      <span data-cell-text>{row.value}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Independent detail:{' '}
            <TextLoader
              id="detail-owner"
              ref={detail}
              state={model.detail}
              cycle={String(model.detailCycle)}
              motion={model.paused ? 'paused' : 'system'}
              stylePolicy={policy('text')}
              animations={textAnimations}
            >
              Report detail available
            </TextLoader>
          </p>
        </div>
      </LoadingRegion>
    </div>
  );
}
createRoot(required<HTMLElement>(document, '#app')).render(<App />);
