'use client';
import type {
  LoadingState,
  Motion,
  RevealTarget,
} from '@dotquilt-internal/core';
import { rows, tableShimmer } from '@dotquilt-internal/core/animations/table';
import type {
  TableLoader as NativeTable,
  TableInput,
} from '@dotquilt-internal/core/table';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { TableLoader } from '@dotquilt-internal/react/table';
import { useCallback, useEffect, useRef, useState } from 'react';

const animations = {
  idle: tableShimmer({ cellStyle: 'date' }),
  handoff: rows(),
};
const projects = ['Canvas', 'Grid', 'Chart', 'Table', 'Text'];
function projectTable(
  table: HTMLTableElement | null,
  placeholder: HTMLElement | null,
): TableInput | null {
  if (!table || !placeholder) return null;
  const origin = placeholder.getBoundingClientRect();
  const range = table.ownerDocument.createRange();
  return {
    kind: 'table',
    cells: Array.from(
      table.tBodies[0]?.querySelectorAll('td') ?? [],
      (cell, i) => {
        const box = cell.getBoundingClientRect();
        const text = cell.textContent ?? '';
        const node = cell.firstChild;
        return {
          bounds: {
            x: box.x - origin.x,
            y: box.y - origin.y,
            width: box.width,
            height: box.height,
          },
          text,
          baseline: box.y - origin.y + box.height * 0.7,
          rowId: `row-${Math.floor(i / 2)}`,
          rowIndex: Math.floor(i / 2),
          columnIndex: i % 2,
          kind: i % 2 ? 'number' : 'text',
          tone: 'base',
          glyphs: Array.from(text, (character, j) => {
            if (!node)
              return { character, bounds: { x: 0, y: 0, width: 0, height: 0 } };
            range.setStart(node, j);
            range.setEnd(node, j + 1);
            const b = range.getBoundingClientRect();
            return {
              character,
              bounds: {
                x: b.x - origin.x,
                y: b.y - origin.y + b.height * 0.13,
                width: b.width,
                height: b.height * 0.74,
              },
            };
          }),
        };
      },
    ),
  };
}

// Paste this file into a React client component. The default inline style policy
// needs no CSS asset setup; strict-CSP applications should use the CSP guide.
export default function Example({ motion = 'system' }: { motion?: Motion }) {
  const [state, setState] = useState<LoadingState>('ready');
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const playback = paused || motion === 'paused' ? 'paused' : 'system';
  // These controls simulate application outcomes. Replace them with your current
  // request's lifecycle, rejecting stale responses before marking it ready.
  function start(next: 'pending' | 'refreshing') {
    setCycle((value) => value + 1);
    setState(next);
  }
  const loader = useRef<NativeTable>(null);
  const table = useRef<HTMLTableElement | null>(null);
  const [targets, setTargets] = useState<readonly RevealTarget[]>([]);
  const bindTable = useCallback((element: HTMLTableElement | null) => {
    table.current = element;
    setTargets(
      element
        ? Array.from(element.tBodies[0]?.rows ?? [], (element, i) => ({
            id: `row-${i}`,
            element,
          }))
        : [],
    );
  }, []);
  const provider = useCallback(
    () => projectTable(table.current, loader.current),
    [],
  );
  return (
    <section aria-label="Copyable loading example" style={{ margin: 0 }}>
      <LoadingRegion
        state={state}
        cycle={String(cycle)}
        motion={playback}
        revealTargets={targets}
        style={{ display: 'grid', width: '100%', minHeight: 260 }}
        placeholder={
          <TableLoader
            ref={loader}
            rows={5}
            rowHeight={34}
            columns={[{ kind: 'text', width: 2 }, { kind: 'number' }]}
            targetProvider={provider}
            animations={animations}
            style={{ display: 'block', width: '100%', height: 260 }}
          />
        }
      >
        <table
          ref={bindTable}
          style={{
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            width: '100%',
            font: '14px/1.5 monospace',
          }}
        >
          <caption>Illustrative project data</caption>
          <colgroup>
            <col style={{ width: '66.6667%' }} />
            <col />
          </colgroup>
          <thead>
            <tr style={{ height: 34 }}>
              <th scope="col">Project</th>
              <th scope="col">Items</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((name, i) => (
              <tr key={name} style={{ height: 34 }}>
                <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                  {name}
                </td>
                <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                  {i * 4}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </LoadingRegion>
      <fieldset
        aria-label="Example loading controls"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          margin: '24px 0 0',
          padding: 0,
          border: 0,
          minWidth: 0,
        }}
      >
        <button
          type="button"
          style={{ minHeight: 44, padding: '8px 12px' }}
          disabled={!interactive}
          onClick={() => start('pending')}
        >
          Start loading
        </button>
        <button
          type="button"
          style={{ minHeight: 44, padding: '8px 12px' }}
          disabled={!interactive}
          onClick={() => start('refreshing')}
        >
          Refresh content
        </button>
        <button
          type="button"
          style={{ minHeight: 44, padding: '8px 12px' }}
          disabled={!interactive || state === 'ready'}
          onClick={() => setState('ready')}
        >
          Reveal content
        </button>
        <button
          type="button"
          style={{ minHeight: 44, padding: '8px 12px' }}
          disabled={!interactive}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? 'Resume example' : 'Pause example'}
        </button>
      </fieldset>
      <p role="status">
        {state === 'ready'
          ? 'Current content ready.'
          : 'Loading the current request.'}
      </p>
    </section>
  );
}
